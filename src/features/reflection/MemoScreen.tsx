import React, { useEffect, useRef, useState } from "react";
import type { ScreenProps } from "../../app/contracts";
import { useScreenState } from "../../app/useScreenState";
import { api } from "../../app/api";
import type {
  RecordView,
  RecordCreate,
  MemoOrigin,
  MemoPresentation,
} from "../../../packages/api-client";
import { MemoView, type MemoForm, type Notice } from "./views";
import { allRecords, errorNotice } from "./records";
interface OriginOption {
  id: string;
  label: string;
  ref: MemoOrigin;
}
interface MemoState {
  id: string;
  form: MemoForm;
  record?: RecordView;
  edited: boolean;
  keyword: string;
  options: OriginOption[];
  loaded: boolean;
  createKey: string;
  pendingCreate?: RecordCreate;
}
const blank: MemoForm = {
  name: "",
  body: "",
  origins: [],
  keywords: [],
  useForSuggestions: true,
};
const key = (ref: MemoOrigin) => `${ref.type}:${ref.id}`;
export function MemoScreen({
  route,
  back,
  navigate,
  scopeKey,
  active = true,
}: ScreenProps) {
  const [state, setState] = useScreenState<MemoState>(() => ({
    id: route.params.recordId || crypto.randomUUID(),
    form: { ...blank },
    edited: false,
    keyword: "",
    options: [],
    loaded: false,
    createKey: crypto.randomUUID(),
  }));
  const [notice, setNotice] = useState<Notice>();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const control = useRef(new AbortController());
  useEffect(() => {
    if (!active) return;
    const c = new AbortController();
    control.current = c;
    setBusy(true);
    setNotice(undefined);
    void (async () => {
      try {
        const record = route.params.recordId
          ? (
              await api.request("getRecordsRecordId", {
                path: { recordId: route.params.recordId },
                signal: c.signal,
              })
            ).data.record
          : undefined;
        if (record && record.kind !== "memo")
          throw new Error(
            "この記録はメモではありません。元の記録から開き直してください。",
          );
        const records = await allRecords(c.signal);
        const options: OriginOption[] = records
          .filter((r) => r.id !== state.id)
          .map((r) => ({
            id: `record:${r.id}`,
            label: r.body.split("\n")[0]?.slice(0, 60) || "記録",
            ref: { type: "record", id: r.id, version: r.version },
          }));
        try {
          let cursor: string | undefined;
          do {
            const result = await api.request("getSuggestions", {
              query: { limit: 100, cursor },
              signal: c.signal,
            });
            options.push(
              ...result.items.map((s) => ({
                id: `suggestion:${s.id}`,
                label: `候補：${s.title}`,
                ref: {
                  type: "suggestion" as const,
                  id: s.id,
                  version: s.version,
                },
              })),
            );
            cursor = result.nextCursor || undefined;
          } while (cursor);
        } catch (error) {
          if (c.signal.aborted) throw error;
          setNotice({
            error: true,
            text: "候補の由来を読み込めませんでした。記録の由来とメモ本文は編集できます。",
            retry: () => setRevision((x) => x + 1),
          });
        }
        const presentation = record?.memo;
        for (const ref of presentation?.originRefs || [])
          if (!options.some((o) => o.id === key(ref)))
            options.push({ id: key(ref), label: "現在取得できない由来", ref });
        if (c.signal.aborted) return;
        setState((s) => ({
          ...s,
          record,
          options,
          loaded: true,
          form: s.edited
            ? s.form
            : record
              ? {
                  name: presentation?.name || "",
                  body: record.body,
                  origins: presentation?.originRefs.map(key) || [],
                  keywords: presentation?.keywords || [],
                  useForSuggestions: record.useForSuggestions,
                }
              : {
                  ...s.form,
                  origins: options
                    .filter(
                      (o) =>
                        o.ref.id === route.params.originRecordId ||
                        o.ref.id === route.params.suggestionId,
                    )
                    .map((o) => o.id),
                },
        }));
      } catch (error) {
        if (!c.signal.aborted)
          setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
      } finally {
        if (!c.signal.aborted) setBusy(false);
      }
    })();
    return () => c.abort();
  }, [route.params.recordId, scopeKey, revision, active]);
  const save = async () => {
    if (lock.current || !state.loaded) return;
    lock.current = true;
    setBusy(true);
    setNotice(undefined);
    const form = { ...state.form };
    try {
      const memo: MemoPresentation = {
        name: form.name,
        originRefs: form.origins
          .map((id) => state.options.find((o) => o.id === id)?.ref)
          .filter((r): r is MemoOrigin => !!r),
        keywords: form.keywords,
      };
      let saved: RecordView;
      if (state.record)
        saved = (
          await api.request("patchRecordsRecordId", {
            path: { recordId: state.id },
            body: {
              body: form.body,
              useForSuggestions: form.useForSuggestions,
              memo,
            },
            version: state.record.version,
            signal: control.current.signal,
          })
        ).data;
      else {
        const body: RecordCreate = state.pendingCreate || {
          id: state.id,
          kind: "memo",
          visitId: null,
          placeId: null,
          occurredAt: null,
          endedAt: null,
          timePrecision: "unknown",
          body: form.body,
          purposes: [],
          activities: [],
          impression: "",
          periodAnswers: {},
          bookmarked: false,
          useForSuggestions: form.useForSuggestions,
          topicKey: null,
          visibility: "private",
          sharedWith: [],
          memo,
        };
        setState((s) => ({ ...s, pendingCreate: body }));
        saved = (
          await api.request("postRecords", {
            body,
            idempotencyKey: state.createKey,
            signal: control.current.signal,
          })
        ).data;
      }
      if (
        saved.body !== form.body ||
        saved.useForSuggestions !== form.useForSuggestions ||
        JSON.stringify(saved.memo) !== JSON.stringify(memo)
      ) {
        saved = (
          await api.request("patchRecordsRecordId", {
            path: { recordId: saved.id },
            body: {
              body: form.body,
              useForSuggestions: form.useForSuggestions,
              memo,
            },
            version: saved.version,
            signal: control.current.signal,
          })
        ).data;
      }
      const current = (
        await api.request("getRecordsRecordId", {
          path: { recordId: saved.id },
          signal: control.current.signal,
        })
      ).data.record;
      setState((s) => ({
        ...s,
        record: current,
        pendingCreate: undefined,
        edited: JSON.stringify(s.form) !== JSON.stringify(form),
      }));
      setNotice({ text: "メモを保存し、保存先から読み直しました。" });
    } catch (error) {
      if (!control.current.signal.aborted)
        setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const remove = async () => {
    if (lock.current || !state.record) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.request("deleteRecordsRecordId", {
        path: { recordId: state.id },
        version: state.record.version,
        signal: control.current.signal,
      });
      navigate("personal-map");
    } catch (error) {
      setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const cancel = () => {
    if (state.record) {
      const m = state.record.memo;
      setState((s) => ({
        ...s,
        edited: false,
        form: {
          name: m?.name || "",
          body: state.record!.body,
          origins: m?.originRefs.map(key) || [],
          keywords: m?.keywords || [],
          useForSuggestions: state.record!.useForSuggestions,
        },
      }));
    } else setState((s) => ({ ...s, form: { ...blank }, edited: false }));
    back();
  };
  return (
    <MemoView
      value={state.form}
      change={(form) => setState((s) => ({ ...s, form, edited: true }))}
      options={state.options}
      keyword={state.keyword}
      setKeyword={(keyword) => setState((s) => ({ ...s, keyword }))}
      save={() => void save()}
      cancel={cancel}
      remove={state.record ? () => void remove() : undefined}
      confirmDelete={confirmDelete}
      setConfirmDelete={setConfirmDelete}
      busy={busy}
      notice={notice}
    />
  );
}
