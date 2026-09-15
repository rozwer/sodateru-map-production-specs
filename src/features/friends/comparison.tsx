import { useEffect, useRef, useState } from "react";
import { api } from "../../app/api";
import type { ScreenProps } from "../../app/contracts";
import { useScreenState } from "../../app/useScreenState";
import type {
  CommonAISourceRef,
  CommonInfoRecordView,
  MessageSend,
} from "../../../packages/api-client";
import { Icon } from "../../ui/Icon";
import { Action, Avatar, Notice, RecordCard } from "./components";
import { errorText, periodQuery, useRead } from "./data";

interface CompareDraft {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  input: Extract<MessageSend, { use: "comparison" }> | null;
  started: boolean;
}
const initial = (): CompareDraft => ({
  conversationId: crypto.randomUUID(),
  userMessageId: crypto.randomUUID(),
  assistantMessageId: crypto.randomUUID(),
  input: null,
  started: false,
});
const relationshipNames = {
  "same-place-same-purpose": "同じ場所・同じ用途",
  "same-place-different-purpose": "同じ場所・違う用途",
  "different-place-same-role": "別の場所・同じ役割",
  "practical-tip": "街の使い方のヒント",
  "similar-but-different-reason": "似ている体験・違う理由",
};
function uniqueRefs(records: CommonInfoRecordView[]): CommonAISourceRef[] {
  return [
    ...new Map(
      records
        .flatMap((record) => record.sourceRefs)
        .map((ref) => [`${ref.type}:${ref.id}`, ref]),
    ).values(),
  ];
}

export function FriendCompare(props: ScreenProps) {
  const personId = props.route.params.personId ?? "";
  const active = props.active !== false;
  const [draft, setDraft] = useScreenState(initial);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const mutationKey = useRef("");
  const source = useRead(
    `${props.scopeKey}:comparison-source:${personId}:${JSON.stringify(props.route.params)}`,
    async (signal) => {
      const [me, friend, own, shared] = await Promise.all([
        api.request("getMe", { signal }),
        api.request("getPeoplePersonId", { path: { personId }, signal }),
        api.request("getSharedRecords", {
          query: {
            audience: "own",
            limit: 20,
            ...periodQuery(props.route.params),
          },
          signal,
        }),
        api.request("getSharedRecords", {
          query: {
            personIds: [personId],
            limit: 20,
            ...periodQuery(props.route.params),
          },
          signal,
        }),
      ]);
      return { me: me.data, friend: friend.data, own, shared };
    },
    !!personId && active,
  );
  const result = useRead(
    `${props.scopeKey}:comparison-result:${draft.assistantMessageId}`,
    (signal) =>
      api.request("getMessagesMessageId", {
        path: { messageId: draft.assistantMessageId },
        signal,
      }),
    draft.started && active,
  );
  const run = result.data?.data.run,
    message = result.data?.data.message;
  const insightId = run?.insightId ?? message?.insightId;
  const status = run?.status ?? message?.status;
  const insight = useRead(
    `${props.scopeKey}:comparison-insight:${insightId}`,
    (signal) =>
      api.request("getInsightsInsightId", {
        path: { insightId: insightId! },
        signal,
      }),
    !!insightId && status === "complete" && active,
  );
  useEffect(() => {
    if (!active) controller.current?.abort();
    return () => controller.current?.abort();
  }, [active, props.scopeKey]);
  useEffect(() => {
    if (!active || !status || !["pending", "running"].includes(status)) return;
    const timer = setTimeout(result.reload, 2500);
    return () => clearTimeout(timer);
  }, [active, status, run, message]);

  async function start(fresh = false) {
    if (!source.data || busy) return;
    const next = fresh ? initial() : draft;
    const input: Extract<MessageSend, { use: "comparison" }> = next.input ?? {
      userMessageId: next.userMessageId,
      assistantMessageId: next.assistantMessageId,
      body: "ふたりの体験の用途と理由、共通点と違いを比較してください。",
      use: "comparison",
      context: {
        fromRecordIds: source.data.own.items.map((record) => record.id),
        toRecordIds: source.data.shared.items.map((record) => record.id),
      },
      expectedRefs: uniqueRefs([
        ...source.data.own.items,
        ...source.data.shared.items,
      ]),
    };
    setDraft({ ...next, input });
    setBusy(true);
    setError("");
    const request = new AbortController();
    controller.current = request;
    try {
      await api.request("postConversations", {
        body: {
          id: next.conversationId,
          purpose: "comparison",
          title: `${source.data.friend.name}との共通点`,
          recordId: null,
        },
        idempotencyKey: next.conversationId,
        signal: request.signal,
      });
      await api.request("postConversationsConversationIdMessages", {
        path: { conversationId: next.conversationId },
        body: input,
        idempotencyKey: next.userMessageId,
        signal: request.signal,
      });
      if (!request.signal.aborted) setDraft({ ...next, input, started: true });
    } catch (e) {
      if (!request.signal.aborted) setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function changeRun(cancel: boolean) {
    if (!message || busy) return;
    setBusy(true);
    setError("");
    mutationKey.current ||= crypto.randomUUID();
    const request = new AbortController();
    controller.current = request;
    try {
      await api.request(
        cancel ? "postMessagesMessageIdCancel" : "postMessagesMessageIdRetry",
        {
          path: { messageId: message.id },
          version: message.version,
          body: { attempt: message.attempt },
          idempotencyKey: mutationKey.current,
          signal: request.signal,
        },
      );
      mutationKey.current = "";
      result.reload();
    } catch (e) {
      if (!request.signal.aborted) setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const details = source.data;
  const compare =
    result.data?.data.output?.use === "comparison"
      ? result.data.data.output.value
      : run?.task === "compare"
        ? run.result
        : null;
  const summary = insight.data?.data.result;
  const open = (record: CommonInfoRecordView) =>
    props.navigate("knowledge-detail", {
      recordId: record.id,
      personId: record.person.id,
      returnTo: "friend-compare",
    });
  const canStart =
    !!details?.own.items.length &&
    !!details?.shared.items.length &&
    details.me.id !== personId;
  return (
    <div className="fr-screen">
      {source.loading && <Notice>比較する記録を読み込み中…</Notice>}
      {source.error && (
        <Notice error retry={source.reload}>
          {source.error}
        </Notice>
      )}
      {!personId && <Notice>比較する友達を選んでください。</Notice>}
      {details && (
        <>
          <div className="fr-compare-head">
            <div>
              <Avatar person={details.me} />
              <strong>わたし</strong>
            </div>
            <div>
              <Icon name="people" size={35} />
              <small>ふたりの共通点</small>
            </div>
            <div>
              <Avatar person={details.friend} />
              <strong>{details.friend.name}</strong>
            </div>
          </div>
          <Notice>
            あなたの記録と、現在閲覧できる友達の記録で比較します。
            <small>あなたの非公開の記録は、相手に公開されません。</small>
          </Notice>
          {(details.own.nextCursor || details.shared.nextCursor) && (
            <small>
              直近の各20件を比較します。より前の記録は一覧から確認できます。
            </small>
          )}
          {!canStart && (
            <Notice>
              比較できる記録が足りません。情報不足は「共通点なし」という意味ではありません。
            </Notice>
          )}
          {!draft.started && (
            <Action
              primary
              disabled={!canStart || busy}
              onClick={() => void start()}
            >
              {busy ? "比較を依頼中…" : "ふたりの体験を比較する"}
            </Action>
          )}
          {error && <Notice error>{error}</Notice>}
          {result.loading && <Notice>比較結果を読み込み中…</Notice>}
          {result.error && (
            <Notice error retry={result.reload}>
              {result.error}
            </Notice>
          )}
          {(status === "pending" || status === "running") && (
            <>
              <Notice>用途と理由を比較しています。</Notice>
              <Action disabled={busy} onClick={() => void changeRun(true)}>
                比較を取り消す
              </Action>
            </>
          )}
          {(status === "failed" || status === "cancelled") && (
            <>
              <Notice error={status === "failed"}>
                {status === "failed"
                  ? (run?.error?.message ?? "比較を完了できませんでした。")
                  : "比較を取り消しました。原文はそのままです。"}
              </Notice>
              <Action disabled={busy} onClick={() => void changeRun(false)}>
                同じ記録で再試行
              </Action>
            </>
          )}
          {insight.error && (
            <Notice error retry={insight.reload}>
              {insight.error}
            </Notice>
          )}
          {compare &&
            status === "complete" &&
            insight.data &&
            !insight.loading &&
            !result.loading && (
              <>
                {compare.mappings.map((mapping, index) => {
                  const left = details.own.items.find(
                      (record) => record.id === mapping.fromRecordId,
                    ),
                    right = details.shared.items.find(
                      (record) => record.id === mapping.toRecordId,
                    );
                  if (!left || !right) return null;
                  return (
                    <section
                      className="fr-comparison-card"
                      key={`${mapping.fromRecordId}:${mapping.toRecordId}:${index}`}
                    >
                      <h3>{relationshipNames[mapping.relation]}</h3>
                      <p>{mapping.explanation}</p>
                      <div className="fr-compare-columns">
                        <RecordCard record={left} open={() => open(left)} />
                        <RecordCard record={right} open={() => open(right)} />
                      </div>
                      <div className="fr-actions">
                        <Action onClick={() => open(left)}>わたしの根拠</Action>
                        <Action onClick={() => open(right)}>
                          {details.friend.name}の根拠
                        </Action>
                      </div>
                    </section>
                  );
                })}
                {summary && "common" in summary && (
                  <section className="fr-comparison-summary">
                    <h3>共通点</h3>
                    {summary.common.length ? (
                      <ul>
                        {summary.common.map((text, i) => (
                          <li key={i}>{text}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>今回の記録からは、共通点をまだ確認できません。</p>
                    )}
                    <h3>違い</h3>
                    <ul>
                      {summary.differences.map((text, i) => (
                        <li key={i}>{text}</li>
                      ))}
                    </ul>
                    <h3>まだわからないこと</h3>
                    <ul>
                      {summary.unknown.map((text, i) => (
                        <li key={i}>{text}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {!compare.mappings.length && (
                  <Notice>
                    今回の記録から比較できる対応は得られませんでした。共通点がないとは限りません。
                  </Notice>
                )}
              </>
            )}
          {!draft.started && (
            <div className="fr-compare-columns">
              <section>
                <h3>わたしの記録</h3>
                {details.own.items.slice(0, 2).map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    open={() => open(record)}
                  />
                ))}
              </section>
              <section>
                <h3>{details.friend.name}の記録</h3>
                {details.shared.items.slice(0, 2).map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    open={() => open(record)}
                  />
                ))}
              </section>
            </div>
          )}
          {draft.started && status === "complete" && (
            <Action disabled={busy} onClick={() => void start(true)}>
              最新の記録で比較する
            </Action>
          )}
          <Action
            primary
            onClick={() =>
              props.navigate("friends-map", {
                ...props.route.params,
                personId,
                overlay: "both",
              })
            }
          >
            <Icon name="map" />
            地図で重ねて見る
          </Action>
        </>
      )}
    </div>
  );
}
