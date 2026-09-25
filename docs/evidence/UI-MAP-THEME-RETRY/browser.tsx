/** Controlled API responses around the real App and personal-map screen. QA only. */
import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../../src/app/App';
import { api } from '../../../src/app/api';
import type { MapBridge } from '../../../src/app/map-bridge';
import { screens, MapToolbar } from '../../../src/features/map/screens';

const places = [1, 2].map(index => ({ id: `29900000-0000-4000-8000-00000000000${index}`, name: `確認場所${index}`, address: '確認用', coordinates: [139.7 + index / 100, 35.6 + index / 100] }));
const records = places.map((place, index) => ({ id: `29910000-0000-4000-8000-00000000000${index + 1}`, effectivePlaceId: place.id, effectiveStartedAt: Date.parse('2026-09-25T03:00:00Z'), body: `確認記録${index + 1}`, purposes: [], impression: '' }));
const themes = records.map((record, index) => ({ id: `29920000-0000-4000-8000-00000000000${index + 1}`, name: `確認テーマ${index + 1}`, recordIds: [record.id] }));
type Pending = { operation: string; themeId?: string; resolve: (value: unknown) => void; reject: (reason: Error) => void };
const pending: Pending[] = [];
const calls: Record<string, number> = { getThemes: 0, getRecords: 0 };
const changed = () => window.dispatchEvent(new Event('qa-changed'));
const originalRequest = api.request.bind(api);
api.request = ((operation: string, options: { query?: { themeId?: string } }) => {
  if (operation === 'getThemes' || operation === 'getRecords') {
    calls[operation]++;
    changed();
    return new Promise((resolve, reject) => { pending.push({ operation, themeId: options.query?.themeId, resolve, reject }); changed(); });
  }
  if (operation === 'getPlacesPlaceId') {
    const place = places.find(item => item.id === (options as unknown as { path: { placeId: string } }).path.placeId)!;
    return Promise.resolve({ data: { place, ownRecords: { items: [] }, visits: { status: 'ok', items: [] }, colocated: [] } });
  }
  if (operation === 'getMapGrowth') return Promise.resolve({ items: [], nextCursor: null });
  return originalRequest(operation as never, options as never);
}) as typeof api.request;

function settle(operation: string, success: boolean) {
  const index = pending.findIndex(item => item.operation === operation);
  if (index < 0) return;
  const item = pending.splice(index, 1)[0];
  if (!success) item.reject(new Error(`${operation} 制御失敗`));
  else if (operation === 'getThemes') item.resolve({ items: themes, nextCursor: null });
  else item.resolve({ items: item.themeId ? records.filter(record => themes.find(theme => theme.id === item.themeId)?.recordIds.includes(record.id)) : records, nextCursor: null });
  changed();
}
function TestMap({ bridge }: { bridge: MapBridge }) {
  const snapshot = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
  return <div className="qa-map" aria-label="確認用地図代替"><strong>確認用地図代替</strong><output>camera: {JSON.stringify(snapshot.camera)}</output><output>places: {snapshot.places['personal-map']?.places.map(place => place.label).join(', ') || 'なし'}</output>{snapshot.places['personal-map']?.places.map(place => <button type="button" key={place.id} onClick={() => bridge.select({ ownerKey: 'personal-map', kind: 'place', id: place.id, coordinates: place.coordinates })}>場所を選択: {place.label}</button>)}<button type="button" onClick={() => bridge.setCamera({ longitude: 139.812, latitude: 35.712, zoom: 16, bearing: 24, pitch: 35 })}>カメラを設定</button></div>;
}
function Controls() {
  useSyncExternalStore(callback => { window.addEventListener('qa-changed', callback); return () => window.removeEventListener('qa-changed', callback); }, () => `${pending.length}:${calls.getThemes}:${calls.getRecords}`);
  return <aside className="qa-controls"><strong>UI-MAP-THEME-RETRY / 制御応答</strong><output>getThemes: {calls.getThemes} / getRecords: {calls.getRecords}</output><output>保留: {pending.map(item => item.operation).join(', ') || 'なし'}</output><button onClick={() => settle('getThemes', false)}>テーマを失敗</button><button onClick={() => settle('getThemes', true)}>テーマを成功</button><button onClick={() => settle('getRecords', false)}>記録を失敗</button><button onClick={() => settle('getRecords', true)}>記録を成功</button></aside>;
}
location.hash = '#/personal-map';
createRoot(document.getElementById('root')!).render(<><App screens={screens} MapRenderer={TestMap} MapToolbar={MapToolbar} scopeKey="qa-theme-retry" profile={{ name: '確認用', bio: '', avatarUrl: null }} dataMode="demo"/><Controls/></>);
const style = document.createElement('style');
style.textContent = '.qa-controls,.qa-map{position:fixed;z-index:100;background:#fff;border:1px solid #888;padding:8px;font:12px system-ui;color:#123;max-width:275px}.qa-controls{top:4px;right:4px}.qa-map{top:160px;right:4px}.qa-controls button,.qa-map button{display:block;margin:3px;padding:4px;background:#eef;border:1px solid #69a}.qa-controls output,.qa-map output{display:block;overflow-wrap:anywhere}';
document.head.append(style);
