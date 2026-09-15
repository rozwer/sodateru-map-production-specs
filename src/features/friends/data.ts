import {
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { api } from "../../app/api";
import { ScreenStateContext } from "../../app/useScreenState";
import type { LngLat, MapFocus } from "../../app/map-bridge";
import type {
  Friendship,
  Person,
  RecordView,
} from "../../../packages/api-client";

export async function friendships(signal: AbortSignal): Promise<Friendship[]> {
  const items: Friendship[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.request("getFriendships", {
      query: { limit: 100, cursor },
      signal,
    });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items;
}
export async function directory(signal: AbortSignal) {
  const [me, relations] = await Promise.all([
    api.request("getMe", { signal }),
    friendships(signal),
  ]);
  const ids = [
    ...new Set(
      relations
        .filter((r) => r.status === "accepted")
        .map((r) =>
          r.requesterId === me.data.id ? r.recipientId : r.requesterId,
        ),
    ),
  ];
  const people = await Promise.all(
    ids.map(
      async (personId) =>
        (await api.request("getPeoplePersonId", { path: { personId }, signal }))
          .data,
    ),
  );
  return { me: me.data, relations, people };
}
export function useRead<T>(
  key: string,
  read: (signal: AbortSignal) => Promise<T>,
  enabled = true,
): { data?: T; error?: string; loading: boolean; reload: () => void } {
  const reader = useRef(read);
  reader.current = read;
  const [revision, refresh] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data?: T;
    error?: string;
    loading: boolean;
  }>({ key, loading: enabled });
  useEffect(() => {
    if (!enabled) {
      setState({ key, loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ key, loading: true });
    reader
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            error:
              error instanceof Error ? error.message : "読み込めませんでした。",
            loading: false,
          });
      });
    return () => controller.abort();
  }, [key, enabled, revision]);
  useEffect(() => {
    const focus = () => refresh((v) => v + 1);
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, []);
  return {
    ...(state.key === key && enabled ? state : { loading: enabled }),
    reload: () => refresh((v) => v + 1),
  };
}
export interface SharingDraft {
  visibility: RecordView["visibility"];
  sharedWith: string[];
  version: number;
  dirty: boolean;
  selectedPeople: Person[];
}
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export function useSharingDraft(scope: string, recordId: string) {
  const drafts = useContext(ScreenStateContext);
  if (!drafts)
    throw new Error("共有下書きは共通画面の本人scope内で使用します。");
  const key = `friends-sharing:${scope}:${recordId}`;
  const draft = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => drafts.get(key) as SharingDraft | undefined,
  );
  return {
    draft,
    update: (value: SharingDraft) => {
      drafts.set(key, value);
      emit();
    },
    clear: () => {
      drafts.delete(key);
      emit();
    },
  };
}
export function errorText(error: unknown) {
  const detail = error as { status?: number; message?: string };
  return detail.status === 409 || detail.status === 412
    ? "保存済みの内容が更新されています。最新の内容を再取得し、下書きと確認してください。"
    : (detail.message ?? "保存できませんでした。入力を保持しています。");
}

export function periodQuery(params: Record<string, string>) {
  const hasRange =
    params.from !== undefined ||
    params.to !== undefined ||
    params.timeZone !== undefined;
  if (!hasRange) return { includeUndated: params.includeUndated !== "false" };
  const from = Number(params.from),
    to = Number(params.to);
  if (
    !params.from ||
    !params.to ||
    !params.timeZone ||
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from >= to
  )
    throw new Error("期間の開始・終了・タイムゾーンを指定し直してください。");
  return {
    from,
    to,
    timeZone: params.timeZone,
    includeUndated: params.includeUndated === "true",
  };
}

export function mapFocus(coordinates: LngLat[]): MapFocus | null {
  if (!coordinates.length) return null;
  if (coordinates.length === 1) return { center: coordinates[0], zoom: 14 };
  return {
    bounds: [
      [
        Math.min(...coordinates.map((p) => p[0])),
        Math.min(...coordinates.map((p) => p[1])),
      ],
      [
        Math.max(...coordinates.map((p) => p[0])),
        Math.max(...coordinates.map((p) => p[1])),
      ],
    ],
    zoom: 15,
  };
}
