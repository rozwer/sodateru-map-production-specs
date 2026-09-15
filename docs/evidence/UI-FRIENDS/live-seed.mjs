import { createApiClient } from "../../../packages/api-client/index.ts";
import { writeFileSync } from "node:fs";
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
const actors = [];
for (const [key, name] of [
  ["alice", "あかり"],
  ["bob", "ひなた"],
]) {
  const api = client();
  await api.request("postSession", {
    body: { profileKey: key },
    idempotencyKey: crypto.randomUUID(),
  });
  const person = (await api.request("getMe", {})).data;
  const settings = (await api.request("getMeSettings", {})).data;
  await api.request("patchMeSettings", {
    body: { profileVisibility: "public" },
    version: settings.version,
  });
  const placeId = `ui-friends-live-place-${key}`,
    recordId = `ui-friends-live-record-${key}`;
  await api.request("postPlaces", {
    body: {
      id: placeId,
      mode: "manual",
      name: `共有確認の公園・${name}`,
      position: {
        longitude: key === "alice" ? 136.966 : 136.976,
        latitude: 35.16,
      },
      address: "名古屋市・手入力の検証地点",
      buildingKey: null,
    },
    idempotencyKey: placeId,
  });
  await api.request("postRecords", {
    body: {
      id: recordId,
      kind: "experience",
      visitId: null,
      placeId,
      occurredAt: 1789441200000,
      endedAt: null,
      timePrecision: "exact",
      body: `${name}の検証記録。木陰のベンチで本を読みました。`,
      purposes: ["休憩"],
      activities: [],
      impression: "静かな場所でした。",
      periodAnswers: {},
      bookmarked: false,
      useForSuggestions: true,
      topicKey: "rest",
      visibility: key === "alice" ? "private" : "public",
      sharedWith: [],
    },
    idempotencyKey: recordId,
  });
  const own = await api.request("getRecordsRecordId", { path: { recordId } });
  if (!own.data.media.data?.items.length) {
    const form = new FormData();
    form.set("id", `${recordId}-media`);
    form.set("position", "0");
    form.set(
      "file",
      new Blob(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
            "base64",
          ),
        ],
        { type: "image/png" },
      ),
      "explicit-test-pixel.png",
    );
    await api.request("postRecordsRecordIdMedia", {
      path: { recordId },
      body: form,
      version: own.data.record.version,
      idempotencyKey: `${recordId}-media`,
    });
  }
  actors.push({ key, personId: person.id, recordId, placeId });
}
writeFileSync(
  "/Users/roz/.codex/worktrees/ui-friends-14/docs/evidence/UI-FRIENDS/live-seed.json",
  JSON.stringify(
    {
      kind: "actual API test data",
      actors,
      media: "explicit one-pixel PNG test attachment; no real photograph claim",
    },
    null,
    2,
  ),
);
console.log(
  "Seeded actual API profiles, public discovery, places, records and media.",
);
