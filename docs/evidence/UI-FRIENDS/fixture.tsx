/** UI-only response fixture. Never imported by the product entry point. */
import { createRoot } from "react-dom/client";
import { App } from "../../../src/app/App";
import type {
  CommonInfoRecordView,
  RecordView,
  Person,
  Friendship,
  SavedRoute,
  Media,
  Message,
  MessageSend,
  MessageResult,
  Insight,
} from "../../../packages/api-client";

if (new URLSearchParams(location.search).get("fontScale") === "2")
  document.documentElement.style.fontSize = "32px";
const stamp = 1789444800000;
const people: Person[] = ["わたし", "はるか", "こうた", "みなみ", "りく"].map(
  (name, i) => ({
    id: `fixture-person-${i}`,
    version: 1,
    createdAt: stamp,
    updatedAt: stamp,
    name,
    bio: [
      "日々の体験を地図に記録しています。",
      "カフェでゆっくりしたり、本を読んだり。まちを歩いて季節を感じるのが好きです。",
      "音楽・建築・まち歩き",
      "自然・カフェ・旅行",
      "映画・アート・カメラ",
    ][i],
    avatarUrl: null,
  }),
);
const coffee =
  "https://images.unsplash.com/photo-1660144102328-68974117f580?fm=jpg&q=60&w=600";
const park =
  "https://images.unsplash.com/photo-1692026093592-871bfac97e27?auto=format&fit=crop&fm=jpg&q=60&w=600";
const places = [
  {
    id: "fixture-place-0",
    name: "コーヒーと本のある暮らし",
    address: "名古屋市千種区 本山",
    coordinates: [136.9658, 35.1688] as [number, number],
  },
  {
    id: "fixture-place-1",
    name: "東山公園",
    address: "名古屋市千種区 東山",
    coordinates: [136.9782, 35.1604] as [number, number],
  },
];
const initial: RecordView[] = Array.from({ length: 4 }, (_, i) => ({
  id: `fixture-record-${i}`,
  version: 1,
  createdAt: stamp,
  updatedAt: stamp,
  personId: people[i < 2 ? 0 : 1].id,
  kind: "experience",
  visitId: null,
  placeId: places[i % 2].id,
  occurredAt: stamp,
  endedAt: null,
  timePrecision: "exact",
  body:
    i % 2
      ? "新緑がきれいで、気持ちよく歩けました。"
      : "窓から緑が見える席で、ゆっくり本を読みました。",
  purposes: i % 2 ? ["散歩"] : ["カフェ", "本"],
  activities: [],
  impression: "",
  periodAnswers: {},
  bookmarked: false,
  useForSuggestions: false,
  topicKey: null,
  visibility: "public",
  sharedWith: [],
  effectivePlaceId: places[i % 2].id,
  effectiveStartedAt: stamp,
  effectiveEndedAt: null,
  effectiveTimePrecision: "exact",
}));
const storageKey = "ui-friends-explicit-fixture-v1";
const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as {
  records: RecordView[];
  relations: Friendship[];
} | null;
let records = stored?.records ?? initial;
let relations: Friendship[] =
  stored?.relations ??
  people.slice(1).map((person, i) => ({
    id: `fixture-friend-${i}`,
    version: 1,
    requesterId: people[0].id,
    recipientId: person.id,
    status: "accepted",
    createdAt: stamp,
    updatedAt: stamp,
  }));
let person =
  people[Number(new URLSearchParams(location.search).get("person") ?? 0)] ??
  people[0];
const persist = () =>
  sessionStorage.setItem(storageKey, JSON.stringify({ records, relations }));
const media = (record: RecordView): Media[] => [
  {
    id: `fixture-media-${record.id}`,
    recordId: record.id,
    version: 1,
    createdAt: stamp,
    updatedAt: stamp,
    kind: "photo",
    mimeType: "image/jpeg",
    byteSize: 5000,
    position: 0,
    status: "ready",
    contentUrl: record.placeId === places[0].id ? coffee : park,
  },
];
const sharedView = (record: RecordView): CommonInfoRecordView => ({
  id: record.id,
  person: {
    id: record.personId,
    displayName: people.find((p) => p.id === record.personId)!.name,
    iconPath: null,
  },
  kind: record.kind,
  body: record.body,
  place: places.find((p) => p.id === record.placeId) ?? null,
  effectiveAt: record.effectiveStartedAt,
  endedAt: record.endedAt,
  timePrecision: record.timePrecision,
  visitStatus: null,
  purposes: record.purposes,
  impression: record.impression,
  topicKey: null,
  visibility: record.visibility,
  version: record.version,
  sourceRefs: [{ type: "record", id: record.id, version: record.version }],
  media: media(record),
});
const route: SavedRoute = {
  id: "fixture-route-0",
  personId: people[1].id,
  title: "本とカフェと緑をめぐるコース",
  waypoints: places.map((p) => ({
    coordinates: p.coordinates,
    name: p.name,
    placeId: p.id,
  })),
  mode: "walking",
  legs: [
    {
      fromIndex: 0,
      toIndex: 1,
      geometry: {
        type: "LineString",
        coordinates: places.map((p) => p.coordinates),
      },
      distanceM: 1800,
      durationSec: 1200,
    },
  ],
  geometry: {
    type: "LineString",
    coordinates: places.map((p) => p.coordinates),
  },
  distanceM: 1800,
  durationSec: 1200,
  provider: "mapbox-directions",
  sourceUrl: null,
  fetchedAt: stamp,
  status: "saved",
  currentLeg: 0,
  visibility: "public",
  sharedWith: [],
  version: 1,
  createdAt: stamp,
  updatedAt: stamp,
};
let comparison: {
  conversationId: string;
  input: Extract<MessageSend, { use: "comparison" }>;
} | null = null;
const comparisonMessage = (role: "user" | "assistant"): Message => ({
  id:
    role === "user"
      ? comparison!.input.userMessageId
      : comparison!.input.assistantMessageId,
  version: 1,
  createdAt: stamp,
  updatedAt: stamp,
  conversationId: comparison!.conversationId,
  position: role === "user" ? 0 : 1,
  role,
  body:
    role === "user"
      ? comparison!.input.body
      : "用途と理由を比較しました。これはテスト応答です。",
  status: "complete",
  attempt: 1,
  model: "explicit-ui-fixture",
  errorCode: null,
  insightId: role === "assistant" ? "fixture-insight" : null,
  sourceRefs: comparison!.input.expectedRefs,
});
const nativeFetch = window.fetch.bind(window);
const log: string[] = [];
window.fetch = async (input, init) => {
  const url = new URL(String(input), location.href);
  if (!url.pathname.startsWith("/api/v1/")) return nativeFetch(input, init);
  const path = url.pathname.slice("/api/v1".length),
    method = init?.method ?? "GET",
    body = init?.body ? JSON.parse(String(init.body)) : null;
  const respond = (value: unknown, status = 200) => {
    log.push(
      `${method} ${path}${url.search} → ${status}${body ? " " + JSON.stringify(body) : ""}`,
    );
    document.querySelector("#fixture-network")!.textContent = log.join("\n");
    return new Response(status === 204 ? null : JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
  const fail = (status = 404) =>
    respond(
      {
        error: {
          code: "FIXTURE_ERROR",
          message: "テスト応答：対象を取得できません。",
          requestId: "fixture-request",
        },
      },
      status,
    );
  if (
    new URLSearchParams(location.search).get("failure") === "read" &&
    method === "GET"
  )
    return fail(503);
  if (
    new URLSearchParams(location.search).get("failure") === "save" &&
    method !== "GET"
  )
    return fail(503);
  if (path.startsWith("/media/") && path.endsWith("/content")) {
    const mediaId = path.split("/")[2];
    const record = records.find((r) => media(r).some((m) => m.id === mediaId));
    if (
      !record ||
      !(
        record.personId === person.id ||
        record.visibility === "public" ||
        (record.visibility === "selected" &&
          record.sharedWith.includes(person.id))
      )
    )
      return fail();
    const response = await nativeFetch(
      media(record).find((m) => m.id === mediaId)!.contentUrl!,
      { signal: init?.signal },
    );
    log.push(`${method} ${path} → ${response.status} (テスト写真)`);
    document.querySelector("#fixture-network")!.textContent = log.join("\n");
    return response;
  }
  if (path === "/me") return respond({ data: person });
  if (path === "/people")
    return respond({
      items: people.filter(
        (p) =>
          p.name.includes(url.searchParams.get("q") ?? "") &&
          p.id !== person.id,
      ),
      nextCursor: null,
    });
  if (path.startsWith("/people/")) {
    const item = people.find((p) => p.id === path.split("/")[2]);
    return item ? respond({ data: item }) : fail();
  }
  if (path === "/friendships" && method === "GET")
    return respond({
      items: relations.filter(
        (r) => r.requesterId === person.id || r.recipientId === person.id,
      ),
      nextCursor: null,
    });
  if (path === "/friendships" && method === "POST") {
    const item: Friendship = {
      ...body,
      requesterId: person.id,
      status: "pending",
      version: 1,
      createdAt: stamp,
      updatedAt: stamp,
    };
    relations.push(item);
    persist();
    return respond({ data: item }, 201);
  }
  if (path.startsWith("/friendships/")) {
    const item = relations.find((r) => r.id === path.split("/")[2]);
    if (!item) return fail();
    if (method === "DELETE") {
      relations = relations.filter((r) => r.id !== item.id);
      persist();
      return respond(null, 204);
    }
    if (method === "PATCH") {
      item.status = "accepted";
      item.version++;
      persist();
    }
    return respond({ data: item });
  }
  if (path === "/conversations" && method === "POST")
    return respond(
      {
        data: {
          ...body,
          personId: person.id,
          version: 1,
          createdAt: stamp,
          updatedAt: stamp,
        },
      },
      201,
    );
  if (
    path.startsWith("/conversations/") &&
    path.endsWith("/messages") &&
    method === "POST"
  ) {
    comparison = { conversationId: path.split("/")[2], input: body };
    return respond(
      {
        data: {
          userMessage: comparisonMessage("user"),
          assistantMessage: comparisonMessage("assistant"),
          statusUrl: `/api/v1/messages/${body.assistantMessageId}`,
        },
      },
      202,
    );
  }
  if (path.startsWith("/messages/") && comparison) {
    const mappings = comparison.input.context.fromRecordIds
      .slice(0, 2)
      .map((id, i) => ({
        fromRecordId: id,
        toRecordId:
          comparison!.input.context.toRecordIds[i] ??
          comparison!.input.context.toRecordIds[0],
        relation: "different-place-same-role" as const,
        explanation: i
          ? "ふたりとも緑のある場所で気持ちよく歩いています。テスト応答です。"
          : "本を読む時間を、落ち着いて過ごすために使っています。テスト応答です。",
        evidenceIds: [
          id,
          comparison!.input.context.toRecordIds[i] ??
            comparison!.input.context.toRecordIds[0],
        ],
        rejected: false as const,
      }));
    const result: MessageResult = {
      message: comparisonMessage("assistant"),
      run: {
        id: "fixture-run",
        conversationId: comparison.conversationId,
        userMessageId: comparison.input.userMessageId,
        status: "complete",
        attempt: 1,
        version: 1,
        model: "explicit-ui-fixture",
        promptVersion: "fixture",
        error: null,
        sourceRefs: comparison.input.expectedRefs,
        insightId: "fixture-insight",
        createdAt: stamp,
        updatedAt: stamp,
        task: "compare",
        result: { mappings },
      },
      output: { use: "comparison", value: { mappings } },
    };
    return respond({ data: result });
  }
  if (path === "/insights/fixture-insight" && comparison) {
    const result: Insight = {
      id: "fixture-insight",
      version: 1,
      createdAt: stamp,
      updatedAt: stamp,
      personId: person.id,
      kind: "comparison",
      inputKey: "explicit-ui-fixture",
      sourceRefs: comparison.input.expectedRefs,
      rangeStart: null,
      rangeEnd: null,
      timeZone: "Asia/Tokyo",
      generatorVersion: "fixture",
      model: "explicit-ui-fixture",
      summary: "ふたりの体験のテスト比較です。",
      result: {
        common: ["本や緑のある場所で、ゆっくり過ごしています。"],
        differences: [
          "場所の選び方の違いは、現在の記録だけでは判断できません。",
        ],
        unknown: ["記録した日の同行者や気分はわかりません。"],
      },
      review: null,
      reviewNote: null,
      reviewedAt: null,
    };
    return respond({ data: result });
  }
  if (path === "/records")
    return respond({
      items: records.filter((r) => r.personId === person.id),
      nextCursor: null,
    });
  if (path.startsWith("/records/")) {
    const item = records.find((r) => r.id === path.split("/")[2]);
    if (!item || item.personId !== person.id) return fail();
    if (method === "PATCH") {
      if (new Headers(init?.headers).get("If-Match") !== `"${item.version}"`)
        return fail(412);
      Object.assign(item, body, { version: item.version + 1 });
      persist();
      return respond({ data: item });
    }
    return respond({
      data: {
        record: item,
        media: {
          status: "ready",
          data: { items: media(item), nextCursor: null },
        },
      },
    });
  }
  if (path.startsWith("/shared-records")) {
    const ids = url.searchParams.getAll("personIds");
    const visible = records
      .filter(
        (r) =>
          r.personId === person.id ||
          r.visibility === "public" ||
          (r.visibility === "selected" && r.sharedWith.includes(person.id)),
      )
      .filter((r) => !ids.length || ids.includes(r.personId))
      .filter(
        (r) =>
          url.searchParams.get("audience") !== "own" ||
          r.personId === person.id,
      );
    const items =
      new URLSearchParams(location.search).get("empty") === "1" ? [] : visible;
    if (path.endsWith("/map"))
      return respond({
        data: {
          items: items.map((r) => ({
            recordId: r.id,
            personId: r.personId,
            placeId: r.placeId,
            coordinates: places.find((p) => p.id === r.placeId)!.coordinates,
            mediaId: `fixture-media-${r.id}`,
          })),
          totalCount: items.length,
        },
      });
    return respond({
      items: items
        .slice(
          Number(url.searchParams.get("cursor") ?? 0),
          Number(url.searchParams.get("cursor") ?? 0) +
            Number(url.searchParams.get("limit") ?? 20),
        )
        .map(sharedView),
      nextCursor: null,
      totalCount: items.length,
    });
  }
  if (path === "/shared-routes")
    return respond({ items: [route], nextCursor: null });
  if (path === `/saved-routes/${route.id}`) return respond({ data: route });
  return fail();
};
const banner = document.createElement("div");
banner.style.cssText =
  "position:fixed;right:4px;top:4px;z-index:1000;background:#fff1cc;color:#4c3f17;font:11px sans-serif;padding:4px;max-width:190px";
banner.textContent = "UIテスト応答 · 実API/DB未接続";
document.body.append(banner);
const details = document.createElement("details");
details.style.cssText =
  "position:fixed;right:4px;bottom:4px;z-index:1000;max-width:300px;background:white;color:#173b44;font:10px monospace;max-height:200px;overflow:auto";
details.innerHTML =
  '<summary>テスト通信記録</summary><pre id="fixture-network"></pre>';
document.body.append(details);
const { screens } = await import("../../../src/features/friends/screens");
createRoot(document.getElementById("root")!).render(
  <App
    screens={screens}
    scopeKey={`${person.id}:fixture`}
    dataMode="demo"
    profile={person}
  />,
);
