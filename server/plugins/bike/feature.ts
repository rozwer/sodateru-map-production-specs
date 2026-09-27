import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { CoreEnv } from "../../core/context.ts";
import { defineFeature } from "../../core/features.ts";
import { CommonError } from "../../core/errors.ts";
import { idempotentMutation, type StoredResult } from "../../core/idempotency.ts";
import { bikeMigration } from "./migration.ts";
import type { BikeService, PlaceCandidates, BikeRouteInput, BikeRoutePreview } from "./service.ts";

type PreviewJob = { state: "pending" | "complete" | "failed"; expiresAt: number; data?: BikeRoutePreview; error?: unknown };
const previewJobs = new WeakMap<DatabaseSync, Map<string, PreviewJob>>();
const active = new WeakMap<DatabaseSync, Set<string>>();
function response(c: Context<CoreEnv>, result: StoredResult) {
  return c.body(JSON.stringify(result.body), result.status as ContentfulStatusCode, { "Content-Type": "application/json" });
}
export function createBikeFeature(serviceFor: (db: DatabaseSync) => BikeService) {
  return defineFeature({ id: "BIKE", migrations: [bikeMigration], register(api) {
    api.get("/bike/state", c => c.json({ data: serviceFor(c.get("db")).state(c.get("context")) }));
    api.get("/bike/results/:resultId", c => c.json({ data: serviceFor(c.get("db")).get(c.get("context"), c.req.param("resultId")) }));
    api.post("/bike/searches", async c => {
      const db = c.get("db"), context = c.get("context"), service = serviceFor(db);
      let created = false;
      const accepted = idempotentMutation(db, { context, operation: "POST /api/v1/bike/searches", key: c.req.header("Idempotency-Key")!, input: c.get("input").body }, {
        execute() {
          const id = randomUUID(); created = true;
          db.prepare("INSERT INTO bike_search_jobs(id,person_id,data_mode,state,created_at) VALUES (?,?,?,?,?)").run(id, context.personId, context.dataMode, "pending", Date.now());
          return { status: 202, resource: { type: "bike-search", id } };
        }, replay: result => result,
      });
      const id = accepted.resource!.id;
      const job = db.prepare("SELECT * FROM bike_search_jobs WHERE id=? AND person_id=? AND data_mode=?").get(id, context.personId, context.dataMode) as { state: string; result_id: string | null; error_json: string | null } | undefined;
      if (!job) throw new CommonError("NOT_FOUND", "検索の受付がありません。");
      if (job.state === "complete") return c.json({ data: service.get(context, job.result_id!) });
      if (job.state === "failed") {
        const e = JSON.parse(job.error_json!); throw new CommonError(e.code, e.message, e.retryable, e.details);
      }
      if (!active.has(db)) active.set(db, new Set());
      const running = active.get(db)!;
      if (!created) {
        if (running.has(id)) throw new CommonError("BUSY", "同じ検索を処理中です。", true);
        const error = { code: "STATE_CONFLICT", message: "検索処理が中断されました。新しい操作IDで再検索してください。", retryable: true, details: {} };
        db.prepare("UPDATE bike_search_jobs SET state=?,error_json=? WHERE id=? AND state=?").run("failed", JSON.stringify(error), id, "pending");
        throw new CommonError(error.code, error.message, true);
      }
      running.add(id);
      try {
        const data = await service.search(context, result => {
          db.prepare("UPDATE bike_search_jobs SET state=?,result_id=? WHERE id=? AND state=?").run("complete", result.id, id, "pending");
        });
        return c.json({ data }, 201);
      } catch (error) {
        const e = error instanceof CommonError ? error : new CommonError("UPSTREAM_FAILED", "検索が中断されました。新しい操作IDで再検索してください。", true);
        db.prepare("UPDATE bike_search_jobs SET state=?,error_json=? WHERE id=? AND state=?").run("failed", JSON.stringify({ code: e.code, message: e.message, retryable: e.retryable, details: e.details }), id, "pending");
        throw e;
      } finally { running.delete(id); }
    });
    api.post("/bike/route-previews", async c => {
      const db = c.get("db"), context = c.get("context"), service = serviceFor(db), input = c.get("input").body as BikeRouteInput;
      if (!previewJobs.has(db)) previewJobs.set(db, new Map());
      const jobs = previewJobs.get(db)!;
      for (const [id, job] of jobs) if (job.expiresAt <= Date.now()) jobs.delete(id);
      let created = false;
      const accepted = idempotentMutation(db, { context, operation: "POST /api/v1/bike/route-previews", key: c.req.header("Idempotency-Key")!, input }, {
        execute() { const id = randomUUID(), expiresAt = Date.now() + 900000; created = true; jobs.set(id, { state: "pending", expiresAt }); return { status: 202, resource: { type: "bike-route-preview", id }, expiresAt }; }, replay: result => result,
      });
      const job = jobs.get(accepted.resource!.id);
      if (!job) throw new CommonError("RESULT_EXPIRED", "二輪経路の一時結果がありません。新しい操作IDで検索してください。");
      if (!created && job.state === "pending") throw new CommonError("BUSY", "同じ二輪経路を検索中です。", true);
      if (created) { try { job.data = await service.previewRoute(context, input); job.expiresAt = Math.min(job.expiresAt, job.data.expiresAt); job.state = "complete"; } catch (error) { job.state = "failed"; job.error = error; } }
      if (job.state === "failed") throw job.error;
      return c.json({ data: service.replayRoutePreview(context, job.data!) });
    });
    api.post("/bike/place-candidates", c => {
      const db = c.get("db"), context = c.get("context"), service = serviceFor(db), input = c.get("input").body as { searchId: string };
      return response(c, idempotentMutation(db, { context, operation: "POST /api/v1/bike/place-candidates", key: c.req.header("Idempotency-Key")!, input }, {
        execute() { const data = service.placeCandidates(context, input.searchId); return { status: 201, body: { data }, expiresAt: data.candidates.expiresAt }; },
        replay(result) { const data = (result.body as { data: PlaceCandidates }).data; return { status: 200, body: { data: service.replayPlaceCandidates(context, data) }, expiresAt: data.candidates.expiresAt }; },
      }));
    });
    api.post("/bike/route-assessments", c => {
      const db = c.get("db"), context = c.get("context"), service = serviceFor(db), input = c.get("input").body as { previewId: string; searchId: string };
      return response(c, idempotentMutation(db, { context, operation: "POST /api/v1/bike/route-assessments", key: c.req.header("Idempotency-Key")!, input }, {
        execute() { const data = service.assessRoute(context, input); return { status: 201, body: { data }, resource: { type: "bike-result", id: data.id } }; },
        replay(result) { return { status: 200, body: { data: service.get(context, result.resource!.id) } }; },
      }));
    });
    api.post("/bike/adoptions", c => {
      const db = c.get("db"), context = c.get("context"), service = serviceFor(db), input = c.get("input").body as { id: string; assessmentId: string; title: string };
      return response(c, idempotentMutation(db, { context, operation: "POST /api/v1/bike/adoptions", key: c.req.header("Idempotency-Key")!, input }, {
        execute() { const data = service.adopt(context, input); return { status: 201, body: { data }, resource: { type: "bike-result", id: data.id } }; },
        replay(result) { return { status: 200, body: { data: service.replayAdoption(context, result.resource!.id) } }; },
      }));
    });
  } });
}
