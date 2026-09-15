import { useEffect, useRef, useState } from 'react';
import type { CommonAISourceRef, DiscoveryCard, Message } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { DiscoveryView, type DiscoveryReaction, discoveryMessages } from './discovery';
import { cancelMessage, newId, placePresentation, waitMessage } from './api';
import { useExplorationFlow, useScreenRequest } from './screen-support';
import type { PlacePresentation } from './view-types';

type Target = { id: string; label: string; kind: 'place' | 'building' | 'photo'; ref: CommonAISourceRef; place: PlacePresentation | null };
type DiscoveryState = { kind: Target['kind']; targetId: string; feature: string; mode: 'explore' | 'saved'; card: DiscoveryCard | null; saved: DiscoveryCard[]; notice: string | null };
type Attempt = { key: string; conversationId: string; userMessageId: string; assistantMessageId: string; cardId: string; conversationCreated: boolean; message?: Message; retryKey?: string };

export function DiscoveryScreen({ route, active = true, navigate }: ScreenProps) {
  const [state, setState] = useScreenState<DiscoveryState>({ kind: route.params.kind === 'building' || route.params.kind === 'photo' ? route.params.kind : 'place', targetId: route.params.targetId ?? route.params.placeId ?? '', feature: '', mode: 'explore', card: null, saved: [], notice: null });
  const [targets, setTargets] = useState<Target[]>([]);
  const { flow } = useExplorationFlow();
  const request = useScreenRequest(active);
  const attempt = useRef<Attempt | null>(null);
  const reactionAttempt = useRef<{ cardId: string; reaction: DiscoveryReaction; id: string } | null>(null);
  const lastAction = useRef<() => void>(() => {});
  const change = (patch: Partial<DiscoveryState>) => setState(previous => ({ ...previous, ...patch }));

  const loadTargets = () => request.run(async signal => {
    const [places, records] = await Promise.all([
      api.request('getPlaces', { query: { limit: 100 }, signal }),
      api.request('getRecords', { query: { limit: 30 }, signal }),
    ]);
    const result: Target[] = places.items.map(place => ({ id: place.id, label: place.name, kind: 'place', ref: { type: 'place', id: place.id, version: place.version }, place: placePresentation(place) }));
    for (const place of places.items) if (place.buildingKey && !result.some(target => target.kind === 'building' && target.id === place.buildingKey)) result.push({ id: place.buildingKey, label: `${place.name}の建物`, kind: 'building', ref: { type: 'place', id: place.id, version: place.version }, place: placePresentation(place) });
    const details = await Promise.allSettled(records.items.map(record => api.request('getRecordsRecordId', { path: { recordId: record.id }, signal })));
    for (const detail of details) if (detail.status === 'fulfilled' && detail.value.data.media.status === 'ready') {
      const record = detail.value.data.record;
      for (const media of detail.value.data.media.data.items) if (media.kind === 'photo' && media.status === 'ready') result.push({ id: media.id, label: record.body.slice(0, 50) || '記録の写真', kind: 'photo', ref: { type: 'record', id: record.id, version: record.version }, place: null });
    }
    return result;
  }, setTargets);
  useEffect(() => { if (active && !targets.length) void loadTargets(); }, [active]);
  useEffect(() => {
    const cancel = () => { const pending = attempt.current; if (pending?.conversationCreated) void cancelMessage(api, pending.assistantMessageId, `cancel-${pending.assistantMessageId}`).catch(() => {}); };
    if (!active) cancel();
    return () => { cancel(); };
  }, [active]);

  const generate = async (feature: string, target: Target, parentSignal?: AbortSignal) => {
    const key = `${target.kind}:${target.id}:${feature}`;
    if (!attempt.current || attempt.current.key !== key) attempt.current = { key, conversationId: newId(), userMessageId: newId(), assistantMessageId: newId(), cardId: newId(), conversationCreated: false };
    const current = attempt.current;
    await request.run(async signal => {
      const facts = await api.request('getDiscoveryFacts', { query: { kind: target.kind, targetId: target.id }, signal });
      if (!facts.items.length) throw new Error('この対象で使える出典がまだありません。対象を変えるか、後でもう一度お試しください。');
      if (!current.conversationCreated) {
        await api.request('postConversations', { body: { id: current.conversationId, purpose: 'consult', title: `見方をひらく: ${target.label}`.slice(0, 200), recordId: null }, idempotencyKey: current.conversationId, signal });
        current.conversationCreated = true;
      }
      if (!current.message) {
        const { data } = await api.request('postConversationsConversationIdMessages', { path: { conversationId: current.conversationId }, body: { userMessageId: current.userMessageId, assistantMessageId: current.assistantMessageId, body: feature, use: 'discovery', context: { anchor: { kind: target.kind, targetId: target.id, features: [feature] }, factKeys: facts.items.map(fact => fact.factKey) }, expectedRefs: [target.ref] }, idempotencyKey: current.userMessageId, signal });
        current.message = data.assistantMessage;
      } else if (['failed', 'cancelled'].includes(current.message.status)) {
        current.retryKey ??= newId();
        current.message = (await api.request('postMessagesMessageIdRetry', { path: { messageId: current.message.id }, body: { attempt: current.message.attempt }, version: current.message.version, idempotencyKey: current.retryKey, signal })).data.message;
        current.retryKey = undefined;
      }
      const result = await waitMessage(api, current.assistantMessageId, signal, message => { current.message = message; });
      if (result.message.status !== 'complete' || result.output?.use !== 'discovery') throw new Error(result.run?.error?.message ?? '発見を作成できませんでした。入力は残しています。');
      return (await api.request('postDiscoveryCards', { body: { id: current.cardId, assistantMessageId: current.assistantMessageId, expectedAttempt: result.message.attempt }, idempotencyKey: current.cardId, signal })).data;
    }, card => { change({ card, feature, mode: 'explore', notice: null }); attempt.current = null; }, parentSignal);
  };
  const open = () => {
    lastAction.current = open;
    const target = targets.find(target => target.kind === state.kind && target.id === state.targetId);
    if (!target || !state.feature.trim()) { request.setError('対象と、気づいた特徴を入力してください。'); return; }
    void request.run(signal => api.request('getMeSettings', { signal }), ({ data: settings }) => {
      const locationNeeded = target.kind !== 'photo';
      const recordsNeeded = target.kind === 'photo';
      if (!settings.ai.enabled || (locationNeeded && !settings.ai.allowLocation) || (recordsNeeded && !settings.ai.allowRecords)) {
        const origin = target.place ? { kind: 'selected' as const, label: target.label, coordinates: target.place.coordinates } : null;
        flow.setConsent({ text: state.feature, place: target.place, origin, settings, recordsRequired: recordsNeeded, returnPage: 'discovery', cancel: confirmed => change({ feature: confirmed.text, ...(target.place && !confirmed.place ? { targetId: '' } : {}) }), send: async (confirmed, signal) => {
          if (target.place && !confirmed.place) { change({ targetId: '', feature: confirmed.text }); request.setError('対象を外しました。別の対象を選んでください。'); return; }
          change({ feature: confirmed.text });
          let selectedTarget = target;
          if (confirmed.place && confirmed.place.id !== target.place?.id) {
            const { data } = await api.request('getPlacesPlaceId', { path: { placeId: confirmed.place.id }, signal });
            selectedTarget = { id: data.place.id, kind: 'place', label: data.place.name, ref: { type: 'place', id: data.place.id, version: data.place.version }, place: confirmed.place };
            change({ kind: 'place', targetId: data.place.id });
          }
          await generate(confirmed.text, selectedTarget, signal);
        } });
        navigate('ai-consent');
      } else void generate(state.feature, target);
    });
  };
  const saved = () => {
    lastAction.current = saved;
    void request.run(signal => api.request('getDiscoveryCards', { query: { limit: 100, savedOnly: true }, signal }), page => change({ mode: 'saved', saved: page.items, card: null, notice: null }));
  };
  const reopen = (cardId: string) => {
    lastAction.current = () => reopen(cardId);
    void request.run(signal => api.request('getDiscoveryCardsCardId', { path: { cardId }, signal }), ({ data: card }) => change({ card }));
  };
  const react = (reaction: DiscoveryReaction) => {
    const card = state.card; if (!card) return;
    lastAction.current = () => react(reaction);
    if (reactionAttempt.current?.cardId !== card.id || reactionAttempt.current?.reaction !== reaction) reactionAttempt.current = { cardId: card.id, reaction, id: newId() };
    const id = reactionAttempt.current.id;
    void request.run(signal => api.request('postDiscoveryCardsCardIdReactions', { path: { cardId: card.id }, body: { id, reaction }, idempotencyKey: id, signal }), () => {
      reactionAttempt.current = null;
      change({ notice: `「${discoveryMessages[reaction]}」を保存しました。`, ...(['blocked', 'dismissed'].includes(reaction) ? { card: null, saved: state.saved.filter(item => item.id !== card.id) } : {}) });
    });
  };
  return <DiscoveryView {...state} targets={targets.filter(target => target.kind === state.kind)} busy={request.busy} error={request.error} onKind={kind => change({ kind, targetId: '', card: null })} onTarget={targetId => change({ targetId, card: null })} onFeature={feature => change({ feature })} onOpen={open} onSaved={saved} onExplore={() => change({ mode: 'explore', card: null })} onReopen={reopen} onReaction={react} onRetry={() => lastAction.current()}/>;
}
