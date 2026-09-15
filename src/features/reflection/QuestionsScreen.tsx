import React, { useEffect, useRef, useState } from "react";
import type { ScreenProps } from "../../app/contracts";
import { useScreenState } from "../../app/useScreenState";
import { api } from "../../app/api";
import type {
  ReflectionQuestion,
  ReflectionQuestionPatch,
  CommonAIRun,
} from "../../../packages/api-client";
import {
  Action,
  Feedback,
  QuestionView,
  HistoryView,
  type Notice,
  type QuestionCardData,
} from "./views";
import {
  extractJob,
  runReflectionAi,
  cancelReflectionAi,
  type ReflectionAiJob,
} from "./ai";
import { deviceTimeZone, errorNotice, readRecordCard } from "./records";
const toStatus = {
  pending: "unanswered",
  later: "deferred",
  skipped: "skipped",
  answered: "answered",
} as const;
const fromStatus = {
  unanswered: "pending",
  deferred: "later",
  skipped: "skipped",
  answered: "answered",
} as const;
async function questionCard(
  q: ReflectionQuestion,
  timeZone: string,
  signal?: AbortSignal,
): Promise<QuestionCardData> {
  return {
    id: q.id,
    question: q.questionText,
    month: new Intl.DateTimeFormat("ja-JP", {
      timeZone,
      year: "numeric",
      month: "long",
    }).format(q.createdAt),
    answer: q.answerUnavailable ? "" : q.answerText || "",
    status: toStatus[q.status],
    record: await readRecordCard(q.targetRecordId, timeZone, signal),
  };
}
interface QuestionState {
  question?: ReflectionQuestion;
  card?: QuestionCardData;
  answer: string;
  edited: boolean;
  ai?: { job: ReflectionAiJob; run?: CommonAIRun; recordVersion: number };
  showAi: boolean;
  fields: ("purpose" | "reason")[];
}
export function QuestionsScreen({
  route,
  navigate,
  scopeKey,
  active = true,
}: ScreenProps) {
  const [state, setState] = useScreenState<QuestionState>({
    answer: "",
    edited: false,
    showAi: route.params.interpret === "true",
    fields: ["purpose", "reason"],
  });
  const [notice, setNotice] = useState<Notice>();
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const control = useRef(new AbortController());
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotice, setAiNotice] = useState<Notice>();
  const aiControl = useRef(new AbortController());
  const timeZone = route.params.timeZone || deviceTimeZone();
  useEffect(() => {
    if (!active) return;
    const c = new AbortController();
    control.current = c;
    setBusy(true);
    setNotice(undefined);
    void (async () => {
      try {
        let q: ReflectionQuestion | undefined;
        if (route.params.questionId)
          q = (
            await api.request("getReflectionQuestionsQuestionId", {
              path: { questionId: route.params.questionId },
              signal: c.signal,
            })
          ).data;
        else if (route.params.assistantMessageId)
          q = (
            await api.request("postReflectionQuestions", {
              body: { assistantMessageId: route.params.assistantMessageId },
              idempotencyKey: `question-${route.params.assistantMessageId}`,
              signal: c.signal,
            })
          ).data;
        else
          q = (
            await api.request("getReflectionQuestions", {
              query: {
                status: "pending",
                targetRecordId: route.params.recordId,
                limit: 1,
              },
              signal: c.signal,
            })
          ).items[0];
        const card = q ? await questionCard(q, timeZone, c.signal) : undefined;
        if (c.signal.aborted) return;
        setState((s) => ({
          ...s,
          question: q,
          card,
          answer: s.edited ? s.answer : q?.answerText || "",
        }));
        if (q?.answerUnavailable)
          setNotice({
            error: true,
            text: "保存した回答の元記録は現在利用できません。",
          });
      } catch (error) {
        if (!c.signal.aborted)
          setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
      } finally {
        if (!c.signal.aborted) setBusy(false);
      }
    })();
    return () => {
      c.abort();
      aiControl.current.abort();
    };
  }, [
    route.params.questionId,
    route.params.recordId,
    route.params.assistantMessageId,
    scopeKey,
    timeZone,
    revision,
    active,
  ]);
  const save = async (status: QuestionCardData["status"]) => {
    if (lock.current || !state.question || status === "unanswered") return;
    lock.current = true;
    setBusy(true);
    setNotice(undefined);
    const q = state.question;
    const answer = state.answer;
    try {
      const body: ReflectionQuestionPatch = {
        status: fromStatus[status],
        ...(status === "answered"
          ? {
              answerText: answer,
              ...(q.answerVersion ? { answerVersion: q.answerVersion } : {}),
            }
          : {}),
      };
      await api.request("patchReflectionQuestionsQuestionId", {
        path: { questionId: q.id },
        body,
        version: q.version,
        signal: control.current.signal,
      });
      const saved = (
        await api.request("getReflectionQuestionsQuestionId", {
          path: { questionId: q.id },
          signal: control.current.signal,
        })
      ).data;
      setState((s) => ({
        ...s,
        question: saved,
        ai: undefined,
        card: s.card
          ? {
              ...s.card,
              answer: saved.answerText || "",
              status: toStatus[saved.status],
            }
          : undefined,
        edited: s.answer !== answer,
      }));
      setNotice({
        text:
          status === "answered"
            ? "回答原文を保存しました。AIの整理は振り返りの記録から開始できます。"
            : status === "deferred"
              ? "あとで振り返る質問として保存しました。"
              : "スキップとして保存しました。",
      });
    } catch (error) {
      if (!control.current.signal.aborted)
        setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const generate = async () => {
    const q = state.question;
    if (aiBusy || !q?.answerText || !q.answerRef || q.answerUnavailable) return;
    const c = new AbortController();
    aiControl.current.abort();
    aiControl.current = c;
    setAiBusy(true);
    setAiNotice(undefined);
    try {
      const record = (
        await api.request("getRecordsRecordId", {
          path: { recordId: q.targetRecordId },
          signal: c.signal,
        })
      ).data.record;
      const job = extractJob(q.targetRecordId, q.questionText, q.answerText, [
        { type: "record", id: record.id, version: record.version },
        q.answerRef,
      ]);
      setState((s) => ({ ...s, ai: { job, recordVersion: record.version } }));
      await runReflectionAi(
        job,
        (run) =>
          setState((s) => ({ ...s, ai: s.ai ? { ...s.ai, run } : undefined })),
        c.signal,
      );
    } catch (error) {
      if (!c.signal.aborted)
        setAiNotice(errorNotice(error, () => void generate()));
    } finally {
      if (!c.signal.aborted) setAiBusy(false);
    }
  };
  const adopt = async () => {
    const q = state.question;
    const ai = state.ai;
    if (lock.current || !q || ai?.run?.task !== "extract" || !ai.run.result)
      return;
    const result = ai.run.result;
    const fields = state.fields.filter((f) => result[f] !== null);
    if (!fields.length) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.request("postReflectionAdoptions", {
        body: {
          assistantMessageId: ai.job.send.assistantMessageId,
          recordId: q.targetRecordId,
          fields,
        },
        version: ai.recordVersion,
        idempotencyKey: ai.job.adoptionKey,
        signal: control.current.signal,
      });
      await api.request("getRecordsRecordId", {
        path: { recordId: q.targetRecordId },
        signal: control.current.signal,
      });
      setAiNotice({
        text: "選んだ用途・感想を保存して読み直しました。回答原文はそのまま保持しています。",
      });
    } catch (error) {
      setAiNotice(errorNotice(error, () => void generate()));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const cancelAi = async () => {
    aiControl.current.abort();
    setAiBusy(false);
    const run = state.ai?.run;
    if (run && (run.status === "running" || run.status === "pending"))
      try {
        await cancelReflectionAi(run, control.current.signal);
        setAiNotice({
          text: "AIの整理を取り消しました。回答原文は保存されています。",
        });
      } catch (error) {
        setAiNotice(errorNotice(error));
      }
  };
  const result = state.ai?.run?.task === "extract" ? state.ai.run.result : null;
  return (
    <>
      <QuestionView
        item={state.card}
        answer={state.answer}
        onAnswer={(answer) => setState((s) => ({ ...s, answer, edited: true }))}
        openRecord={() =>
          state.question &&
          navigate("record-edit", { recordId: state.question.targetRecordId })
        }
        save={(status) => void save(status)}
        busy={busy}
        notice={notice}
      />
      <div className="rf-screen rf-footer">
        {state.question?.status === "answered" && (
          <section className="rf-card">
            <Action
              onClick={() => setState((s) => ({ ...s, showAi: !s.showAi }))}
            >
              この回答で解釈を更新
            </Action>
            {state.showAi && (
              <>
                <p>
                  保存した回答原文を根拠に、用途と感想を整理します。採用する項目を確認して保存してください。
                </p>
                <Action
                  onClick={() => void generate()}
                  disabled={
                    aiBusy || state.edited || !!state.question.answerUnavailable
                  }
                >
                  AIで整理する
                </Action>
                {state.edited && <p>先に回答の変更を保存してください。</p>}
                {aiBusy && (
                  <Action onClick={() => void cancelAi()}>
                    生成を取り消す
                  </Action>
                )}
                {result && (
                  <>
                    <fieldset className="rf-origins">
                      <legend>採用する内容</legend>
                      {(["purpose", "reason"] as const).map((field) => (
                        <label key={field}>
                          <input
                            type="checkbox"
                            checked={state.fields.includes(field)}
                            disabled={result[field] === null}
                            onChange={(e) =>
                              setState((s) => ({
                                ...s,
                                fields: e.target.checked
                                  ? [...s.fields, field]
                                  : s.fields.filter((f) => f !== field),
                              }))
                            }
                          />
                          <span>
                            {field === "purpose" ? "用途" : "感想"}：
                            {result[field] || "情報が足りません"}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <Action
                      primary
                      onClick={() => void adopt()}
                      disabled={busy || !state.fields.length}
                    >
                      選んだ内容を保存
                    </Action>
                  </>
                )}
                <Feedback busy={aiBusy} notice={aiNotice} />
              </>
            )}
          </section>
        )}
        <Action onClick={() => navigate("reflection-history")}>
          振り返りの記録を見る
        </Action>
      </div>
    </>
  );
}
interface HistoryState {
  filter: string;
  expanded: string[];
  questions: ReflectionQuestion[];
  cards: QuestionCardData[];
  cursor: string | null;
}
export function HistoryScreen({
  route,
  navigate,
  scopeKey,
  active = true,
}: ScreenProps) {
  const [state, setState] = useScreenState<HistoryState>({
    filter: "all",
    expanded: [],
    questions: [],
    cards: [],
    cursor: null,
  });
  const [notice, setNotice] = useState<Notice>();
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const control = useRef(new AbortController());
  const timeZone = route.params.timeZone || deviceTimeZone();
  const load = async (append = false, signal?: AbortSignal) => {
    setBusy(true);
    setNotice(undefined);
    try {
      const status =
        state.filter === "all"
          ? undefined
          : fromStatus[state.filter as keyof typeof fromStatus];
      const result = await api.request("getReflectionQuestions", {
        query: {
          status,
          cursor: append ? state.cursor || undefined : undefined,
          limit: 30,
        },
        signal,
      });
      const cards = await Promise.all(
        result.items.map((q) => questionCard(q, timeZone, signal)),
      );
      if (signal?.aborted) return;
      setState((s) => ({
        ...s,
        questions: append ? [...s.questions, ...result.items] : result.items,
        cards: append ? [...s.cards, ...cards] : cards,
        cursor: result.nextCursor,
      }));
    } catch (error) {
      if (!signal?.aborted)
        setNotice(errorNotice(error, () => setRevision((x) => x + 1)));
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  };
  useEffect(() => {
    if (!active) return;
    const c = new AbortController();
    control.current = c;
    void load(false, c.signal);
    return () => c.abort();
  }, [state.filter, scopeKey, revision, timeZone, active]);
  return (
    <HistoryView
      items={state.cards}
      filter={state.filter}
      setFilter={(filter) =>
        setState((s) => ({
          ...s,
          filter,
          cards: [],
          questions: [],
          cursor: null,
        }))
      }
      expanded={state.expanded}
      toggle={(id) =>
        setState((s) => ({
          ...s,
          expanded: s.expanded.includes(id)
            ? s.expanded.filter((x) => x !== id)
            : [...s.expanded, id],
        }))
      }
      openRecord={(id) => navigate("record-edit", { recordId: id })}
      editAnswer={(questionId) =>
        navigate("reflection-question", { questionId })
      }
      interpret={(questionId) =>
        navigate("reflection-question", { questionId, interpret: "true" })
      }
      more={() => void load(true, control.current.signal)}
      hasMore={!!state.cursor}
      busy={busy}
      notice={notice}
    />
  );
}
