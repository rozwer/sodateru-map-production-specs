import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../../src/app/App';
import { api } from '../../../src/app/api';
import { MapRenderer } from '../../../src/map/MapRenderer';
import { screens as mapScreens, MapToolbar } from '../../../src/features/map/screens';
import { screens as recordScreens } from '../../../src/features/records/screens';
import { screens as themeScreens } from '../../../src/features/themes/screens';
import { useMapSession } from '../../../src/features/map/map-state';
import photoUrl from '../../../src/features/feature-requests/assets/coffee.jpg?url';
import type { LocalProfile, Person, PlaceDetail } from '../../../packages/api-client/index';

// These samples are saved through the real local API in this worktree's isolated .local/app.sqlite.
// Names, addresses, and words are authored solely for layout verification. The image is the
// repository asset above, not a photo of any named place.
const cases = [
  { key: 'short-empty', label: '写真なし・短文なし', placeId: '29700000-0000-4000-8000-000000000001', recordId: '29710000-0000-4000-8000-000000000001', name: '駅前の広場', address: '東京都千代田区', body: '', impression: '', photo: false },
  { key: 'long-empty', label: '写真なし・長文', placeId: '29700000-0000-4000-8000-000000000002', recordId: '29710000-0000-4000-8000-000000000002', name: '東京駅の総武地下4番線へ向かう長い連絡通路の奥にある待ち合わせ場所', address: '東京都千代田区丸の内一丁目から地下通路を進み、改札を越えた先の案内板のそば', body: '改札からホームまでの道を、友人とゆっくり歩いた。\n途中で見つけた案内板のおかげで、いつもの道が少し違って見えた。長い記録でも最後の一文まで読めることを確かめる。', impression: '地下の通路を歩いて見つけた小さな発見', photo: false },
  { key: 'short-photo', label: '写真あり・短文', placeId: '29700000-0000-4000-8000-000000000003', recordId: '29710000-0000-4000-8000-000000000003', name: '喫茶室', address: '東京都中央区', body: '静かな午後だった。', impression: '', photo: true },
  { key: 'long-photo', label: '写真あり・長文', placeId: '29700000-0000-4000-8000-000000000004', recordId: '29710000-0000-4000-8000-000000000004', name: '長い名前の喫茶室と街角の小さな読書スペース', address: '東京都中央区日本橋の通りを曲がり、細い路地を最後まで進んだ先', body: '窓際で本を読んだ。\n写真があっても、この文章は写真の下でカードの幅いっぱいに表示される。\n住所や地名も途中で切れない。', impression: 'また訪れたい場所', photo: true },
] as const;
const themeId = '29720000-0000-4000-8000-000000000001';
const mediaIds = ['29730000-0000-4000-8000-000000000003', '29730000-0000-4000-8000-000000000004'];

// The local API's media content endpoint currently rejects a plain <img> request (#174).
// Keep its place/record/theme data and replace only the media URL in this QA page so the
// photo-present layout can be measured. Product code and the local database are unchanged.
const realRequest = api.request.bind(api) as (operation: string, input: unknown) => Promise<unknown>;
api.request = (async (operation: string, input: unknown) => {
  const result = await realRequest(operation, input);
  if (operation !== 'getPlacesPlaceId') return result;
  const response = result as { data: PlaceDetail };
  const item = cases.find(candidate => candidate.photo && candidate.placeId === response.data.place.id);
  if (!item || response.data.ownRecords.status !== 'ready') return result;
  return { ...response, data: { ...response.data, ownRecords: { ...response.data.ownRecords, items: response.data.ownRecords.items.map(record => record.id === item.recordId ? { ...record, media: record.media.map(media => media.kind === 'photo' && media.status === 'ready' ? { ...media, contentUrl: photoUrl } : media) } : record) } } };
}) as typeof api.request;

async function seed() {
  for (const [index, item] of cases.entries()) {
    await api.request('postPlaces', { body: { id: item.placeId, mode: 'manual', name: item.name, address: item.address, position: { longitude: 139.76 + index * 0.001, latitude: 35.68 + index * 0.001 }, buildingKey: null }, idempotencyKey: item.placeId });
    await api.request('postRecords', { body: { id: item.recordId, kind: 'experience', visitId: null, placeId: item.placeId, occurredAt: Date.UTC(2026, 8, 25, 2, index), endedAt: null, timePrecision: 'approximate', body: item.body, purposes: [], activities: [], impression: item.impression, periodAnswers: {}, bookmarked: false, useForSuggestions: false, topicKey: null, visibility: 'private', sharedWith: [] }, idempotencyKey: item.recordId });
    if (item.photo) {
      const detail = (await api.request('getRecordsRecordId', { path: { recordId: item.recordId } })).data;
      if (detail.media.status === 'ready' && !detail.media.data.items.some(media => media.status === 'ready' && media.kind === 'photo')) {
        const form = new FormData();
        form.append('id', mediaIds[index - 2]);
        form.append('file', new File([await (await fetch(photoUrl)).blob()], 'coffee.jpg', { type: 'image/jpeg' }));
        form.append('position', '0');
        await api.request('postRecordsRecordIdMedia', { path: { recordId: item.recordId }, body: form, version: detail.record.version, idempotencyKey: mediaIds[index - 2] });
      }
    }
  }
  await api.request('postThemes', { body: { id: themeId, name: 'カード表示確認用', description: '4件の記録を結ぶローカル確認用テーマ', recordIds: cases.map(item => item.recordId) }, idempotencyKey: themeId });
}

function Controls({ scopeKey }: { scopeKey: string }) {
  const [state, session] = useMapSession(scopeKey);
  const [status, setStatus] = useState('サンプル未作成');
  const [hidden, setHidden] = useState(false);
  const choose = async (placeId: string) => {
    window.location.hash = '#/personal-map';
    await session.loadDetail(placeId, true);
    setStatus(`選択中: ${cases.find(item => item.placeId === placeId)?.label}`);
  };
  return <aside className={`card-qa ${hidden ? 'card-qa--hidden' : ''}`} aria-label="確認用サンプル操作">
    <button type="button" className="card-qa__toggle" onClick={() => setHidden(value => !value)}>{hidden ? '確認操作を表示' : '確認操作を隠す'}</button>
    {!hidden && <div><strong>ローカル確認用サンプル</strong><p>場所・記録・テーマは実 API と隔離 DB。写真 URL は #174 のため repo 内の coffee.jpg に QA 限定で差替え。</p><button type="button" onClick={() => void seed().then(() => setStatus('4件の場所・記録・テーマを保存しました')).catch(error => setStatus(String(error)))}>サンプルを保存</button>{cases.map(item => <button type="button" key={item.key} onClick={() => void choose(item.placeId)}>{item.label}</button>)}<output>{status} / 現在の場所: {state.selectedPlaceId || 'なし'}</output></div>}
  </aside>;
}

function BrowserHarness() {
  const [person, setPerson] = useState<Person | null>(null);
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void api.request('getSessionProfiles', {}).then(data => setProfiles(data.items)).catch(error => setError(String(error))); void api.request('getSession', {}).then(data => setPerson(data.data.person)).catch(() => {}); }, []);
  if (!person) return <section className="card-qa-login"><h1>UI-MAP-CARD 実 API 確認</h1>{profiles.map(profile => <button key={profile.profileKey} type="button" onClick={() => void api.request('postSession', { body: { profileKey: profile.profileKey }, idempotencyKey: crypto.randomUUID() }).then(data => setPerson(data.data.person)).catch(error => setError(String(error)))}>{profile.name}で開く</button>)}{error && <p role="alert">{error}</p>}</section>;
  const scopeKey = `live:${person.id}`;
  return <><App screens={[...mapScreens, ...recordScreens, ...themeScreens]} MapRenderer={MapRenderer} MapToolbar={MapToolbar} scopeKey={scopeKey} dataMode="live" profile={person}/><Controls scopeKey={scopeKey}/></>;
}

createRoot(document.getElementById('root')!).render(<BrowserHarness />);

const style = document.createElement('style');
style.textContent = '.card-qa{position:fixed;z-index:100;top:8px;right:76px;max-width:min(390px,calc(100vw - 84px));padding:8px;border-radius:10px;background:#fff;box-shadow:0 3px 15px #1234;font:12px system-ui}.card-qa button,.card-qa-login button{margin:2px;padding:5px;border:1px solid #6aa;border-radius:6px;background:#fff;color:#155;cursor:pointer}.card-qa output{display:block;overflow-wrap:anywhere}.card-qa--hidden{padding:0;background:transparent;box-shadow:none}.card-qa-login{padding:24px;font:16px system-ui}';
document.head.append(style);
