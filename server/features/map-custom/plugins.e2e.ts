// Tests real PLUGINS storage + real MAP-CUSTOM HTTP. The registered declaration is a test-only fixture.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {openDatabases} from '../../db/connection.ts';
import {PluginRegistry,PluginService,PluginStore} from '../plugins/index.ts';
const directory=process.env.MAP_CUSTOM_TEST_DIR;
if(!directory) throw new Error('Set isolated MAP_CUSTOM_TEST_DIR');
const identity=JSON.parse(readFileSync(resolve(directory,'profiles.json'),'utf8'));
const context={personId:identity.profiles.find((p:{key:string})=>p.key==='self').id,dataMode:'live' as const,requestId:randomUUID(),signal:new AbortController().signal};
const dbs=openDatabases({livePath:resolve(directory,'live.sqlite'),demoPath:resolve(directory,'demo.sqlite')});
let cookie='';
async function api(path:string,method='GET',body?:unknown,version?:number,status=200) {
  const headers:Record<string,string>={'X-Request-Id':randomUUID(),'X-Data-Mode':'live',Cookie:cookie,'Idempotency-Key':randomUUID()};
  if(body!==undefined) headers['Content-Type']='application/json';
  if(version!==undefined) headers['If-Match']=`"${version}"`;
  const r=await fetch((process.env.MAP_CUSTOM_BASE_URL??'http://127.0.0.1:3037/api/v1')+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const value=await r.json();assert.equal(r.status,status,JSON.stringify(value));
  const cookies=r.headers.getSetCookie();if(cookies.length)cookie=cookies.map(x=>x.split(';')[0]).join('; ');
  return value.data;
}
try {
  await api('/session','POST',{profileKey:'self'},undefined,201);
  const registry=new PluginRegistry(),id='map-custom-e2e-layer';
  registry.register({manifest:{id,name:'MAP-CUSTOM検証専用宣言',description:'Test fixture; not a real bike data provider',category:'test',author:'e2e',pluginVersion:'1.0.0',updatedAt:Date.now(),changeLog:'fixture',icon:'test',usageInfo:[],sources:[],settingsSchema:{type:'object',additionalProperties:false},defaultSettings:{},trialConditions:[]},
    declarations:()=>[{targetKey:'layer:bike',property:'visibility',value:true}],
    trial:()=>({dataKind:'mock',label:'検証専用fixture',declarations:[],features:[],warnings:[]})});
  const plugins=new PluginService(new PluginStore(dbs.live,context),registry);
  const installed=await plugins.install({id,pluginVersion:'1.0.0',enabled:true,settings:{},confirmed:true,stateRevision:plugins.state().revision});
  const current=await api('/map-settings');
  const saved=await api('/map-settings','PATCH',{layers:{...current.layers,bike:true,plugins:{...current.layers.plugins,[id]:true}}},current.version);
  assert.equal(saved.effectiveLayers.bike,true);assert.equal(saved.effectiveLayers.plugins[id],true);
  assert.equal(saved.pluginDisplays.find((p:{pluginId:string})=>p.pluginId===id).ownerKey,'plugin:'+installed.installId);
  const stopped=plugins.patch(id,installed.version,{enabled:false});
  const disabled=await api('/map-settings');
  assert.equal(disabled.effectiveLayers.bike,false);assert.equal(disabled.effectiveLayers.plugins[id],false);
  assert.equal(disabled.layers.plugins[id],true);assert.equal(disabled.version,saved.version);assert.notEqual(disabled.pluginSnapshot,saved.pluginSnapshot);
  const afterSave=await api('/map-settings','PATCH',{style:{...disabled.style,lightPreset:'night'}},disabled.version);
  assert.equal(afterSave.effectiveLayers.plugins[id],false);assert.equal(plugins.store.get(id).enabled,false);assert.equal(plugins.store.get(id).version,stopped.version);
  plugins.remove(id,stopped.version);
  const removed=await api('/map-settings');assert.equal(removed.layers.plugins[id],true);assert.equal(removed.effectiveLayers.plugins[id],false);
  assert.equal(removed.pluginDisplays.some((p:{pluginId:string})=>p.pluginId===id),false);
  const evidence={date:new Date().toISOString(),core:'413598b',plugins:'a4820c1 (published PR46, not yet integrated)',testDeclaration:id,realPluginStorage:true,realSettingsHttp:true,checks:['installed requested declaration visible','ownerKey uses installId','disable retains wishes and settings version','disabled plugin stays disabled after settings save','remove clears effective owner and retains display wish'],scope:'Test-only declaration through the real PLUGINS service. Not real BIKE data or PLUGINS lifecycle HTTP acceptance.'};
  writeFileSync('docs/evidence/MAP-CUSTOM/settings-plugin-http.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
} finally {dbs.close();}
