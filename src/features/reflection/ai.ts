import { api } from "../../app/api";
import type {
  CommonAIRun,
  MessageSend,
  SourceRef,
} from "../../../packages/api-client";
export interface ReflectionAiJob {
  conversationId: string;
  send: MessageSend;
  adoptionKey: string;
}
export function diaryJob(
  date: string,
  timeZone: string,
  records: SourceRef[],
): ReflectionAiJob {
  return {
    conversationId: crypto.randomUUID(),
    adoptionKey: crypto.randomUUID(),
    send: {
      userMessageId: crypto.randomUUID(),
      assistantMessageId: crypto.randomUUID(),
      use: "diary",
      body: "この日の記録から日記の下書きを1000文字以内で提案してください。本人の記録にない出来事を追加しないでください。",
      context: {
        date,
        timezone: timeZone,
        recordIds: records.map((r) => r.id),
      },
      expectedRefs: records,
    },
  };
}
export function extractJob(
  recordId: string,
  question: string,
  answer: string,
  refs: SourceRef[],
): ReflectionAiJob {
  return {
    conversationId: crypto.randomUUID(),
    adoptionKey: crypto.randomUUID(),
    send: {
      userMessageId: crypto.randomUUID(),
      assistantMessageId: crypto.randomUUID(),
      use: "extract",
      body: "保存した回答を根拠に、用途と感想の整理を提案してください。",
      context: { recordId, answers: [{ question, text: answer }] },
      expectedRefs: refs,
    },
  };
}
function pause(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("取消", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 800);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}
export async function runReflectionAi(
  job: ReflectionAiJob,
  onRun: (run: CommonAIRun) => void,
  signal: AbortSignal,
): Promise<CommonAIRun> {
  await api.request("postConversations", {
    body: {
      id: job.conversationId,
      purpose: "reflection",
      title: job.send.use === "diary" ? "日記の下書き" : "振り返りの回答",
      recordId: job.send.use === "extract" ? job.send.context.recordId : null,
    },
    idempotencyKey: job.conversationId,
    signal,
  });
  await api.request("postConversationsConversationIdMessages", {
    path: { conversationId: job.conversationId },
    body: job.send,
    idempotencyKey: job.send.assistantMessageId,
    signal,
  });
  return await readReflectionAi(job.send.assistantMessageId, onRun, signal);
}
export async function readReflectionAi(
  messageId: string,
  onRun: (run: CommonAIRun) => void,
  signal: AbortSignal,
): Promise<CommonAIRun> {
  while (!signal.aborted) {
    const value = await api.request("getMessagesMessageId", {
      path: { messageId },
      signal,
    });
    const run = value.data.run;
    if (!run) throw new Error("AIの処理状態を確認できません。");
    onRun(run);
    if (run.status === "complete") return run;
    if (run.status === "failed" || run.status === "cancelled")
      throw new Error(
        run.error?.message ||
          "生成を終了しました。保存した原文は保持されています。",
      );
    await pause(signal);
  }
  throw new DOMException("取消", "AbortError");
}
export async function cancelReflectionAi(
  run: CommonAIRun,
  signal?: AbortSignal,
) {
  await api.request("postMessagesMessageIdCancel", {
    path: { messageId: run.id },
    body: { attempt: run.attempt },
    version: run.version,
    idempotencyKey: `cancel-${run.id}-${run.attempt}`,
    signal,
  });
  return (
    await api.request("getMessagesMessageId", {
      path: { messageId: run.id },
      signal,
    })
  ).data.run;
}
