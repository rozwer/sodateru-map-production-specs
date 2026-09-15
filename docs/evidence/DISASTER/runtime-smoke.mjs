import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const directory=mkdtempSync(join(tmpdir(),'disaster-runtime-'));
const checks=[];let child,origin,cookie='',evidence;
async function start(){
 child=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{
  cwd:root,env:{...process.env,SODATERU_PORT:'0',SODATERU_DB_PATH:join(directory,'live.sqlite'),SODATERU_DEMO_DB_PATH:join(directory,'demo.sqlite'),SODATERU_PROFILES_PATH:join(directory,'profiles.json')},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{
  let output='',errors='';const timer=setTimeout(()=>reject(new Error('Official runtime startup timeout: '+errors.slice(-2000))),30000);
  child.stdout.on('data',chunk=>{output+=chunk.toString();for(const line of output.split('\n')){try{const event=JSON.parse(line);if(event.event==='ready'){origin=event.origin;clearTimeout(timer);resolve();}}catch{}}});
  child.stderr.on('data',chunk=>{errors+=chunk.toString();});child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Official runtime exited ${code}: ${errors.slice(-2000)}`));});
 });return child.pid;
}
async function stop(){if(!child||child.exitCode!==null)return;const processToStop=child;await new Promise(resolve=>{processToStop.once('exit',resolve);processToStop.kill('SIGTERM');});child=null;}
async function request(path,method='GET',body,version,key=randomUUID()){
 const response=await fetch(origin+'/api/v1'+path,{method,headers:{'X-Request-Id':randomUUID(),'X-Data-Mode':'live',...(cookie?{Cookie:cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(method==='POST'?{'Idempotency-Key':key}:{}),...(version?{'If-Match':`"${version}"`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const setCookie=response.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
 const text=await response.text();return {status:response.status,data:text?JSON.parse(text):null};
}
try{
 const firstPid=await start();assert.equal((await request('/session','POST',{profileKey:'self'})).status,201);
 const search=await request('/place-candidates?q='+encodeURIComponent('江戸川区役所')+'&limit=1');assert.equal(search.status,200,JSON.stringify(search));
 const candidate=search.data.data.items[0];assert.equal(candidate.retention,'storable');
 const {longitude:x,latitude:y}=candidate.position;
 const settings={region:{id:'選択地点周辺: '+candidate.name,bounds:[x-0.02,y-0.02,x+0.02,y+0.02]},layerIds:['flood-hazard','terrain','rainfall']};
 const trial=await request('/plugins/disaster/trial','POST',{pluginVersion:'1.0.0',settings});assert.equal(trial.status,200,JSON.stringify(trial));
 const installed=await request('/plugin-settings','POST',{id:'disaster',pluginVersion:'1.0.0',settings,enabled:true,confirmed:true,stateRevision:trial.data.data.stateRevision});assert.equal(installed.status,201,JSON.stringify(installed));
 const version=installed.data.data.version;
 const refreshed=await request('/disaster/refresh','POST',{},version,'runtime-refresh');assert.equal(refreshed.status,200,JSON.stringify(refreshed));
 const snapshot=refreshed.data.data.result;assert.equal(refreshed.data.data.map.action,'apply');
 assert.ok(snapshot.layers.every(l=>l.tiles.length&&l.tiles.every(t=>t.status==='available')));
 checks.push('official main.ts automatic feature registration and generated contract: PLACES selection -> PLUGINS install -> real disaster refresh');
 await stop();const secondPid=await start();assert.notEqual(secondPid,firstPid);
 const reopened=await request('/disaster');assert.equal(reopened.status,200,JSON.stringify(reopened));assert.deepEqual(reopened.data.data.result,snapshot);assert.deepEqual(reopened.data.data.settings.settings,settings);assert.equal(reopened.data.data.map.action,'apply');
 checks.push('first OS process exits; second OS process reopens SQLite and returns identical images, source/analysis times, region and settings');
 const replay=await request('/disaster/refresh','POST',{},version,'runtime-refresh');assert.equal(replay.status,200);assert.equal(replay.data.data.result.resultId,snapshot.resultId);
 checks.push('completed POST receipt replays after OS process restart without replacing snapshot');
 const disabled=await request('/plugin-settings/disaster','PATCH',{enabled:false},version);assert.equal(disabled.status,200);
 const cleared=await request('/disaster');assert.equal(cleared.data.data.map.action,'clear');assert.equal(cleared.data.data.map.ownerKey,`plugin:${installed.data.data.installId}`);assert.deepEqual(cleared.data.data.result,snapshot);
 checks.push('official runtime disable clears only plugin owner and retains cached result');
 evidence={status:'passed',verifiedAt:new Date().toISOString(),checks,firstPid,secondPid,resultId:snapshot.resultId,settings,sources:snapshot.layers.map(l=>({layerId:l.layerId,sourceUrl:l.sourceUrl,fetchedAt:l.fetchedAt,sourceUpdatedAt:l.sourceUpdatedAt,validAt:l.validAt,sha256:l.tiles.map(t=>t.sha256)})),notes:['Unmodified official server/app/main.ts and generated OpenAPI used.','Actual Mapbox drawing is separately accepted by A #18/#8.']};
}catch(error){evidence={status:'failed',verifiedAt:new Date().toISOString(),checks,error:String(error)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL('./runtime-smoke.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));rmSync(directory,{recursive:true,force:true});}
