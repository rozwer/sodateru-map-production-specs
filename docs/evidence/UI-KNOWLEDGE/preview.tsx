import React, { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { MapBridge } from '../../../src/app/map-bridge';
import { KnowledgeFixtureMap } from './map-fixture';
import { KnowledgeDetailView, KnowledgeFilterView, KnowledgeListView, KnowledgePlaceView } from '../../../src/features/knowledge/views';
import { emptyFilters, type KnowledgeAreaOption, type KnowledgeFilters, type KnowledgeKind, type KnowledgeRecord } from '../../../src/features/knowledge/types';

// Explicit UI-only inputs. This harness does not assert HTTP/DB completion.
const records: KnowledgeRecord[] = [
  { id: 'fixture-cafe', person: { id: 'fixture-midori', displayName: 'みどり', iconPath: './assets/generated-park.png' }, kind: 'experience', body: '静かな時間が流れるお気に入りのカフェ\n駅から少し歩いたところにある落ち着いたカフェ。大きな窓から緑が見えて、ひと息つくのにぴったりです。', place: { id: 'fixture-motoyama', name: '本山1丁目', address: null, coordinates: [136.9638,35.1668] }, effectiveAt: new Date('2024-05-12T14:20:00+09:00').getTime(), endedAt: null, timePrecision: 'exact', visitStatus: null, purposes: ['カフェ'], impression: '', topicKey: 'fixture-rest', visibility: 'public', version: 1, sourceRefs: [], media: [{ id: 'fixture-missing', kind: 'photo', mimeType: 'image/jpeg', byteSize: 1, position: 0, status: 'ready', contentUrl: './assets/generated-cafe.png' }] },
  { id: 'fixture-park', person: { id: 'fixture-takashi', displayName: 'たかし', iconPath: './assets/generated-park.png' }, kind: 'experience', body: '木陰でリフレッシュできる散歩コース\n東山公園に続く緑道。季節の花を眺めながら歩くと、気持ちがすっきりします。ベンチもあって休憩にぴったり。週末は家族連れも多く、のんびりした雰囲気です。', place: { id: 'fixture-higashiyama', name: '東山公園', address: null, coordinates: [136.973,35.1605] }, effectiveAt: new Date('2024-05-10T09:15:00+09:00').getTime(), endedAt: null, timePrecision: 'exact', visitStatus: null, purposes: ['散歩'], impression: '', topicKey: 'fixture-experience', visibility: 'public', version: 1, sourceRefs: [], media: [{ id: 'fixture-video', kind: 'video', mimeType: 'video/mp4', byteSize: 1, position: 0, status: 'ready', contentUrl: './assets/generated-park-test.mp4' }] },
];
const initialFilters: KnowledgeFilters = { ...emptyFilters, areaText: '本山', center: [136.9638,35.1668], radiusM: 1000, purpose: 'rest', period: 'week' };
const timeZone = 'Asia/Tokyo';
function Preview() {
  const mapRef = useRef<MapBridge | null>(null);
  const setMap = useCallback((bridge: MapBridge) => { mapRef.current = bridge; }, []);
  const [query, setQuery] = useState('本山');
  const [kind, setKind] = useState<KnowledgeKind>('rest-tip');
  const [filters, setFilters] = useState(initialFilters);
  const [bookmarks, setBookmarks] = useState(new Set<string>());
  const [page, setPage] = useState('list');
  const [selected, setSelected] = useState(records[1]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [areas, setAreas] = useState<KnowledgeAreaOption[]>([]);
  const matching = records.filter(record => record.body.includes(search) || record.place?.name.includes(search));
  const people = records.map(record => ({ id: record.person.id, name: record.person.displayName, bio: 'この地域の体験を投稿しています（テスト応答）', avatarUrl: record.person.iconPath })).filter(person => person.name.includes(search));
  const list = <KnowledgeListView query={query} onQuery={setQuery} onSearch={() => setSearch(query)} onClear={() => { setQuery(''); setSearch(''); }} kind={kind} onKind={setKind} records={matching} people={people} totalCount={kind === 'people' ? people.length : matching.length} heading={`${filters.areaText || 'すべての地域'} 周辺 ${filters.radiusM ? filters.radiusM / 1000 : ''}km の声`} timeZone={timeZone} center={[136.9609,35.1664]} onLoadMore={() => {}} onRetry={() => {}} onBack={() => setMessage('戻る')} onFilter={() => setPage('filter')} onMap={() => setPage('place')} onOpen={id => { setSelected(records.find(record => record.id === id)!); setPage('detail'); }} onPerson={id => setMessage(`人物:${id}`)} bookmarks={bookmarks} onBookmark={id => setBookmarks(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; })} topicLabels={{ 'fixture-rest': '休憩チップ', 'fixture-experience': '体験' }} />;
  const filter = <KnowledgeFilterView key={JSON.stringify(filters)} initial={filters} onApply={value => { setFilters(value); setPage('list'); setMessage('条件を適用しました（テスト応答）'); }} onClose={() => setPage('list')} areas={areas} onAreaSearch={text => { setAreas([{ id: "fixture-area", name: text, coordinates: [136.908,35.169] }]); setMessage(`地域検索:${text}（テスト応答）`); }} onUseMapBounds={() => { const bounds = mapRef.current?.getSnapshot().camera.bounds; return bounds ? [...bounds[0], ...bounds[1]] : null; }} map={draft => <KnowledgeFixtureMap filters={draft} onReady={setMap} />} />;
  const detail = <KnowledgeDetailView record={selected} timeZone={timeZone} center={[136.9638,35.1668]} onBack={() => setPage('list')} onPlace={id => setMessage(`場所:${id}`)} onAuthor={id => setMessage(`作者:${id}`)} onSource={() => setMessage('原文の出典確認（API未接続）')} topicLabel="体験" />;
  const place = <KnowledgePlaceView name="本山の小さな公園" records={records} totalCount={2} timeZone={timeZone} onClose={() => setPage('list')} onVoices={() => setPage('list')} onOpen={id => { setSelected(records.find(record => record.id === id)!); setPage('detail'); }} />;
  return <><div className="preview-label" role="status">UI確認用テスト応答・実API/保存/画像一致は未確認{message && ` — ${message}`}</div><div className="preview-columns"><div className={`preview-frame ${page === 'list' || page === 'place' ? 'is-active' : ''}`}>{page === 'place' ? place : list}</div><div className={`preview-frame ${page === 'filter' ? 'is-active' : ''}`}>{filter}</div><div className={`preview-frame ${page === 'detail' ? 'is-active' : ''}`}>{detail}</div></div></>;
}
if (new URLSearchParams(location.search).get('textScale') === '2') document.documentElement.style.fontSize = '32px';
const style = document.createElement('style');
style.textContent = '.knowledge-condition-map-preview{width:100%;height:100%}.knowledge-condition-map-preview .map-scene{height:100%}body{background:#f9fefe}.preview-label{font:13px system-ui;color:#715421;text-align:center;padding:10px}.preview-columns{display:grid;grid-template-columns:repeat(3,minmax(0,440px));gap:38px;max-width:1396px;margin:16px auto 30px;padding:0 1px}.preview-frame{border:1px solid #d1e3e7;border-radius:16px;box-shadow:0 3px 10px #295e6610;overflow:hidden;background:white;min-width:0}.preview-frame>.knowledge-panel{padding:20px 18px;min-height:100%}@media(max-width:800px){.preview-columns{display:block;margin:0;padding:0}.preview-frame{border:0;border-radius:0;display:none}.preview-frame.is-active{display:block}.preview-frame>.knowledge-panel{padding:18px 16px}.preview-label{font-size:11px;padding:4px}}';
document.head.append(style);
createRoot(document.getElementById('root')!).render(<Preview />);
