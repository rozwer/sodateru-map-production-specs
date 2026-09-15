import React, { useEffect, useRef, useState } from "react";
import type { ScreenProps } from "../../app/contracts";
import { useScreenState } from "../../app/useScreenState";
import { api } from "../../app/api";
import {
  ApiError,
  type RecordView,
  type Media,
  type RecordCreate,
  type CommonAIRun,
} from "../../../packages/api-client";
import { DiaryView, Action, type PhotoDraft, type Notice } from "./views";
import {
  diaryJob,
  runReflectionAi,
  readReflectionAi,
  cancelReflectionAi,
  type ReflectionAiJob,
} from "./ai";
import {
  allRecordMedia,
  deviceTimeZone,
  errorNotice,
  newDiary,
  today,
} from "./records";
interface Photo extends PhotoDraft {
  file?: File;
  media?: Media;
  key: string;
}
interface Entry {
  id: string;
  body: string;
  initialBody: string;
  record?: RecordView;
  photos: Photo[];
  removed: Media[];
  loaded: boolean;
  from: number;
  to: number;
  pendingCreate?: ReturnType<typeof newDiary>;
  remote?: RecordView;
  createKey: string;
  ai?: {
    job: ReflectionAiJob;
    run?: CommonAIRun;
    adopted: boolean;
    applied?: boolean;
  };
}
interface DiaryState {
  date: string;
  entries: Record<string, Entry>;
}
const emptyEntry = (): Entry => ({
  id: crypto.randomUUID(),
  body: "",
  initialBody: "",
  photos: [],
  removed: [],
  loaded: false,
  from: 0,
  to: 0,
  createKey: crypto.randomUUID(),
});
export function DiaryScreen({
  route,
  navigate,
  scopeKey,
  active = true,
}: ScreenProps) {
  const timeZone = route.params.timeZone || deviceTimeZone();
  const [state, setState] = useScreenState<DiaryState>(() => ({
    date: route.params.date || today(timeZone),
    entries: {},
  }));
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotice, setAiNotice] = useState<Notice>();
  const aiControl = useRef(new AbortController());
  const [notice, setNotice] = useState<Notice>();
  const [revision, setRevision] = useState(0);
  const [choices, setChoices] = useState<RecordView[]>([]);
  const lock = useRef(false);
  const abort = useRef(new AbortController());
  const latest = useRef(state);
  latest.current = state;
  const date = state.date;
  const entry = state.entries[date];
  const update = (day: string, fn: (entry: Entry) => Entry) =>
    setState((s) => ({
      ...s,
      entries: { ...s.entries, [day]: fn(s.entries[day] || emptyEntry()) },
    }));
  useEffect(() => {
    abort.current = new AbortController();
    return () => {
      abort.current.abort();
      aiControl.current.abort();
    };
  }, [scopeKey, active]);
  useEffect(() => {
    if (!active) return;
    const control = new AbortController();
    setNotice(undefined);
    setChoices([]);
    setBusy(true);
    void (async () => {
      try {
        const range = await api.request("getReflectionDaysDate", {
          path: { date },
          query: { timeZone },
          signal: control.signal,
        });
        const list = await api.request("getRecords", {
          query: {
            kind: "diary",
            from: range.data.from,
            to: range.data.to,
            timeZone,
            limit: 100,
          },
          signal: control.signal,
        });
        if (
          list.items.length > 1 &&
          !(
            route.params.recordId &&
            date === (route.params.date || today(timeZone))
          )
        ) {
          setChoices(list.items);
          setNotice({
            error: true,
            text: "この日には複数の日記があります。既存の日記を選んで編集してください。",
          });
          return;
        }
        const requestedId =
          date === (route.params.date || today(timeZone))
            ? route.params.recordId
            : undefined;
        const record = requestedId
          ? list.items.find((r) => r.id === requestedId)
          : list.items[0];
        if (requestedId && !record)
          throw new Error(
            "指定の日記がこの日に見つかりません。日付と元の記録を確認してください。",
          );
        const media = record
          ? await allRecordMedia(record.id, control.signal)
          : [];
        if (control.signal.aborted) return;
        update(date, (old) =>
          old.loaded
            ? {
                ...old,
                from: range.data.from,
                to: range.data.to,
                remote:
                  record && record.version !== old.record?.version
                    ? record
                    : old.remote,
              }
            : {
                ...old,
                from: range.data.from,
                to: range.data.to,
                record,
                id: record?.id || old.id,
                body: old.body || record?.body || "",
                initialBody: record?.body || "",
                loaded: true,
                photos: [
                  ...media
                    .filter((m) => m.kind === "photo")
                    .map((m) => ({
                      id: m.id,
                      url: m.contentUrl || "",
                      name: "日記の写真",
                      media: m,
                      key: crypto.randomUUID(),
                    })),
                  ...old.photos,
                ],
              },
        );
      } catch (error) {
        if (!control.signal.aborted)
          setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
      } finally {
        if (!control.signal.aborted) setBusy(false);
      }
    })();
    return () => control.abort();
  }, [date, timeZone, scopeKey, revision, active]);
  const changeBody = (body: string) => update(date, (e) => ({ ...e, body }));
  const addPhotos = (files: File[]) => {
    const supported = files.filter(
      (file) =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
        file.size <= 52428800,
    );
    if (supported.length !== files.length)
      setNotice({
        error: true,
        text: "写真はJPEG・PNG・WebP、1枚50MiB以内で選んでください。",
      });
    update(date, (e) => ({
      ...e,
      photos: [
        ...e.photos,
        ...supported.map((file) => ({
          id: crypto.randomUUID(),
          url: URL.createObjectURL(file),
          name: file.name,
          file,
          key: crypto.randomUUID(),
        })),
      ],
    }));
  };
  const removePhoto = (id: string) =>
    update(date, (e) => {
      const photo = e.photos.find((p) => p.id === id);
      if (photo?.file) URL.revokeObjectURL(photo.url);
      return {
        ...e,
        photos: e.photos.filter((p) => p.id !== id),
        removed: photo?.media ? [...e.removed, photo.media] : e.removed,
      };
    });
  const save = async () => {
    if (lock.current || !entry?.loaded || entry.remote) return;
    lock.current = true;
    setBusy(true);
    setNotice(undefined);
    const day = date;
    const snapshot = {
      ...entry,
      photos: [...entry.photos],
      removed: [...entry.removed],
    };
    const signal = abort.current.signal;
    try {
      let saved = snapshot.record;
      if (snapshot.ai?.adopted) {
        saved = (
          await api.request("postReflectionAdoptions", {
            body: {
              assistantMessageId: snapshot.ai.job.send.assistantMessageId,
              recordId: snapshot.id,
              body: snapshot.body,
              ...(!saved ? { create: true, occurredAt: snapshot.from } : {}),
            },
            ...(saved ? { version: saved.version } : {}),
            idempotencyKey: snapshot.ai.job.adoptionKey,
            signal,
          })
        ).data;
        update(day, (e) => ({
          ...e,
          record: saved,
          initialBody: snapshot.body,
          ai: e.ai ? { ...e.ai, adopted: false, applied: true } : undefined,
        }));
      }
      if (!saved) {
        const payload =
          snapshot.pendingCreate ||
          newDiary(snapshot.id, snapshot.body, snapshot.from);
        update(day, (e) => ({ ...e, pendingCreate: payload }));
        saved = (
          await api.request("postRecords", {
            body: payload,
            idempotencyKey: snapshot.createKey,
            signal,
          })
        ).data;
        update(day, (e) => ({
          ...e,
          record: saved,
          pendingCreate: undefined,
          initialBody: payload.body,
        }));
      }
      if (saved.body !== snapshot.body) {
        saved = (
          await api.request("patchRecordsRecordId", {
            path: { recordId: saved.id },
            body: { body: snapshot.body },
            version: saved.version,
            signal,
          })
        ).data;
        update(day, (e) => ({
          ...e,
          record: saved,
          initialBody: snapshot.body,
        }));
      }
      for (const removed of snapshot.removed) {
        try {
          await api.request("deleteMediaMediaId", {
            path: { mediaId: removed.id },
            version: removed.version,
            signal,
          });
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
        }
        update(day, (e) => ({
          ...e,
          removed: e.removed.filter((m) => m.id !== removed.id),
        }));
      }
      for (const [position, photo] of snapshot.photos.entries()) {
        if (!photo.file) continue;
        const current = (
          await api.request("getRecordsRecordId", {
            path: { recordId: saved.id },
            signal,
          })
        ).data.record;
        const form = new FormData();
        form.set("id", photo.id);
        form.set("file", photo.file);
        form.set("position", String(position));
        const media = (
          await api.request("postRecordsRecordIdMedia", {
            path: { recordId: saved.id },
            body: form,
            version: current.version,
            idempotencyKey: photo.key,
            signal,
          })
        ).data;
        update(day, (e) => ({
          ...e,
          photos: e.photos.map((p) =>
            p.id === photo.id
              ? { ...p, file: undefined, media, url: media.contentUrl || p.url }
              : p,
          ),
        }));
      }
      const reloaded = (
        await api.request("getRecordsRecordId", {
          path: { recordId: saved.id },
          signal,
        })
      ).data.record;
      update(day, (e) => ({
        ...e,
        record: reloaded,
        initialBody: reloaded.body,
      }));
      setNotice({ text: "日記を保存し、保存先から読み直しました。" });
    } catch (error) {
      setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
    } finally {
      lock.current = false;
      if (!signal.aborted) setBusy(false);
    }
  };
  const generate = async () => {
    if (aiBusy || !entry?.loaded) return;
    aiControl.current.abort();
    const c = new AbortController();
    aiControl.current = c;
    setAiBusy(true);
    setAiNotice(undefined);
    const day = date;
    try {
      let job = entry.ai?.job;
      if (
        !job ||
        ["complete", "failed", "cancelled"].includes(
          entry.ai?.run?.status || "",
        )
      ) {
        const items: RecordView[] = [];
        let cursor: string | undefined;
        do {
          const page = await api.request("getRecords", {
            query: {
              kind: "experience",
              from: entry.from,
              to: entry.to,
              timeZone,
              limit: 100,
              cursor,
            },
            signal: c.signal,
          });
          items.push(...page.items);
          cursor = page.nextCursor || undefined;
        } while (cursor);
        if (items.length === 0)
          throw new Error(
            "この日の体験記録がありません。日記は自由に書いて保存できます。",
          );
        job = diaryJob(
          date,
          timeZone,
          items.map((r) => ({ type: "record", id: r.id, version: r.version })),
        );
        update(day, (e) => ({ ...e, ai: { job: job!, adopted: false } }));
      }
      const notify = (run: CommonAIRun) =>
        update(day, (e) => ({ ...e, ai: e.ai ? { ...e.ai, run } : undefined }));
      await runReflectionAi(job, notify, c.signal);
    } catch (error) {
      if (!c.signal.aborted)
        setAiNotice(errorNotice(error, () => void generate()));
    } finally {
      if (!c.signal.aborted) setAiBusy(false);
    }
  };
  const adopt = () => {
    const run = entry?.ai?.run;
    if (
      run?.task !== "diary" ||
      !run.result ||
      entry?.ai?.adopted ||
      entry?.ai?.applied
    )
      return;
    update(date, (e) => {
      const text = e.body
        ? `${e.body}\n\n${run.result!.text}`
        : run.result!.text;
      if (Array.from(text).length > 1000) {
        setAiNotice({
          error: true,
          text: "追記すると1000文字を超えます。本文を編集してから採用してください。",
        });
        return e;
      }
      return {
        ...e,
        body: text,
        ai: e.ai ? { ...e.ai, adopted: true } : undefined,
      };
    });
  };
  const cancelAi = async () => {
    aiControl.current.abort();
    setAiBusy(false);
    const run = entry?.ai?.run;
    if (run && (run.status === "pending" || run.status === "running"))
      try {
        await cancelReflectionAi(run, abort.current.signal);
        setAiNotice({ text: "生成を取り消しました。本文は保持しています。" });
      } catch (error) {
        setAiNotice(errorNotice(error, () => void generate()));
      }
  };
  const aiText =
    entry?.ai?.run?.task === "diary" ? entry.ai.run.result?.text : undefined;
  return (
    <>
      {choices.length > 1 && (
        <div className="rf-screen rf-card">
          <h2>編集する日記を選ぶ</h2>
          {choices.map((r) => (
            <Action
              key={r.id}
              onClick={() =>
                navigate("diary", { date, timeZone, recordId: r.id })
              }
            >
              {r.body.split("\n")[0]?.slice(0, 60) || "本文のない日記"}
            </Action>
          ))}
        </div>
      )}{" "}
      {entry?.remote && (
        <div className="rf-screen rf-card">
          <h2>保存先の内容が変わりました</h2>
          <p className="rf-preserve">{entry.remote.body || "本文なし"}</p>
          <div className="rf-actions">
            <Action
              onClick={() =>
                update(date, (e) => ({
                  ...e,
                  record: e.remote,
                  initialBody: e.remote!.body,
                  remote: undefined,
                }))
              }
            >
              入力を保ってこの版に保存
            </Action>
            <Action
              onClick={() =>
                update(date, (e) => ({
                  ...e,
                  record: e.remote,
                  body: e.remote!.body,
                  initialBody: e.remote!.body,
                  remote: undefined,
                }))
              }
            >
              保存先の本文を使う
            </Action>
          </div>
        </div>
      )}
      <DiaryView
        date={date}
        changeDate={(value) => {
          if (!lock.current) {
            aiControl.current.abort();
            setAiBusy(false);
            setAiNotice(undefined);
            setState((s) => ({ ...s, date: value }));
          }
        }}
        body={entry?.body || ""}
        changeBody={changeBody}
        photos={entry?.photos || []}
        addPhotos={addPhotos}
        removePhoto={removePhoto}
        save={() => void save()}
        busy={busy}
        notice={notice}
        saved={!!entry?.record}
        saveDisabled={!entry?.loaded || !!entry.remote}
        dirty={
          !!entry &&
          (!entry.record ||
            entry.body !== entry.initialBody ||
            entry.photos.some((p) => p.file) ||
            entry.removed.length > 0)
        }
        ai={{
          busy: aiBusy,
          text: aiText,
          generate: () => void generate(),
          adopt,
          cancel: () => void cancelAi(),
          notice: aiNotice,
          adopted: !!entry?.ai?.adopted || !!entry?.ai?.applied,
        }}
      />
    </>
  );
}
