import { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../../src/app/App';
import { api } from '../../../src/app/api';
import type { LocalProfile, Person } from '../../../packages/api-client/index';
import type { MapBridge } from '../../../src/app/map-bridge';
import { screens as mapScreens, MapToolbar } from '../../../src/features/map/screens';
import { screens as activityScreens } from '../../../src/features/activity/screens';

const themeId = '29820000-0000-4000-8000-000000000001';
const cases = [
  { label: '日時あり・初回20件外', placeId: '29800000-0000-4000-8000-000000000001', recordId: '29810000-0000-4000-8000-000000000001', occurredAt: Date.parse('2026-09-25T03:00:00Z') },
  { label: '別の場所・日時あり', placeId: '29800000-0000-4000-8000-000000000002', recordId: '29810000-0000-4000-8000-000000000002', occurredAt: Date.parse('2026-09-25T04:00:00Z') },
  { label: '日時未設定', placeId: '29800000-0000-4000-8000-000000000003', recordId: '29810000-0000-4000-8000-000000000003', occurredAt: null },
] as const;
const recordBody = (label: string) => `UI-MAP-RECORD-LINK 確認用: ${label}`;

async function seed() {
  for (const [index, item] of cases.entries()) {
    await api.request('postPlaces', { body: { id: item.placeId, mode: 'manual', name: item.label, position: { longitude: 139.76 + index * .01, latitude: 35.68 + index * .01 }, address: 'ローカル確認用', buildingKey: null }, idempotencyKey: item.placeId });
    await api.request('postRecords', { body: { id: item.recordId, kind: 'experience', visitId: null, placeId: item.placeId, occurredAt: item.occurredAt, endedAt: null, timePrecision: item.occurredAt === null ? 'unknown' : 'exact', body: recordBody(item.label), purposes: [], activities: [], impression: '', periodAnswers: {}, bookmarked: false, useForSuggestions: false, topicKey: null, visibility: 'private', sharedWith: [] }, idempotencyKey: item.recordId });
  }
  for (let index = 1; index <= 22; index++) {
    const id = `29810000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`;
    await api.request('postRecords', { body: { id, kind: 'experience', visitId: null, placeId: cases[1].placeId, occurredAt: Date.parse('2026-09-25T06:00:00Z') + index * 60000, endedAt: null, timePrecision: 'exact', body: recordBody(`一覧の後続 ${index}`), purposes: [], activities: [], impression: '', periodAnswers: {}, bookmarked: false, useForSuggestions: false, topicKey: null, visibility: 'private', sharedWith: [] }, idempotencyKey: id });
  }
  await api.request('postThemes', { body: { id: themeId, name: '往復確認テーマ', description: 'ローカル確認用', recordIds: cases.map(item => item.recordId) }, idempotencyKey: themeId });
  const timeZone = 'Asia/Tokyo';
  const day = await api.request('getRecords', { query: { from: Date.parse('2026-09-24T15:00:00Z'), to: Date.parse('2026-09-25T15:00:00Z'), timeZone, limit: 20 } });
  return `対象 ${cases[0].recordId} / 初回20件内 ${day.items.some(record => record.id === cases[0].recordId)} / nextCursor ${!!day.nextCursor}`;
}

function TestMap({ bridge }: { bridge: MapBridge }) {
  const snapshot = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
  const places = snapshot.places['personal-map']?.places ?? [];
  return <div className="test-map" aria-label="確認用地図代替"><strong>確認用地図代替（地図接続設定なし）</strong><output>camera: {JSON.stringify(snapshot.camera)}</output>{places.filter(place => cases.some(item => item.placeId === place.id)).map(place => <button key={place.id} type="button" onClick={() => bridge.select({ ownerKey: 'personal-map', kind: 'place', id: place.id, coordinates: place.coordinates })}>場所を選択: {place.label}</button>)}<button type="button" onClick={() => bridge.setCamera({ longitude: 139.812, latitude: 35.712, zoom: 16, bearing: 24, pitch: 35 })}>確認用カメラを設定</button></div>;
}

function BrowserHarness() {
  const [person, setPerson] = useState<Person | null>(null);
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [status, setStatus] = useState('未作成');
  useEffect(() => { void api.request('getSessionProfiles', {}).then(result => setProfiles(result.items)); void api.request('getSession', {}).then(result => setPerson(result.data.person)).catch(() => {}); }, []);
  if (!person) return <main className="test-controls"><h1>UI-MAP-RECORD-LINK 実 API 確認</h1>{profiles.map(profile => <button key={profile.profileKey} onClick={() => void api.request('postSession', { body: { profileKey: profile.profileKey }, idempotencyKey: crypto.randomUUID() }).then(result => setPerson(result.data.person))}>{profile.name}で開く</button>)}</main>;
  return <><App screens={[...mapScreens, ...activityScreens]} MapRenderer={TestMap} MapToolbar={MapToolbar} scopeKey={`live:${person.id}`} dataMode="live" profile={person}/><aside className="test-controls"><strong>UI-MAP-RECORD-LINK 実 API 確認</strong><button type="button" onClick={() => void seed().then(setStatus).catch(error => setStatus(String(error)))}>サンプルを保存</button><output>{status}</output><small>場所選択は確認用地図代替から操作。記録・テーマ・日別取得は実 API。</small></aside></>;
}
createRoot(document.getElementById('root')!).render(<BrowserHarness/>);
const style = document.createElement('style');
style.textContent = '.test-controls,.test-map{position:fixed;z-index:100;background:#fff;border:1px solid #888;padding:8px;font:12px system-ui;color:#123}.test-controls{top:4px;left:4px;max-width:280px}.test-map{top:110px;left:4px;max-width:260px}.test-controls button,.test-map button{display:block;margin:3px;padding:4px;background:#eef;border:1px solid #69a}.test-controls output,.test-map output{display:block;overflow-wrap:anywhere}';
document.head.append(style);
