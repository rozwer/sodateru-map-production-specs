import { api } from "../../app/api";
import {
  ApiError,
  type Media,
  type RecordView,
  type RecordCreate,
} from "../../../packages/api-client";
import type { RecordCardData, Notice } from "./views";
export const deviceTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;
export const today = (timeZone = deviceTimeZone()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function errorNotice(error: unknown, retry?: () => void): Notice {
  const status = error instanceof ApiError ? error.status : 0;
  return {
    error: true,
    text:
      status === 412 || status === 409
        ? "保存内容が更新されています。入力は残っています。最新の内容を読み直して確認してください。"
        : error instanceof Error
          ? error.message
          : "読み込みに失敗しました。入力は残っています。",
    retry,
  };
}
export function newDiary(id: string, body: string, occurredAt: number) {
  return {
    id,
    kind: "diary",
    body,
    occurredAt,
    endedAt: null,
    timePrecision: "approximate",
    visitId: null,
    placeId: null,
    purposes: [],
    activities: [],
    impression: "",
    periodAnswers: {},
    bookmarked: false,
    useForSuggestions: true,
    topicKey: null,
    visibility: "private",
    sharedWith: [],
  } satisfies RecordCreate;
}
export async function recordCard(
  record: RecordView,
  timeZone: string,
  signal?: AbortSignal,
): Promise<RecordCardData> {
  const [place, media] = await Promise.allSettled([
    record.effectivePlaceId
      ? api.request("getPlacesPlaceId", {
          path: { placeId: record.effectivePlaceId },
          signal,
        })
      : Promise.resolve(null),
    api.request("getRecordsRecordIdMedia", {
      path: { recordId: record.id },
      query: { limit: 100 },
      signal,
    }),
  ]);
  const at = record.effectiveStartedAt;
  return {
    id: record.id,
    title:
      record.body.split("\n")[0]?.slice(0, 60) ||
      record.purposes[0] ||
      { diary: "日記", memo: "メモ", experience: "体験" }[record.kind],
    body: record.body,
    when:
      at === null
        ? "日時未設定"
        : new Intl.DateTimeFormat("ja-JP", {
            timeZone,
            month: "long",
            day: "numeric",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(at),
    place:
      place.status === "fulfilled"
        ? place.value?.data.place.name || "場所未設定"
        : "場所を取得できません",
    photoUrl:
      media.status === "fulfilled"
        ? media.value.items.find(
            (m) => m.kind === "photo" && m.status === "ready" && m.contentUrl,
          )?.contentUrl || undefined
        : undefined,
    purposes: record.purposes,
    impression: record.impression,
  };
}
export async function allRecordMedia(
  recordId: string,
  signal?: AbortSignal,
): Promise<Media[]> {
  const result: Media[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.request("getRecordsRecordIdMedia", {
      path: { recordId },
      query: { limit: 100, cursor },
      signal,
    });
    result.push(...page.items);
    cursor = page.nextCursor || undefined;
  } while (cursor);
  return result;
}

export async function allRecords(
  signal?: AbortSignal,
  kind?: "experience" | "diary" | "memo",
): Promise<RecordView[]> {
  const items: RecordView[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.request("getRecords", {
      query: { kind, limit: 100, cursor },
      signal,
    });
    items.push(...page.items);
    cursor = page.nextCursor || undefined;
  } while (cursor);
  return items;
}
export async function readRecordCard(
  id: string,
  timeZone: string,
  signal?: AbortSignal,
): Promise<RecordCardData> {
  try {
    const record = (
      await api.request("getRecordsRecordId", {
        path: { recordId: id },
        signal,
      })
    ).data.record;
    return await recordCard(record, timeZone, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return {
      id,
      title: "元の記録を表示できません",
      body: "",
      when: "",
      place: "",
      unavailable: "元の記録が削除されたか、現在は表示できません。",
    };
  }
}
