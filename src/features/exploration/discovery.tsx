import { useState } from 'react';
import { ExploreStatus } from './views';
import './discovery.css';

// Layout follows rehearsal src/features/discovery/entry.tsx and styles.css.
export const discoveryMessages = {
  eyebrow: '新しい見方', title: '見方をひらく', savedTitle: '持ち帰った関心',
  description: '目の前の形から、少し違う知識へ。気づいた特徴を教えてください。',
  savedDescription: '気になった対象や、知っていたことを振り返れます。',
  target: '対象', place: '場所', building: '建物', photo: '写真', selectTarget: '対象を選ぶ',
  features: '気づいた具体的な特徴', featuresHint: '例: 赤と白の四角いタイルが、交互に並んでいる',
  inputNote: '入力した特徴から、出典のある知識へつなぎます。写真の内容や建物の歴史を自動で断定しません。',
  open: '見方をひらく', opening: '開いています…', viewSaved: '自分の関心を見返す',
  noSaved: 'まだ保存した発見はありません。', basedOnSources: '出典に基づく見方',
  cardTitle: 'この特徴から見えてくること', observed: '入力・登録された特徴',
  expand: '詳しく読む', knowledge: 'つながる知識', observation: 'ここで確かめてみる',
  general: '一般知識', specific: '対象の出典',
  known: '知っていた', interested: '気になる', saved: '保存', blocked: '表示しない', dismissed: '閉じる',
  displaySettings: '表示について', inferenceNote: '閲覧や保存から、性格・長期の好み・訪問済みを推測しません。',
  blockedAction: 'この発見を表示しない', selected: '選択してください',
};

export interface DiscoveryCardPresentation {
  id: string;
  anchor: { kind: 'place' | 'building' | 'photo'; targetId: string; features: string[] };
  bridge: string;
  knowledge: string;
  observationPrompt: string;
  conceptIds: string[];
  sources: { url: string | null; title: string; claimScope: 'general' | 'place-specific'; sourceId: string | null }[];
  createdAt: number;
}
export type DiscoveryReaction = 'known' | 'interested' | 'saved' | 'blocked' | 'dismissed';

export function DiscoveryView({ mode, kind, targetId, feature, targets, card, saved, busy, error, notice, onKind, onTarget, onFeature, onOpen, onSaved, onReopen, onReaction, onRetry }: {
  mode: 'explore' | 'saved'; kind: 'place' | 'building' | 'photo'; targetId: string; feature: string;
  targets: { id: string; label: string }[]; card: DiscoveryCardPresentation | null; saved: DiscoveryCardPresentation[];
  busy: boolean; error: string | null; notice: string | null;
  onKind: (kind: 'place' | 'building' | 'photo') => void; onTarget: (id: string) => void; onFeature: (feature: string) => void;
  onOpen: () => void; onSaved: () => void; onReopen: (id: string) => void; onReaction: (reaction: DiscoveryReaction) => void; onRetry: () => void;
}) {
  const m = discoveryMessages;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return <section className="discovery-panel" aria-label={mode === 'saved' ? m.savedTitle : m.title}><header><span>{m.eyebrow}</span><h2>{mode === 'saved' ? m.savedTitle : m.title}</h2><p>{mode === 'saved' ? m.savedDescription : m.description}</p></header>
    {mode === 'explore' && <><div className="discovery-target"><label>{m.target}<select value={kind} disabled={busy} onChange={e => onKind(e.target.value as typeof kind)}><option value="place">{m.place}</option><option value="building">{m.building}</option><option value="photo">{m.photo}</option></select></label><label>{m.selectTarget}<select value={targetId} disabled={busy} onChange={e => onTarget(e.target.value)}><option value="">{m.selected}</option>{targets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label><label>{m.features}<textarea value={feature} maxLength={300} onChange={e => onFeature(e.target.value)} placeholder={m.featuresHint} disabled={busy}/></label><p className="discovery-note">{m.inputNote}</p><button type="button" disabled={busy || !targetId || !feature.trim()} onClick={onOpen}>{busy ? m.opening : m.open}</button></div><button type="button" className="discovery-subtle" onClick={onSaved}>{m.viewSaved}</button></>}
    {mode === 'saved' && <div className="discovery-saved">{!saved.length && !busy && <p>{m.noSaved}</p>}{saved.map(item => <button type="button" key={item.id} onClick={() => onReopen(item.id)}><strong>{item.bridge}</strong><small>{new Date(item.createdAt).toLocaleDateString('ja-JP')}</small></button>)}</div>}
    {card && <article className="discovery-card"><span>{m.basedOnSources}</span><h3>{m.cardTitle}</h3><p>{card.bridge}</p><div className="discovery-observation"><strong>{m.observed}</strong><ul>{card.anchor.features.map((item, index) => <li key={index}>{item}</li>)}</ul></div>{expandedId !== card.id ? <button type="button" onClick={() => setExpandedId(card.id)}>{m.expand}</button> : <><h4>{m.knowledge}</h4><p>{card.knowledge}</p><h4>{m.observation}</h4><p>{card.observationPrompt}</p></>}<ul className="discovery-sources">{card.sources.map((source, index) => <li key={`${source.sourceId ?? index}:${source.title}`}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : source.title}（{source.claimScope === 'general' ? m.general : m.specific}）</li>)}</ul><div className="discovery-actions">{(['known','interested','saved','dismissed'] as const).map(reaction => <button type="button" key={reaction} disabled={busy} onClick={() => onReaction(reaction)}>{m[reaction]}</button>)}</div><details><summary>{m.displaySettings}</summary><p>{m.inferenceNote}</p><button type="button" disabled={busy} onClick={() => onReaction('blocked')}>{m.blockedAction}</button></details></article>}
    <ExploreStatus error={error} busy={busy} onRetry={onRetry}/>{notice && <p role="status">{notice}</p>}
  </section>;
}
