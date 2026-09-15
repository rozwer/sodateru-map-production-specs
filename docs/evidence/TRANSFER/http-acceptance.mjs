import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

// Real application and separate OS processes. Only explicit isolated fixture data is created.
const root=fileURLToPath(new URL('../../../',import.meta.url));
const directory=await mkdtemp(join(tmpdir(),'transfer-acceptance-'));
let child,origin='',cookie='',starts=0;
async function start(){
  child=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{cwd:root,env:{...process.env,SODATERU_PORT:'0',SODATERU_HOST:'127.0.0.1',SODATERU_DB_PATH:join(directory,'live.sqlite'),SODATERU_DEMO_DB_PATH:join(directory,'demo.sqlite'),SODATERU_PROFILES_PATH:join(directory,'profiles.json')},stdio:['ignore','pipe','pipe']});
  const proc=child;
  await new Promise((resolve,reject)=>{
    let output='',errors='';
    const timer=setTimeout(()=>{proc.kill('SIGTERM');reject(Error('Server startup timed out'));},20000);
    proc.stderr.on('data',data=>{errors+=String(data)});
    proc.once('error',error=>{clearTimeout(timer);reject(error)});
    proc.once('exit',code=>{clearTimeout(timer);if(!origin)reject(Error(`Server exited ${code}: ${errors}`))});
    proc.stdout.on('data',data=>{
      output+=String(data);
      for(const line of output.split('\n'))if(line.startsWith('{')){
        let event;try{event=JSON.parse(line)}catch{continue}
        if(event.event==='ready'){origin=event.origin;starts++;clearTimeout(timer);resolve()}
      }
    });
  });
}
async function stop(){if(!child||child.exitCode!==null)return;const proc=child;await new Promise(resolve=>{proc.once('exit',resolve);proc.kill('SIGTERM')});origin=''}
async function request(path,method='GET',body,key,version){
  const response=await fetch(origin+'/api/v1'+path,{method,headers:{'X-Request-Id':randomUUID(),'X-Data-Mode':'live',Cookie:cookie,...(body?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{}),...(version?{'If-Match':`"${version}"`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  assert.ok(response.ok,`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
  return data;
}
try{
  await start();
  await request('/session','POST',{profileKey:'self'},'transfer-session');
  const checks=['actual application startup and session'];
  if(!process.argv.includes('--boot-only')){
    const record={id:'transfer-source',kind:'experience',visitId:null,placeId:null,occurredAt:null,endedAt:null,timePrecision:'unknown',body:'公園で緑を眺めて歩き、喫茶店で一日の感想を書いた。',purposes:['散歩','振り返り'],activities:[],impression:'落ち着いて考えをまとめられた。',periodAnswers:{},bookmarked:false,useForSuggestions:true,topicKey:null,visibility:'private',sharedWith:[]};
    const source=(await request('/records','POST',record,'transfer-source')).data;
    const input={id:'transfer-recipe',title:'緑を歩いて振り返る',meaning:'自然の中を探索した後に考えをまとめる',sourceRefs:[{type:'record',id:source.id,version:source.version}],steps:[{id:'park',meaning:'公園で緑を歩く',sourceRecordIds:[source.id],stayMinutes:20,required:true},{id:'cafe',meaning:'喫茶店で振り返る',sourceRecordIds:[source.id],stayMinutes:30,required:true}],requiredConditions:[],allowedChanges:['公園と喫茶店の場所','飲み物']};
    const recipe=(await request('/transfer/recipes','POST',input,'transfer-recipe')).data;
    assert.deepEqual((await request('/transfer/recipes/'+recipe.id)).data,recipe);
    assert.deepEqual((await request('/transfer/recipes','POST',input,'transfer-recipe')).data,recipe);
    await stop();await start();
    assert.deepEqual((await request('/transfer/recipes/'+recipe.id)).data,recipe);
    assert.deepEqual((await request('/records/'+record.id)).data.record,source);
    checks.push('real RECORDS source → recipe POST/GET/replay','same recipe after OS process restart','original record unchanged');
    await writeFile(new URL('recipe-http.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),result:'PASS',entry:'server/app/main.ts',processStarts:starts,checks,remaining:['two-plan adoption and Q10 UI acceptance']},null,2)+'\n');
    console.log(JSON.stringify({milestone:'recipe persistence and OS restart',result:'PASS'}));
    if(process.argv.includes('--plans')){
      const settings=(await request('/me/settings')).data;
      await request('/me/settings','PATCH',{ai:{enabled:true,allowRecords:true,allowLocation:true,allowMedia:false,allowProfile:false}},undefined,settings.version);
      const input={id:'transfer-plan',recipeId:recipe.id,recipeVersion:recipe.version,region:'京都',start:{longitude:135.7681,latitude:35.0116},mode:'walking',timeBudgetMinutes:480,preferences:'公園で緑を歩いてから喫茶店で振り返りたい。'};
      let plan=(await request('/transfer/plan-sets','POST',input,'transfer-plan')).data;
      const deadline=Date.now()+240000;
      while(['pending','running'].includes(plan.status)&&Date.now()<deadline){
        await new Promise(resolve=>setTimeout(resolve,2000));
        plan=(await request('/transfer/plan-sets/'+plan.id)).data;
      }
      await writeFile(new URL('latest-plan-attempt.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),status:plan.status,error:plan.error,candidates:plan.candidates,plans:plan.plans},null,2)+'\n');
      assert.equal(plan.status,'complete',JSON.stringify({status:plan.status,error:plan.error,candidates:plan.candidates.length,plans:plan.plans.map(p=>({variant:p.variant,unmet:p.unmetConditions,unknowns:p.unknowns}))}));
      const adopted=(await request('/transfer/plan-sets/'+plan.id+'/adoption','POST',{variant:'faithful'},'transfer-adoption',plan.version)).data;
      assert.equal(adopted.status,'adopted');assert.ok(adopted.savedRouteId);
      const route=(await request('/saved-routes/'+adopted.savedRouteId)).data;
      const selected=adopted.plans.find(p=>p.variant==='faithful').steps.filter(s=>s.placeId).map(s=>s.placeId);
      assert.deepEqual(route.waypoints.filter(p=>p.placeId).map(p=>p.placeId),selected);
      await stop();await start();
      assert.deepEqual((await request('/transfer/plan-sets/'+plan.id)).data,adopted);
      assert.deepEqual((await request('/saved-routes/'+adopted.savedRouteId)).data,route);
      checks.push('actual common AI and PLACES produce both plans','selected ordered places saved through common ROUTES','same adopted plan and saved route after OS restart');
    }
  }
  const evidence={checkedAt:new Date().toISOString(),result:'PASS',entry:'server/app/main.ts',processStarts:starts,checks,remaining:process.argv.includes('--plans')?['Q10 UI acceptance']:['common AI two-plan generation','actual candidate/road adoption','Q10 UI binding']};
  const filename=process.argv.includes('--boot-only')?'startup.json':process.argv.includes('--plans')?'plans-http.json':'recipe-http.json';
  await writeFile(new URL(filename,import.meta.url),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence));
}finally{await stop();await rm(directory,{recursive:true,force:true})}
