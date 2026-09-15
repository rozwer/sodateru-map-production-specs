import { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { MapBridge } from '../../../src/app/map-bridge';
import { MapPreview } from '../../../src/map/MapPreview';
import { ObjectPreview } from '../../../src/map/ObjectPreview';
const center: [number, number] = [136.9638, 35.1668];
const padding = { top: 24, right: 24, bottom: 24, left: 24 };
function Fixture() {
 const [bridge] = useState(() => new MapBridge('ui-map-renderer-fixture'));
 const state = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
 const [radius, setRadius] = useState(500);
 useEffect(() => {
  bridge.setCamera({ longitude: center[0], latitude: center[1], zoom: 14.5, pitch: 52, bearing: 0 });
  bridge.setView({ dimension: '3d', lens: 'personal', lightPreset: 'day', following: false });
  bridge.showCandidates('map-search', { resultId: 'fixture-only', candidates: [{id:'test-candidate',coordinates:center,label:'確認用の地点',number:1}], expiresAt: Date.now()+900000 });
  bridge.showRoute('route-planner', { previewId:'fixture-route', geometry:{ type:'LineString',coordinates:[[136.9618,35.165],[136.9638,35.165],[136.9638,35.1668]] },waypoints:[] });
  bridge.showTrack('daily-track', { segments:[{id:'segment-a',coordinates:[[136.961,35.168],[136.962,35.168]]},{id:'segment-b',coordinates:[[136.965,35.168],[136.966,35.168]]}],points:[] });
  return () => bridge.dispose();
 }, [bridge]);
 return <><h1>地図部品の確認</h1><p>模擬データ：地点・経路・観測区間。背景地図は実Mapbox。保存APIは呼びません。</p>
 <div className="actions"><button onClick={()=>bridge.setView({dimension:state.view.dimension==='3d'?'2d':'3d'})}>次元：{state.view.dimension}</button><button onClick={()=>bridge.setView({lightPreset:state.view.lightPreset==='day'?'night':'day'})}>時間：{state.view.lightPreset}</button><button onClick={()=>bridge.setView({lens:state.view.lens==='personal'?'physical':'personal'})}>レンズ：{state.view.lens}</button><button onClick={()=>setRadius(radius===500?1000:500)}>半径：{radius}m</button><button onClick={()=>bridge.clear('route-planner')}>経路だけ消す</button><button onClick={()=>bridge.focus('map-search',{center,zoom:15})}>地点へ戻る</button></div>
 <MapPreview bridge={bridge} label="操作できる実地図" interactive padding={padding} center={center} radiusM={radius}/>
 <output>選択：{state.selection ? `${state.selection.ownerKey}/${state.selection.kind}/${state.selection.id}` : 'なし'} / 次元：{state.view.dimension} / pitch：{state.camera.pitch.toFixed(1)}</output>
 <h2>表示専用プレビュー</h2><MapPreview bridge={bridge} label="表示専用の実地図"/>
 <h2>本人の飾り（高さと独立）</h2><div style={{height:100}}><ObjectPreview color="#2aa5a5" size="medium"/></div>
 </>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
const style=document.createElement('style');style.textContent='*{box-sizing:border-box}body{margin:0;padding:12px;font:14px system-ui;color:#123742;background:#f4f8f8}h1{font-size:22px;margin:0 0 8px}h2{font-size:16px}p{line-height:1.5}.actions{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}button{padding:8px;border:1px solid #aad3d2;border-radius:10px;background:white;color:#17525b}output{display:block;padding:8px;font-size:12px;overflow-wrap:anywhere}.map-preview{height:260px}';document.head.append(style);
