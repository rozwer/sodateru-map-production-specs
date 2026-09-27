import { useEffect, useRef, useState } from "react";
import { ApiError, type FeatureRequest, type FeatureRequestCreate } from "../../../packages/api-client/index";
import { api } from "../../app/api";
import type { ScreenProps } from "../../app/contracts";
import { useSession } from "../../app/session";
import { useScreenState } from "../../app/useScreenState";
import { PluginStatus } from "../plugins/views";
import { FeatureRequestDeleteView, FeatureRequestEditorView, FeatureRequestListView } from "./views";
import { parseRequestTags, type FeatureRequestDraft, type FeatureRequestModel } from "./view-model";

const describe = (error: unknown) => error instanceof Error ? error.message : "通信に失敗しました。";
export function requestModel(item: FeatureRequest, personId: string): FeatureRequestModel {
  return {
    id: item.id, name: item.displayName, body: item.body, visibility: item.visibility,
    timestampLabel: new Date(item.updatedAt).toLocaleString("ja-JP"),
    owned: item.personId === personId, liked: item.myEmpathy, likeCount: item.empathyCount,
    tags: [...item.regionTags.map((label, index) => ({ id: `region-${index}`, label, icon: "place" as const })),
      ...item.purposeTags.map((label, index) => ({ id: `purpose-${index}`, label }))],
  };
}

export function RequestApiScreen(props: ScreenProps) {
  return props.route.pageId === "feature-request-edit" ? <RequestEditor {...props}/> : <RequestList {...props}/>;
}

function RequestList({ route, navigate, back, scopeKey, active = true }: ScreenProps) {
  const personId = useSession()?.session?.person.id || "";
  const [tab, setTab] = useScreenState<"public" | "drafts">(route.params.tab === "drafts" ? "drafts" : "public");
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [guideUrl, setGuideUrl] = useState<string>();
  const [selected, setSelected] = useState<FeatureRequest>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(route.params.saved === "1" ? "保存した内容を再取得しました。" : "");
  const [revision, refresh] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const query = { visibility: tab === "drafts" ? "private" as const : "public" as const, ...(tab === "drafts" ? { personId } : {}), limit: 20 };
  useEffect(() => {
    if (!active || !personId) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(""); setItems([]); setCursor(null); setSelected(undefined);
    void (async () => {
      try {
        if (route.params.deleteId) {
          const result = await api.request("getFeatureRequestsRequestId", { path: { requestId: route.params.deleteId }, signal: abort.signal });
          if (result.data.personId !== personId) throw new Error("本人の投稿だけ削除できます。");
          if (!abort.signal.aborted) setSelected(result.data);
        } else {
          const page = await api.request("getFeatureRequests", { query, signal: abort.signal });
          if (!abort.signal.aborted) { setItems(page.items); setCursor(page.nextCursor); }
        }
      } catch (problem) { if (!abort.signal.aborted) setError(describe(problem)); }
      finally { if (!abort.signal.aborted) setBusy(false); }
    })();
    void api.request("getFeatureRequestDevelopmentGuide", { signal: abort.signal }).then(result => {
      if (!abort.signal.aborted) setGuideUrl(result.data.url);
    }).catch(() => { /* A guide failure does not turn a saved list into an error. */ });
    return () => abort.abort();
  }, [scopeKey, personId, active, tab, revision, route.params.deleteId]);
  async function act(work: (signal: AbortSignal) => Promise<void>) {
    if (running.current || !controller.current || busy) return;
    running.current = true; setBusy(true); setError("");
    const signal = controller.current.signal;
    try { await work(signal); }
    catch (problem) { if (!signal.aborted) setError(describe(problem)); }
    finally { running.current = false; if (!signal.aborted) setBusy(false); }
  }
  const status = { busy, error, onRetry: () => refresh(value => value + 1) };
  if (route.params.deleteId && !selected) return <div className="request-page"><PluginStatus {...status}/><button type="button" className="request-button" onClick={back}>戻る</button></div>;
  if (route.params.deleteId) return <FeatureRequestDeleteView body={selected!.body}
    onCancel={back} onDelete={() => void act(async signal => {
      if (!selected) return;
      await api.request("deleteFeatureRequestsRequestId", { path: { requestId: selected.id }, version: selected.version, signal });
      if (!signal.aborted) navigate("feature-requests", { tab });
    })} {...status} busy={busy || !selected}/>;
  return <FeatureRequestListView items={items.map(item => requestModel(item, personId))} tab={tab}
    onTab={setTab} onWrite={() => navigate("feature-request-edit", { draftId: crypto.randomUUID() })}
    onEdit={requestId => navigate("feature-request-edit", { requestId })}
    onDelete={deleteId => navigate("feature-requests", { deleteId, tab })}
    onRequest={sourceId => navigate("feature-request-edit", { draftId: crypto.randomUUID(), sourceId })}
    onLike={id => void act(async signal => {
      const item = items.find(value => value.id === id); if (!item) return;
      const result = await api.request("patchFeatureRequestEmpathy", { path: { requestId: id }, body: { empathy: !item.myEmpathy }, version: item.version, signal });
      if (!signal.aborted) setItems(previous => previous.map(value => value.id === id ? result.data : value));
    })} guideUrl={guideUrl} more={Boolean(cursor)} onMore={() => void act(async signal => {
      if (!cursor) return;
      const page = await api.request("getFeatureRequests", { query: { ...query, cursor }, signal });
      if (!signal.aborted) { setItems(previous => [...previous.filter(item => !page.items.some(next => next.id === item.id)), ...page.items]); setCursor(page.nextCursor); }
    })} notice={notice} onDismissNotice={() => setNotice("")} {...status}/>;
}

type SaveAttempt = { body: FeatureRequestCreate; key: string; version?: number };
type EditorState = { value: FeatureRequestDraft; id: string; base: FeatureRequest | null; initialized: boolean; pending: SaveAttempt | null };
export function matchesAttempt(item: FeatureRequest, attempt: SaveAttempt) {
  return item.id === attempt.body.id && item.body === attempt.body.body && item.displayName === attempt.body.displayName && item.visibility === attempt.body.visibility
    && JSON.stringify(item.regionTags) === JSON.stringify(attempt.body.regionTags || [])
    && JSON.stringify(item.purposeTags) === JSON.stringify(attempt.body.purposeTags || []);
}
function RequestEditor({ route, navigate, scopeKey, active = true }: ScreenProps) {
  const personId = useSession()?.session?.person.id || "";
  const [state, setState] = useScreenState<EditorState>(() => ({
    value: { name: "", body: "", visibility: "private" }, id: route.params.requestId || crypto.randomUUID(), base: null, initialized: false, pending: null,
  }));
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, refresh] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  useEffect(() => {
    if (!active || !personId) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError("");
    void (async () => {
      try {
        const me = await api.request("getMe", { signal: abort.signal });
        if (route.params.requestId) {
          const result = await api.request("getFeatureRequestsRequestId", { path: { requestId: route.params.requestId }, signal: abort.signal });
          if (result.data.personId !== personId) throw new Error("本人の投稿だけ編集できます。");
          if (!abort.signal.aborted) setState(previous => previous.initialized ? previous : {
            ...previous, initialized: true, base: result.data, value: { name: result.data.displayName, body: result.data.body, visibility: result.data.visibility, regionTags: result.data.regionTags.join(", "), purposeTags: result.data.purposeTags.join(", ") },
          });
        } else {
          const source = route.params.sourceId ? await api.request("getFeatureRequestsRequestId", { path: { requestId: route.params.sourceId }, signal: abort.signal }) : null;
          if (!abort.signal.aborted) setState(previous => previous.initialized ? previous : {
            ...previous, initialized: true, value: { name: me.data.name, body: source?.data.body || "", visibility: "private", regionTags: source?.data.regionTags.join(", ") || "", purposeTags: source?.data.purposeTags.join(", ") || "" },
          });
        }
      } catch (problem) { if (!abort.signal.aborted) setError(describe(problem)); }
      finally { if (!abort.signal.aborted) setBusy(false); }
    })();
    return () => abort.abort();
  }, [scopeKey, personId, active, route.params.requestId, route.params.sourceId, revision]);
  function finish(item: FeatureRequest) {
    setState(previous => ({ ...previous, pending: null, base: item }));
    navigate("feature-requests", { tab: item.visibility === "private" ? "drafts" : "public", saved: "1" });
  }
  async function save(visibility: "private" | "public") {
    if (running.current || busy || !state.initialized || !controller.current) return;
    const signal = controller.current.signal;
    const attempt = state.pending || { key: crypto.randomUUID(), version: state.base?.version,
      body: { id: state.id, displayName: state.base?.displayName || state.value.name.trim(), body: state.value.body, visibility, regionTags: parseRequestTags(state.value.regionTags), purposeTags: parseRequestTags(state.value.purposeTags) } };
    if (Array.from(attempt.body.displayName).length > 20) { setError("表示名は20文字以内で入力してください。"); return; }
    if ([attempt.body.regionTags || [], attempt.body.purposeTags || []].some(tags => tags.length > 5 || tags.some(tag => Array.from(tag).length > 20))) {
      setError("タグはそれぞれ5件まで、各20文字以内で入力してください。"); return;
    }
    running.current = true; setBusy(true); setError(""); setState(previous => ({ ...previous, pending: attempt }));
    try {
      // A lost response can already have committed. Resolve it before replaying a PATCH.
      if (state.pending) {
        try {
          const current = await api.request("getFeatureRequestsRequestId", { path: { requestId: attempt.body.id }, signal });
          if (current.data.personId !== personId) throw new Error("本人の投稿だけ編集できます。");
          if (matchesAttempt(current.data, attempt)) { if (!signal.aborted) finish(current.data); return; }
        } catch (problem) { if (!(problem instanceof ApiError && problem.status === 404)) throw problem; }
      }
      if (attempt.version) {
        await api.request("patchFeatureRequestsRequestId", { path: { requestId: attempt.body.id }, body: { body: attempt.body.body, visibility: attempt.body.visibility, regionTags: attempt.body.regionTags, purposeTags: attempt.body.purposeTags }, version: attempt.version, signal });
      } else {
        await api.request("postFeatureRequests", { body: attempt.body, idempotencyKey: attempt.key, signal });
      }
      const saved = await api.request("getFeatureRequestsRequestId", { path: { requestId: attempt.body.id }, signal });
      if (!signal.aborted) finish(saved.data);
    } catch (problem) {
      if (signal.aborted) return;
      if (problem instanceof ApiError && [409, 412].includes(problem.status)) {
        try {
          const current = await api.request("getFeatureRequestsRequestId", { path: { requestId: state.id }, signal });
          if (current.data.personId !== personId) throw new Error("本人の投稿だけ編集できます。");
          if (matchesAttempt(current.data, attempt)) { finish(current.data); return; }
          setState(previous => ({ ...previous, base: current.data, pending: null }));
          setError(`ほかの画面で変更されています。現在の本文：${current.data.body}。入力は保持しました。内容を確認して再度保存してください。`);
        } catch (reloadError) { if (!signal.aborted) setError(describe(reloadError)); }
      } else {
        if (problem instanceof ApiError && problem.status >= 400 && problem.status < 500) setState(previous => ({ ...previous, pending: null }));
        setError(describe(problem));
      }
    } finally { running.current = false; if (!signal.aborted) setBusy(false); }
  }
  return <><p className="plugin-notice">{state.pending ? "送信した内容を保持しています。通信失敗時は同じ内容で再試行し、保存状況を確認します。" : "保存を確定するまで投稿は変更されません。"}</p>
    <FeatureRequestEditorView value={state.value} onChange={value => setState(previous => ({ ...previous, value }))}
      onSave={visibility => void save(visibility)} nameLocked={Boolean(state.base)} editing={Boolean(state.base)}
      showTags inputDisabled={Boolean(state.pending) || !state.initialized} busy={busy} error={error}
      onRetry={() => state.pending ? void save(state.pending.body.visibility) : refresh(value => value + 1)}/></>;
}
