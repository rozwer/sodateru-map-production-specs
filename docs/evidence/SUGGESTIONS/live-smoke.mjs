// Real application process, external providers and isolated demo SQLite; no provider doubles.
import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const directory=await mkdtemp(join(tmpdir(),'suggestions-live-'));
let child,origin='',cookie='';
const checks=[];
async function start(){
  child=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{cwd:root,env:{...process.env,SODATERU_PORT:'0',SODATERU_HOST:'127.0.0.1',SODATERU_DB_PATH:join(directory,'live.sqlite'),SODATERU_DEMO_DB_PATH:join(directory,'demo.sqlite'),SODATERU_PROFILES_PATH:join(directory,'profiles.json')},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    let output='',errors='';
    const timer=setTimeout(()=>{child.kill('SIGTERM');reject(Error('Application startup timeout'));},20000);
    child.stderr.on('data',data=>{errors+=String(data);});
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{clearTimeout(timer);if(!origin)reject(Error(`Application exited ${code}: ${errors}`));});
    child.stdout.on('data',data=>{output+=String(data);for(const line of output.split('\n'))if(line.startsWith('{'))try{const event=JSON.parse(line);if(event.event==='ready'){origin=event.origin;clearTimeout(timer);resolve();}}catch{}});
  });
}
async function stop(){if(!child||child.exitCode!==null)return;const proc=child;await new Promise(resolve=>{proc.once('exit',resolve);proc.kill('SIGTERM');});origin='';}
async function request(path,method='GET',body,version,key=randomUUID()){
  const response=await fetch(origin+'/api/v1'+path,{method,headers:{Cookie:cookie,'X-Data-Mode':'demo','X-Request-Id':randomUUID(),'Idempotency-Key':key,...(body===undefined?{}:{'Content-Type':'application/json'}),...(version===undefined?{}:{'If-Match':`"${version}"`})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
  const result=response.status===204?null:await response.json();
  if(!response.ok)throw Object.assign(Error(`${method} ${path}: ${response.status} ${JSON.stringify(result)}`),{status:response.status});
  return result;
}
try{
  await start();await request('/session','POST',{profileKey:'self'});
  const now=Date.now(),localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(now);
  const checkin=await request('/self-checkins','POST',{id:'demo-answer',localDate,timezone:'Asia/Tokyo',validUntil:now+3600000,answers:{state:'ゆっくり過ごしたい',note:'デモの明示入力',minutes:60,timeBudget:{kind:'exact',minutes:60},mode:'walking',wishes:[]}});
  assert.equal((await request('/self-checkins/demo-answer')).data.version,checkin.data.version);
  checks.push('real HTTP answer save and reload');
  const settings=(await request('/me/settings')).data;
  await request('/me/settings','PATCH',{ai:{...settings.ai,enabled:true,allowLocation:true}},settings.version);
  const search=(await request('/place-candidates?q='+encodeURIComponent('皇居外苑')+'&limit=1')).data;
  assert.ok(search.items.length,'Real place search must return a candidate');
  const place=(await request('/places','POST',{id:'demo-place',mode:'candidate',resultId:search.resultId,candidateId:search.items[0].candidateId})).data;
  const batchInput={id:'demo-batch',checkin:{type:'checkin',id:'demo-answer',version:1},origin:{longitude:139.767125,latitude:35.681236},conditions:{timeBudget:{kind:'atLeast',minutes:120},stayMinutes:30,mode:'walking',wishes:[]},excludedActivities:[],excludedPlaceIds:[],expiresAt:now+3600000,localDate,timezone:'Asia/Tokyo'};
  const batch=(await request('/suggestion-batches','POST',batchInput,undefined,'demo-batch')).data;
  assert.ok(batch.items.length,'Real route and AI must produce a candidate');
  let item=batch.items.find(item=>item.placeId===place.id);assert.ok(item);
  assert.equal(item.totalMinutes,item.travelMinutes+30);assert.ok(item.reason.length);
  checks.push('actual place search, Mapbox seconds and AI explanation persisted');
  item=(await request('/suggestions/'+item.id,'PATCH',{presented:true},item.version)).data;
  item=(await request('/suggestions/'+item.id,'PATCH',{viewed:true},item.version)).data;
  item=(await request('/suggestions/'+item.id,'PATCH',{status:'selected',memo:'デモ選択'},item.version)).data;
  let visit=(await request('/visits','POST',{id:'demo-visit',placeId:place.id,startedAt:now-1800000,endedAt:now,timePrecision:'exact',origin:'manual'})).data;
  visit=(await request('/visits/'+visit.id,'PATCH',{status:'confirmed'},visit.version)).data;
  item=(await request('/suggestions/'+item.id,'PATCH',{status:'completed',completedVisitId:visit.id},item.version)).data;
  item=(await request('/suggestions/'+item.id,'PATCH',{memo:'完了後のメモ'},item.version)).data;
  await request('/visits/'+visit.id,'PATCH',{status:'candidate'},visit.version);
  const cancelled=(await request('/suggestions/'+item.id)).data;
  assert.equal(cancelled.status,'selected');assert.equal(cancelled.completedVisitId,null);
  assert.equal(cancelled.selectedAt,item.selectedAt);assert.equal(cancelled.viewedAt,item.viewedAt);
  checks.push('same-person same-place confirmed completion and ACTIVITY cancellation');
  await stop();await start();
  assert.deepEqual((await request('/suggestions/'+item.id)).data,cancelled);
  assert.equal((await request('/suggestions?batchId=demo-batch')).items[0].id,batch.items[0].id);
  checks.push('full suggestion snapshot and saved rank survive process restart');
  const current=(await request('/me/settings')).data;
  await request('/me/settings','PATCH',{suggestions:{...current.suggestions,stopped:[{placeId:place.id,activity:null}]}},current.version);
  assert.equal((await request('/suggestions?batchId=demo-batch')).items.length,0);
  checks.push('current stop setting prevents new presentation');
  const result={result:'PASS',checkedAt:new Date().toISOString(),entry:'server/app/main.ts',dataMode:'demo',externalProviders:'actual PLACES / Mapbox / shared AI',checks,candidate:{id:item.id,placeId:place.id,reason:item.reason,travelMinutes:item.travelMinutes,stayMinutes:item.stayMinutes,totalMinutes:item.totalMinutes,model:item.generator?.model},sourceRefs:item.sourceRefs};
  await writeFile(new URL('./live-smoke.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await stop();await rm(directory,{recursive:true,force:true});}
