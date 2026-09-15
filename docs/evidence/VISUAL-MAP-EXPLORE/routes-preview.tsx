import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { MapBridge } from '../../../src/app/map-bridge';
import { MapPreview } from '../../../src/map/MapPreview';
import { RouteConditionsPage } from '../../../src/features/routes/RouteConditionsPage';
import { RouteResultsPage } from '../../../src/features/routes/RouteResultsPage';
import { RouteNavigationPage } from '../../../src/features/routes/RouteNavigationPage';
import type { NavigationView, PlaceOption, PlaceSearchView, RouteCandidateView, RouteDraft } from '../../../src/features/routes/types';

const photo = (name: string) => new URL(`./assets/${name}-mock.png`, import.meta.url).href;
// Explicit component fixtures, never used by the application or sent to the API.
const places: PlaceOption[] = [
  { id: 'fixture-origin', name: '本山駅', selection: { kind: 'point', coordinates: [136.9638, 35.1635], label: '本山駅' } },
  { id: 'fixture-destination', imageUrl:photo('cafe'), name: 'カフェでひと息', address: '名古屋市千種区四谷通1-10', selection: { kind: 'point', coordinates: [136.9668, 35.1585], label: 'カフェでひと息' } },
  { id: 'fixture-park', name: '東山公園', selection: { kind: 'point', coordinates: [136.978, 35.158], label: '東山公園' } },
];
const initial: RouteDraft = { title: '散歩のテスト', stops: places.slice(0, 2).map((place, i) => ({ key: i === 0 ? 'origin' : 'destination', place, query: place.name })), mode: 'walking', departure: '', returnBy: '', avoidStairs: true, preferCovered: true };
const candidates: RouteCandidateView[] = [
  { id: 'fixture-a', imageUrl:photo('cafe'), name: '候補A', badge: 'バランスのよいルート', description: '大通りと住宅街を通る、歩きやすいルートです。', distanceM: 1200, travelDurationSec: 1080, stayDurationSec: 720, totalDurationSec: 1800, evaluations: [], adoptable: true },
  { id: 'fixture-b', imageUrl:photo('park'), name: '候補B', badge: '緑の多いルート', distanceM: 1500, travelDurationSec: 1500, stayDurationSec: 720, totalDurationSec: 2220, evaluations: [{ label: '屋根の情報が一部不明', status: 'unknown', detail: '条件を確認できないため、合格扱いしません。' }], adoptable: false },
];
function Preview() {
  const [page, setPage] = useState(new URLSearchParams(location.search).get('page') || 'conditions');
  const [draft, setDraft] = useState(initial);
  const [selectedId, setSelected] = useState<string | null>('fixture-a');
  const [search, setSearch] = useState<PlaceSearchView>({ stopKey: null, state: 'idle', options: [] });
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState(false);
  const [finished, setFinished] = useState(false);
  const [log, setLog] = useState('テスト応答。API/DBへの保存は行いません。');
  const [bridge] = useState(() => {
    const value = new MapBridge('visual-routes:fixture');
    value.setCamera({ longitude: 136.9653, latitude: 35.161, zoom: 15, pitch: 0, bearing: 0 });
    value.setView({ dimension: '2d' });
    value.showRoute('route-planner', { previewId: 'fixture-a', selectedRouteId: 'fixture-a', geometry: { type: 'LineString', coordinates: [[136.9638,35.1635],[136.9644,35.1632],[136.965,35.1615],[136.9662,35.1612],[136.9668,35.1585]] }, waypoints: [{id:'origin',coordinates:[136.9638,35.1635],label:'本山駅'},{id:'destination',coordinates:[136.9668,35.1585],label:'カフェでひと息'}], alternatives: [{id:'fixture-b',geometry:{type:'LineString',coordinates:[[136.9638,35.1635],[136.963,35.160],[136.9668,35.1585]]},waypoints:[]}] });
    value.focus('route-planner', { bounds: [[136.963,35.1585],[136.9668,35.1635]] });
    return value;
  });
  const map = { summary: '本山駅 → カフェでひと息（経路形状は表示用モック）', content: <MapPreview bridge={bridge} interactive label="経路表示用モック"/> };
  const notice = error ? { message: 'テスト応答：通信に失敗しました。入力と選択を保持しています。', retry: () => setError(false) } : undefined;
  const nav: NavigationView = { routeId: 'fixture-route', title: '散歩のテスト', status: finished ? 'finished' : 'navigating', instruction: '四谷通を進みます', roadName: '四谷通を進みます', direction: 'left', turnDistanceM: 80, remainingDistanceM: 600, remainingDurationSec: 480, accuracyM: 8, locationStatus: 'available' };
  const toPage = (next: string) => { setPage(next); window.history.replaceState(null, '', `?page=${next}`); };
  return <><nav className="qa-controls" aria-label="部品検証操作"><strong>経路・参照比較モック（生成写真）</strong>{['conditions', 'results', 'navigation'].map(name => <button key={name} onClick={() => toPage(name)}>{name}</button>)}<label><input type="checkbox" checked={empty} onChange={e => setEmpty(e.target.checked)}/>0件</label><label><input type="checkbox" checked={error} onChange={e => setError(e.target.checked)}/>通信失敗</label><output>{log}</output></nav><main>
    {page === 'conditions' && <RouteConditionsPage demo draft={draft} onChange={setDraft} onBack={() => setLog('呼出元へ戻る（下書き保持）')} onSearch={() => error ? setLog('失敗：遷移なし') : toPage('results')} onSearchPlaces={(stopKey, query) => setSearch({ stopKey, state: 'idle', options: places.filter(p => p.name.includes(query)) })} onOpenPasses={() => setLog('定期券設定へ遷移するコールバック')} placeSearch={search} notice={notice}/>}
    {page === 'results' && <RouteResultsPage demo draft={draft} candidates={empty ? [] : candidates} selectedId={selectedId} onSelect={setSelected} onBack={() => toPage('conditions')} onChangeConditions={() => toPage('conditions')} onAdopt={() => { if (error) setLog('失敗：案内開始せず'); else { setLog('テストの採用操作（API保存は未実行）'); toPage('navigation'); } }} map={map} notice={notice}/>}
    {page === 'navigation' && <RouteNavigationPage demo navigation={nav} map={map} onClose={() => setLog('地図へ戻る：案内状態は継続')} onWholeRoute={() => setLog('経路全体へfocus')} onLocate={() => setLog('位置取得は製品の端末操作接続待ち')} onList={() => toPage('results')} onFinish={() => { if (error) setLog('終了保存に失敗：案内状態は継続'); else { setFinished(true); setLog('テスト終了：訪問は作成しない'); } }} notice={notice}/>}
  </main><style>{`body{margin:0;background:#e7eeee}.qa-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#fff4d4;padding:8px;font:12px system-ui;color:#554310}.qa-controls button{padding:6px}.qa-controls output{flex-basis:100%}main{max-width:512px;margin:16px auto;background:#f1f8f8;box-shadow:0 0 0 1px #bfd5dc} @media(max-width:600px){main{margin:0 auto;max-width:100%}}`}</style></>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
