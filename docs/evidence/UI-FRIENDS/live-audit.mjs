import assert from "node:assert/strict";
import { createApiClient } from "../../../packages/api-client/index.ts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
function client() {
  let cookie = "";
  return createApiClient({
    baseUrl: "http://127.0.0.1:3114/api/v1",
    fetch: async (url, options) => {
      const headers = new Headers(options.headers);
      if (cookie) headers.set("Cookie", cookie);
      const response = await fetch(url, { ...options, headers });
      const set = response.headers.getSetCookie();
      if (set.length) cookie = set.map((item) => item.split(";")[0]).join("; ");
      return response;
    },
  });
}
const a = client(),
  b = client();
for (const [api, profileKey] of [
  [a, "alice"],
  [b, "bob"],
])
  await api.request("postSession", {
    body: { profileKey },
    idempotencyKey: crypto.randomUUID(),
  });
const phase = process.argv[2] ?? "selected";
const recordId = "ui-friends-live-record-alice",
  mediaId = `${recordId}-media`;
const own = await a.request("getRecordsRecordId", { path: { recordId } });
const shared = await b.request("getSharedRecords", {
  query: { personIds: ["friends-live-alice"], includeUndated: true },
});
const relationships = await b.request("getFriendships", {});
let mediaStatus = 200,
  mediaSize = 0;
try {
  mediaSize = (await b.request("getMediaMediaIdContent", { path: { mediaId } }))
    .size;
} catch (e) {
  mediaStatus = e.status;
}
let detailStatus = 200;
try {
  await b.request("getRecordsRecordId", { path: { recordId } });
} catch (e) {
  detailStatus = e.status;
}
const isPrivate = phase === "private";
assert.equal(
  own.data.record.visibility,
  isPrivate ? "private" : phase === "public" ? "public" : "selected",
);
assert.equal(
  shared.items.some((item) => item.id === recordId),
  !isPrivate,
);
assert.equal(mediaStatus, isPrivate ? 404 : 200);
assert.equal(detailStatus, isPrivate ? 404 : 200);
if (!isPrivate) assert.ok(mediaSize > 0);
if (phase === "unlinked") assert.equal(relationships.items.length, 0);
const result = {
  phase,
  time: new Date().toISOString(),
  recordId,
  version: own.data.record.version,
  visibility: own.data.record.visibility,
  sharedWith: own.data.record.sharedWith,
  friendships: relationships.items.map((item) => ({
    id: item.id,
    status: item.status,
    version: item.version,
  })),
  viewerRecordCount: shared.items.length,
  viewerDetailStatus: detailStatus,
  viewerMediaStatus: mediaStatus,
  viewerMediaBytes: mediaSize,
};
const path =
  "/Users/roz/.codex/worktrees/ui-friends-14/docs/evidence/UI-FRIENDS/live-audit.json";
const previous = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
previous.push(result);
writeFileSync(path, JSON.stringify(previous, null, 2));
console.log(JSON.stringify(result));
