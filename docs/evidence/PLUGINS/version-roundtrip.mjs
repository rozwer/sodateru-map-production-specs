// Run the unchanged product main with its generated contract and all register.ts modules.
// No feature injection, contract composition, provider fixtures, or direct DB writes.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { once } from 'node:events';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const dir=mkdtempSync(join(tmpdir(),'plugins-main-'));
const report={baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  contractSha256:createHash('sha256').update(readFileSync(join(root,'docs/01_requirements/04_api/openapi.json'))).digest('hex'),
  entrypoint:'server/app/main.ts',mode:'demo',dataBoundary:'Product manifests; trial data explicitly mock. Version roundtrip uses real releases. No provider call or fabricated search input.',
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
function history(installId){
  const db=new DatabaseSync(join(dir,'demo.sqlite'),{readOnly:true});
  try{return db.prepare('SELECT revision,snapshot_json FROM plugin_version_history WHERE install_id=? ORDER BY revision').all(installId).map(row=>({revision:row.revision,snapshot:JSON.parse(row.snapshot_json)}));}finally{db.close();}
}
try{
  await start();
  await call('/session','POST',{profileKey:'self'},undefined,201);
  const catalog=await call('/plugins');
  const versions=(await call('/plugins/bike/versions')).items;
  assert.ok(versions.some(v=>v.pluginVersion==='1.0.0'),'real old release must be registered');
  assert.ok(versions.some(v=>v.pluginVersion==='1.1.0'),'real new release must be integrated');
  report.snapshots.manifests=versions;
  assert.equal(catalog.items.find(p=>p.id==='bike').pluginVersion,'1.1.0');
  const oldManifest=versions.find(v=>v.pluginVersion==='1.0.0');
  const settings={...oldManifest.defaultSettings,region:{...oldManifest.defaultSettings.region,id:'版戻し後も保持する本人地域'}};
  const trial=(await call('/plugins/bike/trial','POST',{pluginVersion:'1.0.0',settings})).data;
  const initial=(await call('/plugin-settings','POST',{id:'bike',pluginVersion:'1.0.0',settings:trial.snapshot.settings,enabled:true,icon:'star',confirmed:true,stateRevision:trial.stateRevision},undefined,201)).data;
  const before=(await call('/plugin-state')).data;
  const oldDeclarations=before.plugins.find(p=>p.pluginId==='bike').resolvedDeclarations;
  assert.deepEqual(oldDeclarations.map(d=>d.targetKey),['layer:bike']);
  const upgradeBody={pluginVersion:'1.1.0',confirmed:true,stateRevision:before.revision};
  const upgradeKey=randomUUID();
  const updated=(await call('/plugin-settings/bike/update','POST',upgradeBody,initial.version,200,upgradeKey)).data;
  assert.equal(updated.pluginVersion,'1.1.0');assert.equal(updated.previousVersion,'1.0.0');
  assert.deepEqual(updated.settings,initial.settings);assert.equal(updated.icon,'star');assert.equal(updated.installId,initial.installId);
  const upgraded=(await call('/plugin-state')).data;
  assert.ok(upgraded.plugins[0].resolvedDeclarations.some(d=>d.targetKey==='feature:bike:place-candidates'&&d.property==='enabled'&&d.value===true));
  assert.ok(upgraded.plugins[0].resolvedDeclarations.some(d=>d.targetKey==='layer:bike'));
  assert.deepEqual((await call('/plugin-settings/bike/update','POST',upgradeBody,initial.version,200,upgradeKey)).data,updated);
  const rollbackBody={confirmed:true,stateRevision:upgraded.revision},rollbackKey=randomUUID();
  const reverted=(await call('/plugin-settings/bike/rollback','POST',rollbackBody,updated.version,200,rollbackKey)).data;
  assert.equal(reverted.pluginVersion,'1.0.0');assert.equal(reverted.previousVersion,'1.1.0');
  assert.deepEqual(reverted.settings,initial.settings);assert.deepEqual(reverted.manifest,initial.manifest);
  assert.equal(reverted.icon,'star');assert.equal(reverted.installId,initial.installId);assert.equal(reverted.enabled,true);
  const rolledBack=(await call('/plugin-state')).data;
  assert.deepEqual(rolledBack.plugins[0].resolvedDeclarations,oldDeclarations);
  assert.equal(rolledBack.plugins[0].ownerKey,before.plugins[0].ownerKey);
  const savedHistory=history(initial.installId);
  assert.deepEqual(savedHistory.map(h=>h.revision),[1,2,3]);
  assert.deepEqual(savedHistory.map(h=>h.snapshot.pluginVersion),['1.0.0','1.1.0','1.0.0']);
  report.snapshots={...report.snapshots,initial,updated,reverted,before,upgraded,rolledBack,history:savedHistory};
  await stop();await start();
  assert.deepEqual((await call('/plugin-settings/bike')).data,reverted);
  assert.deepEqual((await call('/plugin-state')).data,rolledBack);
  assert.deepEqual(history(initial.installId),savedHistory);
  assert.deepEqual((await call('/plugin-settings/bike/rollback','POST',rollbackBody,updated.version,200,rollbackKey)).data,reverted);
  report.restartMatched=true;
  // Compare modes while the demo installation is still present.
  await call('/session','POST',{profileKey:'self'},undefined,201,randomUUID(),'live');
  assert.equal((await call('/plugin-state','GET',undefined,undefined,200,undefined,'live')).data.items.length,0);
  report.modeSeparationWithNonemptyDemo=true;
  report.passed=true;
}catch(error){report.failure=String(error);throw error;}
finally{
  await stop();
  writeFileSync(new URL('./version-roundtrip.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,steps:report.steps.length,evidence:'docs/evidence/PLUGINS/version-roundtrip.json'}));
}
