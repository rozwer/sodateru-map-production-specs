// Run the unchanged product main with its generated contract and all register.ts modules.
// No feature injection, contract composition, provider fixtures, or direct DB writes.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { once } from 'node:events';

const contract=JSON.parse(readFileSync(new URL('../../01_requirements/04_api/openapi.json',import.meta.url),'utf8'));
const mapAvailable=Boolean(contract.paths['/map-settings']?.get);
const root=fileURLToPath(new URL('../../../',import.meta.url));
const dir=mkdtempSync(join(tmpdir(),'plugins-main-'));
const report={baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  contractSha256:createHash('sha256').update(readFileSync(join(root,'docs/01_requirements/04_api/openapi.json'))).digest('hex'),
  entrypoint:'server/app/main.ts',mode:'demo',dataBoundary:'Product manifests; trial data explicitly mock. No external provider re-fetch in this probe.',
  starts:[],steps:[],snapshots:{},passed:false};
let child,origin,cookie='';
async function start(){
  child=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{cwd:root,
    env:{...process.env,SODATERU_PORT:'0',SODATERU_HOST:'127.0.0.1',SODATERU_DB_PATH:join(dir,'live.sqlite'),SODATERU_DEMO_DB_PATH:join(dir,'demo.sqlite'),SODATERU_PROFILES_PATH:join(dir,'profiles.json')},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    let out='',err='';const timer=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('main startup timeout: '+err));},30000);
    child.stderr.on('data',b=>{err+=b.toString();});
    child.once('error',e=>{clearTimeout(timer);reject(e);});
    child.once('exit',code=>{clearTimeout(timer);reject(new Error('main exited '+code+': '+err));});
    child.stdout.on('data',b=>{out+=b.toString();for(const line of out.split('\n')){
      if(!line.startsWith('{'))continue;
      const info=JSON.parse(line);if(info.event==='ready'){clearTimeout(timer);origin=info.origin;report.starts.push({features:info.features,contractVersion:info.contractVersion});resolve();return;}
    }});
  });
}
async function stop(){if(child&&child.exitCode===null){const closed=once(child,'exit');child.kill('SIGTERM');await closed;}}
async function call(path,method='GET',body,version,expected=200,key=randomUUID(),mode='demo'){
  const headers={'X-Request-Id':randomUUID(),'X-Data-Mode':mode};
  if(cookie)headers.Cookie=cookie;
  if(method==='POST')headers['Idempotency-Key']=key;
  if(version!==undefined)headers['If-Match']='"'+version+'"';
  if(body!==undefined)headers['Content-Type']='application/json';
  const r=await fetch(origin+'/api/v1'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
  const raw=await r.text(),value=raw?JSON.parse(raw):null;
  report.steps.push({path,method,mode,status:r.status,...(r.status>=400?{error:value}:{} )});
  assert.equal(r.status,expected,method+' '+path+': '+raw);
  return value;
}
try{
  await start();
  for(const id of ['PLUGINS','BIKE','DISASTER'])assert.ok(report.starts[0].features.includes(id),id+' registered');
  await call('/session','POST',{profileKey:'self'},undefined,201);
  const catalog=await call('/plugins');report.snapshots.catalog=catalog;
  const ids=['bike','disaster','pilgrimage'];
  assert.deepEqual(catalog.items.map(i=>i.id).sort(),ids);
  let state=(await call('/plugin-state')).data;
  assert.equal(state.items.length,0);
  report.snapshots.trials={};
  for(const id of ids){
    const manifest=catalog.items.find(i=>i.id===id);
    assert.equal(manifest.iconOptions.length,6);
    const trial=(await call('/plugins/'+id+'/trial','POST',{pluginVersion:manifest.pluginVersion,settings:manifest.defaultSettings})).data;
    assert.equal(trial.preview.dataKind,'mock');
    assert.ok(trial.preview.features.length>0);
    assert.deepEqual((await call('/plugin-state')).data,state,'trial does not change installation');
    report.snapshots.trials[id]=trial;
    const input={id,pluginVersion:manifest.pluginVersion,settings:trial.snapshot.settings,enabled:true,confirmed:true,stateRevision:trial.stateRevision};
    const key=randomUUID();
    const item=(await call('/plugin-settings','POST',input,undefined,201,key)).data;
    assert.deepEqual((await call('/plugin-settings','POST',input,undefined,200,key)).data,item);
    state=(await call('/plugin-state')).data;
    assert.ok(state.plugins.some(p=>p.pluginId===id&&p.enabled&&p.ownerKey==='plugin:'+item.installId&&p.resolvedDeclarations.length===1));
  }
  report.snapshots.installed=state;
  let requested;
  if(mapAvailable){
  const map=(await call('/map-settings')).data;
  const layers={...map.layers,plugins:{...map.layers.plugins,bike:true,disaster:true,pilgrimage:true},bike:true};
  requested=(await call('/map-settings','PATCH',{layers},map.version)).data;
  assert.equal(requested.pluginDisplays.filter(p=>p.visible).length,3);
  report.snapshots.mapInstalled=requested;
  }else{
    await call('/map-settings','GET',undefined,undefined,404);
    report.blockers=['MAP-CUSTOM /map-settings is missing from the formal generated contract; shared map checks pending #3.'];
  }
  const versions=await call('/plugins/bike/versions');report.snapshots.bikeVersions=versions;
  // The product currently has one release: never invent a second release for demo evidence.
  assert.equal(versions.items.length,1);
  await call('/plugin-settings/bike/update','POST',{confirmed:true,stateRevision:state.revision,pluginVersion:'not-published'},state.items.find(i=>i.id==='bike').version,404);
  assert.deepEqual((await call('/plugin-state')).data,state,'missing release retains current version');
  for(const id of ids){
    const old=state.items.find(i=>i.id===id);
    await call('/plugin-settings/'+id,'PATCH',{enabled:false},old.version);
    state=(await call('/plugin-state')).data;
    assert.equal(state.plugins.find(p=>p.pluginId===id).resolvedDeclarations.length,0);
    if(mapAvailable){
    const current=(await call('/map-settings')).data;
    assert.equal(current.layers.plugins[id],true,'display preference is retained');
    assert.equal(current.pluginDisplays.find(p=>p.pluginId===id).visible,false);
    }
  }
  report.snapshots.stopped=state;
  const stoppedMap=mapAvailable?(await call('/map-settings')).data:null;report.snapshots.mapStopped=stoppedMap;
  const settings=await call('/plugin-settings');
  await stop();await start();
  assert.deepEqual((await call('/plugin-state')).data,state,'state across OS process restart');
  assert.deepEqual(await call('/plugin-settings'),settings,'settings across OS process restart');
  if(mapAvailable)assert.deepEqual((await call('/map-settings')).data,stoppedMap,'map owner visibility across restart');
  report.restartMatched=true;
  for(const item of state.items)await call('/plugin-settings/'+item.id,'DELETE',undefined,item.version,204);
  const removed=(await call('/plugin-state')).data;assert.equal(removed.items.length,0);
  report.snapshots.removed=removed;
  if(mapAvailable){
  const afterDeleteMap=(await call('/map-settings')).data;
  assert.equal(afterDeleteMap.pluginDisplays.length,0);assert.deepEqual(afterDeleteMap.layers,requested.layers);
  report.snapshots.mapRemoved=afterDeleteMap;
  }
  await call('/session','POST',{profileKey:'self'},undefined,201,randomUUID(),'live');
  assert.equal((await call('/plugin-state','GET',undefined,undefined,200,undefined,'live')).data.items.length,0);
  report.passed=true;
}catch(error){report.failure=String(error);throw error;}
finally{
  await stop();
  writeFileSync(new URL('./main-result.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,steps:report.steps.length,evidence:'docs/evidence/PLUGINS/main-result.json',databaseDirectory:dir}));
}
