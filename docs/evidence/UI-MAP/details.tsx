import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MapScene,type SceneCamera,type SceneSelection,type SceneOverlay} from '../../../src/map/MapScene';
import type {GrowthDisplay} from '../../../src/map/growth-display';
import type {SceneDecoration} from '../../../src/map/decorations-layer';
const padding={top:30,right:30,bottom:30,left:30};
const view={dimension:'3d',lens:'personal',lightPreset:'day',following:false} as const;
const points=[],lines=[];
const overlays:SceneOverlay[]=[{id:'line-green',ownerKey:'plugin:qa',color:'#298862',geometry:{type:'LineString',coordinates:[[136.9632,35.167],[136.9642,35.167]]}},{id:'line-unknown',ownerKey:'plugin:qa',color:'#898f97',dashed:true,geometry:{type:'LineString',coordinates:[[136.9632,35.1667],[136.9642,35.1667]]}},{id:'area',ownerKey:'plugin:qa',color:'#ec9944',opacity:0.25,geometry:{type:'Polygon',coordinates:[[[136.9632,35.1662],[136.964,35.1662],[136.964,35.1666],[136.9632,35.1666],[136.9632,35.1662]]]}}];
function Fixture(){
 const [camera,setCamera]=useState<SceneCamera>({longitude:136.964,latitude:35.1667,zoom:17.1,pitch:52,bearing:-12});
 const [selection,select]=useState<SceneSelection|null>(null);
 const [growth,setGrowth]=useState<GrowthDisplay[]>([]);
 const [decorations,setDecorations]=useState<SceneDecoration[]>([]);
 const [showLayers,setShowLayers]=useState(false);
 const grow=()=>{if(!selection)return;const item={stage:3,confirmedVisitCount:5,purposes:['読書','休憩'],sourceRefs:[],place:{id:'qa-real-footprint',name:'確認用の建物',coordinates:selection.coordinates,address:null,categories:[],provider:'manual',externalId:null,buildingKey:selection.buildingKey||null,sourceUrl:null,attribution:'模擬成長。footprint/heightはMapbox実地物。',fetchedAt:null,version:1,createdAt:0,updatedAt:0}};setGrowth([item]);};
 return <><h1>実建物と独立した飾り</h1><p>成長・用途・飾り・重ねる面/線は模擬データ。建物形状は実Mapbox。地図内の建物を選んで確認します。</p><div className="actions"><button disabled={selection?.kind!=='building'} onClick={grow}>選んだ実建物に成長を表示</button><button onClick={()=>setDecorations([{id:'qa-decoration',name:'確認用の飾り',coordinates:[camera.longitude,camera.latitude],color:'#2aa5a5',size:'medium'}])}>飾りを表示</button><button onClick={()=>setDecorations([])}>飾りだけ消す</button><button onClick={()=>setShowLayers(!showLayers)}>面と線を切替</button></div><div style={{height:450}}><MapScene camera={camera} view={view} padding={padding} points={points} lines={lines} onCamera={setCamera} onSelect={select} growth={growth} decorations={decorations} overlays={showLayers?overlays:undefined}/></div><output>{selection?JSON.stringify(selection):'建物を選択してください'}</output></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
const style=document.createElement('style');style.textContent='*{box-sizing:border-box}body{margin:0;padding:12px;background:#f4f8f8;color:#123742;font:14px system-ui}h1{font-size:20px}.actions{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}button{border:1px solid #aad3d2;padding:8px;border-radius:10px;background:white}button:disabled{opacity:.45}output{display:block;overflow-wrap:anywhere;padding:12px 0;font-size:12px}';document.head.append(style);
