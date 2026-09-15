/** Replays archived REAL observations; common ROUTES/installation boundaries are a harness.
 * Does not claim a production Valhalla preview, fresh provider fetch, or compliant adoption.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { serve } from "@hono/node-server";
import { openDatabases } from "../../db/connection.ts";
import { seedProfiles } from "../../core/session.ts";
import { createApp } from "../../app/app.ts";
import { loadContract } from "../../core/validation.ts";
import { bikeMigration } from "./migration.ts";
import { createBikeFeature } from "./feature.ts";
import { BikeService, type RouteSnapshot, type RoutesBoundary } from "./service.ts";
import { assessCommonRoute } from "./route-evidence.ts";
import { defaultSettings, geometryHash, type Position } from "./domain.ts";

const evidenceDir = new URL("../../../docs/evidence/BIKE/", import.meta.url);
const archive = JSON.parse(readFileSync(new URL("valhalla-live.json", evidenceDir), "utf8"));
function archivedRoute(): RouteSnapshot {
  const route = archive.requests[0], trace = archive.requests[2];
  assert.equal(route.httpStatus, 200); assert.equal(trace.httpStatus, 200);
  const shape = route.body.trip.legs[0].shape;
  assert.equal(trace.body.shape, shape, "trace must match the exact route shape");
  // Valhalla polyline6, using this route's original shape (never the nearby Mapbox route).
  let i = 0, lat = 0, lon = 0;
  function delta() {
    let value = 0, shift = 0, byte: number;
    do { byte = shape.charCodeAt(i++) - 63; value |= (byte & 31) << shift; shift += 5; } while (byte >= 32);
    return value & 1 ? ~(value >> 1) : value >> 1;
  }
  const coordinates: Position[] = [];
  while (i < shape.length) { lat += delta(); lon += delta(); coordinates.push([lon/1e6, lat/1e6]); }
  const geometry = { type: "LineString" as const, coordinates };
  return {
    previewId: "archived-real-valhalla-HARNESS-not-common-preview", mode: "driving", geometry,
    retention: "storable", fetchedAt: route.fetchedAt, expiresAt: route.fetchedAt + 900000,
    segmentEvidence: {
      provider: "valhalla", profile: route.request.costing, geometryHash: geometryHash(geometry),
      routeFetchedAt: route.fetchedAt, fetchedAt: trace.fetchedAt, sourceUrl: archive.endpoint + "/trace_attributes",
      osmChangeset: String(trace.body.osm_changeset),
      options: { excludeHighways: route.request.costing_options.motorcycle.exclude_highways,
        useHighways: route.request.costing_options.motorcycle.use_highways, topSpeed: null,
        departureLocal: route.request.date_time.value },
      warnings: [...route.body.trip.warnings, ...trace.body.warnings],
      edges: trace.body.edges.map((e: any) => ({ wayId: e.way_id ?? null, forward: e.forward ?? null,
        beginShapeIndex: e.begin_shape_index, endShapeIndex: e.end_shape_index,
        roadClass: e.road_class ?? null, use: e.use ?? null, motorroad: null })),
    },
  };
}
const [stage, directory] = process.argv.slice(2);
if (!stage) {
  const checkedAt = Date.now(), dir = mkdtempSync(join(tmpdir(), "bike-real-segments-"));
  try {
    const outputs = ["write", "read"].map(step => {
      const result = spawnSync(process.execPath, ["--experimental-transform-types", fileURLToPath(import.meta.url), step, dir], { encoding: "utf8", timeout: 60000, maxBuffer: 4e6 });
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(result.stdout);
    });
    assert.notEqual(outputs[0].pid, outputs[1].pid);
    assert.deepEqual(outputs[0].snapshot, outputs[1].snapshot);
    const result = { checkedAt,
      scope: "Archived real Valhalla responses replayed through BikeService and actual SQLite; separate OS processes retrieve through CORE HTTP. ROUTES preview and installation are harness boundaries, not production integration. No new provider request.",
      replayClock: archive.requests[2].fetchedAt + 1,
      observedRouteFetchedAt: archive.requests[0].fetchedAt,
      checks: { separateProcesses: true, exactSnapshotEqual: true, httpReadStatus: outputs[1].httpStatus,
        differentOwner404: outputs[1].differentOwner404, adoptionRejected: outputs[0].adoptionRejected,
        sourceGeometrySettingsWarningsEdgesPreserved: true },
      snapshot: outputs[0].snapshot,
      remaining: ["Production Valhalla ROUTES boundary/provider contract", "Japanese auto-only-road classification, vehicle displacement/power and time restrictions", "Live compliant route adoption"],
    };
    writeFileSync(new URL("segment-snapshot.json", evidenceDir), JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify({ checks: result.checks, coverage: result.snapshot.resultEvaluation.coverage,
      requestedExclusion: result.snapshot.resultEvaluation.requestedExclusion.status,
      motorway: result.snapshot.resultEvaluation.motorwayAssessment.status,
      highway: result.snapshot.highwayAssessment.status, vehicle: result.snapshot.vehicleAssessment.status }));
  } finally { rmSync(dir, { recursive: true, force: true }); }
} else {
  assert(directory && ["write", "read"].includes(stage));
  const dbs = openDatabases({ livePath: join(directory, "live.sqlite"), demoPath: join(directory, "demo.sqlite"), migrations: [bikeMigration] });
  const profile = { key: "evidence", id: "00000000-0000-4000-8000-000000000029", name: "BIKE historical replay harness" };
  const identity = { version: 1 as const, secret: "local-evidence-harness-only", profiles: [profile] };
  seedProfiles(dbs, identity.profiles);
  const context = { personId: profile.id, dataMode: "live" as const, requestId: randomUUID(), signal: new AbortController().signal };
  const route = archivedRoute();
  const boundary: RoutesBoundary = {
    revalidatePreview: () => structuredClone(route), assess: assessCommonRoute,
    saveRoute: () => { throw Error("Unverified vehicle MUST NOT reach common save"); },
    getSavedRoute: () => { throw Error("No compliant adoption"); },
  };
  const observations = JSON.parse(readFileSync(new URL("live-overpass.json", evidenceDir), "utf8"));
  const service = new BikeService(dbs.live,
    () => ({ installId: "historical-replay-harness", version: 1, enabled: true, visible: true, settings: defaultSettings }),
    boundary, { async search() { return { source: observations.source, places: observations.places, roads: observations.roadExamples }; } });
  let resultId: string, adoptionRejected = false;
  if (stage === "write") {
    // Exercise original validity window explicitly; never re-date source timestamps to today.
    const realNow = Date.now; Date.now = () => archive.requests[2].fetchedAt + 1;
    try {
      const search = await service.search(context);
      const snapshot = service.assessRoute(context, { previewId: route.previewId, searchId: search.id });
      assert.equal(snapshot.resultEvaluation?.coverage.edgeCount, 52);
      assert.equal(snapshot.resultEvaluation?.coverage.coveredSegmentCount, 79);
      assert.equal(snapshot.resultEvaluation?.motorwayAssessment.status, "verified");
      assert.equal(snapshot.resultEvaluation?.requestedExclusion.status, "ignored");
      assert.equal(snapshot.highwayAssessment.status, "unknown");
      assert.equal(snapshot.vehicleAssessment.status, "unknown");
      assert.equal(snapshot.adoptable, false);
      assert.throws(() => service.adopt(context, { id: randomUUID(), assessmentId: snapshot.id, title: "must reject" }), { code: "STATE_CONFLICT" });
      adoptionRejected = true; resultId = snapshot.id;
      writeFileSync(join(directory, "result-id"), resultId);
    } finally { Date.now = realNow; }
  } else resultId = readFileSync(join(directory, "result-id"), "utf8");
  assert.throws(() => service.get({ ...context, personId: randomUUID() }, resultId), { code: "NOT_FOUND" });
  const contract = loadContract();
  const fragment = JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/fragments/BIKE.json", import.meta.url), "utf8"));
  Object.assign((contract.components as any).schemas, fragment.schemas);
  for (const operation of fragment.operations) { const { method, path, ...rest } = operation; (contract.paths[path] ??= {})[method.toLowerCase()] = rest; }
  const app = createApp({ databases: dbs, identity, features: [createBikeFeature(() => service)], contract });
  let server: ReturnType<typeof serve> | undefined, origin = "";
  try {
    await new Promise<void>(resolve => { server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 }, info => { origin = `http://127.0.0.1:${info.port}/api/v1`; resolve(); }); });
    const session = await fetch(origin + "/session", { method: "POST", headers: { "Content-Type": "application/json", "X-Data-Mode": "live", "X-Request-Id": randomUUID(), "Idempotency-Key": randomUUID() }, body: JSON.stringify({ profileKey: profile.key }) });
    assert.equal(session.status, 201);
    const cookie = session.headers.get("set-cookie")!.split(";")[0]!;
    const read = await fetch(origin + `/bike/results/${resultId}`, { headers: { Cookie: cookie, "X-Data-Mode": "live", "X-Request-Id": randomUUID() } });
    const body = await read.json() as any; assert.equal(read.status, 200, JSON.stringify(body));
    console.log(JSON.stringify({ pid: process.pid, httpStatus: read.status, snapshot: body.data, adoptionRejected, differentOwner404: true }));
  } finally { if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve())); dbs.close(); }
}
