import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommonAIOrigin, CommunityBookmark } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { Chat, type ChatMessage } from '../../ui/Chat';
import { MapPreview } from '../../map/MapPreview';
import { ExploreIcon } from './ExploreIcon';
import { AiConsentView, CandidateCard, ConsultationIntroduction, ConversationHistoryView, ExploreStatus, MistDetailView, QuestCompassView, VoiceConsultationView } from './views';
import { useBrowserSpeech } from './browser-speech';
import { useCompassLocation } from './device';
import { historyPresentation, newId, placePresentation, readMessages, readPlace } from './api';
import { useExplorationFlow, useExplorationTarget, useScreenRequest } from './screen-support';
import type { HistoryPresentation, PlacePresentation } from './view-types';
import { DiscoveryScreen } from './discovery-screen';
import { ConsentPlacePicker } from './place-picker';

function ExploreScreen({ route, navigate, active = true }: ScreenProps) {
  const { flow, state, bridge } = useExplorationFlow();
  const request = useScreenRequest(active);
  const [photos, setPhotos] = useState<Record<string, PlacePresentation>>({});
  const conversationId = route.params.conversationId;
  useEffect(() => { if (active && conversationId && conversationId !== state.conversationId) void flow.open(conversationId); }, [active, conversationId, flow]);
  useEffect(() => { if (!active && state.busy) void flow.cancel(); }, [active, flow]);
  useEffect(() => {
    const result = state.result;
    if (!result) { bridge.clear('map-dialogue'); return; }
    bridge.clear('map-dialogue');
    bridge.showCandidates('map-dialogue', { resultId: result.resultId, candidates: result.places.map((place, index) => ({ id: place.candidateId, coordinates: place.coordinates, label: place.name, number: index + 1 })), selectedCandidateId: state.selectedId ?? undefined, expiresAt: result.expiresAt });
    const preview = result.routes[0];
    if (preview) bridge.showRoute('map-dialogue', { previewId: preview.previewId, geometry: preview.geometry, waypoints: preview.waypoints.map((point, index) => ({ id: point.placeId ?? `${preview.previewId}:${index}`, coordinates: point.coordinates, label: point.name })) });
  }, [bridge, state.result, state.selectedId]);
  useEffect(() => bridge.onSelect('map-dialogue', selection => { if (selection.kind === 'candidate' && selection.id !== flow.getSnapshot().selectedId && !flow.getSnapshot().busy) void flow.select(selection.id); }), [bridge, flow]);
  useEffect(() => {
    if (!active || !state.result) return;
    const controller = new AbortController();
    for (const candidate of state.result.places) if (candidate.placeId) void readPlace(api, candidate.placeId, controller.signal).then(place => { if (!controller.signal.aborted) setPhotos(previous => ({ ...previous, [candidate.candidateId]: place })); }).catch(() => { /* The card retains its explicit unavailable-photo state. */ });
    return () => controller.abort();
  }, [active, state.result]);
  const send = () => request.run(async () => {
    const camera = bridge.getSnapshot().camera, current = flow.getSnapshot();
    const origin: CommonAIOrigin = current.origin ?? { coordinates: [camera.longitude, camera.latitude], kind: 'map-center', label: '地図の中心' };
    const settings = await flow.prepare(origin);
    if (!settings.ai.enabled || !settings.ai.allowLocation) {
      flow.setConsent({ text: current.draft, place: current.selectedPlace, origin, returnPage: 'ai-explore', settings, send: flow.send });
      navigate('ai-consent');
    } else await flow.send();
  }, () => {});
  const messages: ChatMessage[] = state.messages.map(message => ({ id: message.id, role: message.role, content: message.body, status: ['pending', 'running'].includes(message.status) ? 'pending' : message.status === 'failed' ? 'error' : 'complete' }));
  if (state.result && !messages.length) messages.push({ id: 'current-user', role: 'user', content: state.draft }, { id: state.result.resultId, role: 'assistant', content: state.result.text });
  const searchAgain = () => { flow.setDraft(state.messages.filter(message => message.role === 'user').at(-1)?.body ?? state.draft); void send(); };
  return <div className="explore-screen explore-consultation"><ConsultationIntroduction/>{state.origin && <p className="explore-muted">相談の起点: {state.origin.label}</p>}{state.notice && <p role="status" className="explore-status">{state.notice}</p>}
    <Chat messages={messages} value={state.draft} onChange={flow.setDraft} onSend={() => void send()} busy={state.busy || request.busy} error={state.error ?? request.error} onCancel={() => void flow.cancel()} onRetry={() => void flow.retry()} toolbar={<><button className="explore-icon-button" type="button" aria-label="声で相談する" onClick={() => navigate('voice-consultation')}><ExploreIcon name="mic"/></button><button className="explore-icon-button" type="button" aria-label="相談履歴" onClick={() => navigate('conversation-history')}><ExploreIcon name="clock"/></button></>}>
      {state.result?.places.map((candidate, index) => <CandidateCard key={candidate.candidateId} place={{ ...placePresentation(candidate), ...photos[candidate.candidateId], id: candidate.candidateId }} index={index} selected={state.selectedId === candidate.candidateId} expired={false} busy={state.busy} mapPreview={active && index === 0 ? <MapPreview bridge={bridge} label="相談候補の経路"/> : undefined} onShowMap={() => { void flow.select(candidate.candidateId).then(() => { if (flow.getSnapshot().selectedId === candidate.candidateId && !flow.getSnapshot().error) { bridge.focus('map-dialogue', { center: candidate.coordinates, zoom: 16 }); navigate('map'); } }); }} onDetail={() => navigate('mist-detail', { resultId: state.result!.resultId, candidateId: candidate.candidateId })} onSearchAgain={searchAgain}/>)}
      {!state.result && state.messages.length > 0 && !state.busy && <button className="explore-button explore-button--outline" type="button" onClick={searchAgain}>この相談でもう一度探す</button>}
      {state.result && !state.result.places.length && <p className="explore-empty">条件に合う候補が見つかりませんでした。条件を変えて探せます。</p>}
    </Chat>
  </div>;
}

function VoiceScreen({ navigate, active = true }: ScreenProps) {
  const { flow, state, bridge } = useExplorationFlow();
  const onTranscript = useCallback((text: string) => flow.setDraft(text), [flow]);
  const recorder = useBrowserSpeech(onTranscript);
  const request = useScreenRequest(active);
  useEffect(() => { if (!active) recorder.cancel(); }, [active, recorder.cancel]);
  const send = () => request.run(async () => {
    const camera = bridge.getSnapshot().camera;
    const origin = state.origin ?? { coordinates: [camera.longitude, camera.latitude] as [number, number], kind: 'map-center' as const, label: '地図の中心' };
    const settings = await flow.prepare(origin);
    if (!settings.ai.enabled || !settings.ai.allowLocation) { flow.setConsent({ text: state.draft, place: state.selectedPlace, origin, returnPage: 'voice-consultation', settings, send: flow.send }); navigate('ai-consent'); }
    else { navigate('ai-explore'); await flow.send(); }
  }, () => {});
  return <><VoiceConsultationView voice={{ ...recorder, transcript: state.draft, error: recorder.error ?? request.error }} onStart={() => void recorder.start()} onStop={recorder.stop} onChange={flow.setDraft} onClear={() => flow.setDraft('')} onSend={() => void send()} onRetry={recorder.retry}/><p className="explore-muted">音声認識にはブラウザのサービスを使います。認識した文章を確認して送るまで、このアプリのAIには送信しません。</p></>;
}

function ConsentScreen({ navigate, active = true }: ScreenProps) {
  const { flow, state, bridge } = useExplorationFlow();
  const draft = state.consent;
  const [enabled, setEnabled] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [recordsAllowed, setRecordsAllowed] = useState(false);
  const [pickingPlace, setPickingPlace] = useState(false);
  const request = useScreenRequest(active);
  useEffect(() => { setEnabled(draft?.settings.ai.enabled ?? false); setLocationAllowed(draft?.settings.ai.allowLocation ?? false); setRecordsAllowed(draft?.settings.ai.allowRecords ?? false); }, [draft?.settings.version]);
  if (!draft) return <div className="explore-screen"><p className="explore-status">送信前の本文が見つかりません。相談画面からやり直してください。</p><button className="explore-button" onClick={() => navigate('ai-explore')}>相談画面へ</button></div>;
  const cancel = () => { draft.cancel?.({ text: draft.text, place: draft.place, origin: draft.origin }); if (['ai-explore', 'voice-consultation'].includes(draft.returnPage)) { flow.setDraft(draft.text); flow.setSelectedPlace(draft.place); if (draft.origin) flow.setOrigin(draft.origin); } const returnPage = draft.returnPage; flow.setConsent(null); navigate(returnPage); };
  const send = () => request.run(async signal => {
    if (draft.origin && !locationAllowed) throw new Error('相談の起点を送る場合は、位置情報の利用を選択してください。');
    if (draft.recordsRequired && !recordsAllowed) throw new Error('選んだ記録を使う場合は、記録の利用を選択してください。');
    const { data } = await api.request('patchMeSettings', { body: { ai: { ...draft.settings.ai, enabled, allowLocation: locationAllowed, allowRecords: recordsAllowed } }, version: draft.settings.version, signal });
    if (!data.ai.enabled) throw new Error('AI利用設定を確認してください。');
    if (['ai-explore', 'voice-consultation'].includes(draft.returnPage)) { flow.setDraft(draft.text); flow.setSelectedPlace(draft.place); }
    if (draft.origin) flow.setOrigin(draft.origin);
    const action = draft.send;
    const abort = () => { if (['ai-explore', 'voice-consultation'].includes(draft.returnPage)) void flow.cancel(); };
    signal.addEventListener('abort', abort, { once: true });
    try { await action({ text: draft.text, place: draft.place, origin: draft.origin }, signal); }
    finally { signal.removeEventListener('abort', abort); }
    signal.throwIfAborted();
    flow.setConsent(null);
    navigate(draft.returnPage === 'voice-consultation' ? 'ai-explore' : draft.returnPage);
  }, () => {});
  return <><AiConsentView textLimit={draft.textLimit} text={draft.text} enabled={enabled} place={draft.place} busy={request.busy} error={request.error} onText={text => flow.updateConsent({ text })} onEnable={setEnabled} onChangePlace={() => setPickingPlace(true)} onRemovePlace={() => { const camera = bridge.getSnapshot().camera; flow.updateConsent({ origin: { coordinates: [camera.longitude, camera.latitude], label: '地図の中心', kind: 'map-center' }, place: null }); }} placePicker={pickingPlace ? <ConsentPlacePicker onSelect={place => { flow.updateConsent({ place, origin: { coordinates: place.coordinates, label: place.name, kind: 'selected' } }); setPickingPlace(false); }} onCenter={() => { const camera = bridge.getSnapshot().camera; flow.updateConsent({ place: null, origin: { coordinates: [camera.longitude, camera.latitude], label: '地図の中心', kind: 'map-center' } }); setPickingPlace(false); }} onClose={() => setPickingPlace(false)}/> : undefined} onCancel={cancel} onSend={() => void send()} permissions={<>{draft.sourceSummary && <aside className="explore-card"><h3>利用する元の体験</h3><ul>{draft.sourceSummary.map((text, index) => <li key={index}>{text}</li>)}</ul></aside>}{draft.origin && <aside className="explore-card explore-location-consent"><p>送信する起点: {draft.origin.label}（{draft.origin.coordinates[1].toFixed(5)}, {draft.origin.coordinates[0].toFixed(5)}）</p><label className="explore-switch"><span>相談に位置情報を使う</span><input type="checkbox" checked={locationAllowed} onChange={event => setLocationAllowed(event.target.checked)} disabled={request.busy}/></label></aside>}{draft.recordsRequired && <aside className="explore-card"><label className="explore-switch"><span>選んだ記録をAIに使う</span><input type="checkbox" checked={recordsAllowed} onChange={event => setRecordsAllowed(event.target.checked)} disabled={request.busy}/></label></aside>}</>}/></>;
}

function HistoryScreen({ navigate, active = true }: ScreenProps) {
  const { flow } = useExplorationFlow();
  const [state, setState] = useScreenState<{ query: string; items: HistoryPresentation[]; cursor: string | null }>({ query: '', items: [], cursor: null });
  const request = useScreenRequest(active);
  const load = (more = false) => request.run(async signal => {
    const page = await api.request('getConversations', { query: { purpose: 'consult', limit: 30, cursor: more ? state.cursor ?? undefined : undefined }, signal });
    const details = await Promise.allSettled(page.items.map(conversation => readMessages(api, conversation.id, signal)));
    return { items: page.items.map((conversation, index) => historyPresentation(conversation, details[index]?.status === 'fulfilled' ? (details[index] as PromiseFulfilledResult<Awaited<ReturnType<typeof readMessages>>>).value : [])), cursor: page.nextCursor };
  }, value => setState(previous => ({ ...previous, items: more ? [...previous.items, ...value.items] : value.items, cursor: value.cursor })));
  useEffect(() => { if (active) void load(); }, [active]);
  const query = state.query.normalize('NFKC').toLocaleLowerCase();
  return <ConversationHistoryView conversations={state.items.filter(item => `${item.title} ${item.preview}`.normalize('NFKC').toLocaleLowerCase().includes(query))} query={state.query} busy={request.busy} error={request.error} hasMore={state.cursor !== null} onSearch={query => setState(previous => ({ ...previous, query }))} onOpen={conversationId => { navigate('ai-explore', { conversationId }); void flow.open(conversationId); }} onNew={() => { flow.beginNew(); navigate('ai-explore'); }} onMore={() => void load(true)} onRetry={() => void load()}/>;
}

function MistScreen(props: ScreenProps) {
  const target = useExplorationTarget(props);
  const [bookmark, setBookmark] = useState<CommunityBookmark | null>(null);
  const mutation = useScreenRequest(props.active);
  const bookmarkKey = useRef(newId());
  const placeId = props.route.params.placeId ?? target.suggestion?.placeId;
  const candidateId = props.route.params.candidateId, resultId = props.route.params.resultId;
  useEffect(() => { if (props.active !== false) void mutation.run(signal => api.request('getBookmarks', { signal }), page => { setBookmark(page.items.find(item => item.target.type === 'place' ? item.target.id === placeId : item.target.type === 'candidate' && item.target.resultId === resultId && item.target.candidateId === candidateId) ?? null); }); }, [props.active, placeId, candidateId, resultId]);
  if (!target.place) return <div className="explore-screen"><ExploreStatus busy={target.busy} error={target.error} onRetry={() => void target.reload()}/></div>;
  const onBookmark = () => mutation.run(async signal => {
    if (bookmark) { await api.request('deleteBookmarksBookmarkId', { path: { bookmarkId: bookmark.id }, version: bookmark.version, signal }); return null; }
    const selection = placeId ? { type: 'place' as const, id: placeId } : resultId && candidateId ? { type: 'candidate' as const, resultId, candidateId } : null;
    if (!selection) throw new Error('しおりに必要な候補情報がありません。もう一度探してください。');
    return (await api.request('postBookmarks', { body: { id: bookmarkKey.current, target: selection }, idempotencyKey: bookmarkKey.current, signal })).data;
  }, value => { setBookmark(value); bookmarkKey.current = newId(); });
  return <MistDetailView place={target.place} bookmarked={bookmark !== null} expired={target.suggestion ? target.suggestion.expiresAt <= Date.now() : false} busy={target.busy || mutation.busy} error={target.error ?? mutation.error} mapPreview={props.active !== false && <MapPreview bridge={target.bridge} label="候補の場所"/>} onBookmark={() => void onBookmark()} onWalk={() => props.navigate('route-conditions', { ...props.route.params, ...(resultId ? { dialogueResultId: resultId } : placeId ? { destinationPlaceId: placeId } : {}), mode: 'walking' })} onCompass={() => props.navigate('quest-compass', props.route.params)} onSearchAgain={() => props.navigate('ai-explore')} onRetry={() => void target.reload()}/>;
}

function CompassScreen(props: ScreenProps) {
  const target = useExplorationTarget(props);
  const compass = useCompassLocation(props.active !== false);
  if (!target.place) return <div className="explore-screen"><ExploreStatus busy={target.busy} error={target.error} onRetry={() => void target.reload()}/></div>;
  return <QuestCompassView place={target.place} {...compass} mapPreview={props.active !== false && <MapPreview bridge={target.bridge} label="目的地と周辺"/>} onEnableHeading={() => void compass.enableHeading()} onRoute={() => props.navigate('route-conditions', { ...props.route.params, ...(props.route.params.resultId ? { dialogueResultId: props.route.params.resultId } : {}), mode: 'walking' })} onEnd={() => { target.bridge.clear('suggestion'); props.back(); }}/>;
}

export const screens: ScreenDefinition[] = [
  { id: 'ai-explore', title: '街を探索', component: ExploreScreen },
  { id: 'voice-consultation', title: '声で相談する', component: VoiceScreen },
  { id: 'ai-consent', title: 'AI利用の選択', component: ConsentScreen },
  { id: 'conversation-history', title: '街を探索', component: HistoryScreen },
  { id: 'mist-detail', title: 'もやの候補', component: MistScreen },
  { id: 'quest-compass', title: 'クエストコンパス', component: CompassScreen },
  { id: 'discovery', title: '見方をひらく', component: DiscoveryScreen },
].map(screen => ({ ...screen, layout: { contentPadding: 'none' as const, header: 'back' as const, bottomNav: false, background: 'soft' as const } }));
