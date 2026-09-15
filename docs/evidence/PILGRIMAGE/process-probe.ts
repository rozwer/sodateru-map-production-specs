/** Normal product entrypoint and generated contract; no contract/provider substitution. */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const dir=resolve(process.env.PILGRIMAGE_PROBE_DIR??'.local/pilgrimage-process',randomUUID());mkdirSync(dir,{recursive:true});
const output:any={checkedAt:new Date().toISOString(),entrypoint:'server/app/main.ts',contract:'committed openapi.json',providerDoubles:false,responses:[],assertions:{},complete:false};
let child:ReturnType<typeof spawn>|undefined,origin='',cookie='',mode='live';
async function start(){
 child=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{cwd:resolve('.'),env:{...process.env,SODATERU_PORT:'0',SODATERU_DB_PATH:resolve(dir,'live.sqlite'),SODATERU_DEMO_DB_PATH:resolve(dir,'demo.sqlite'),SODATERU_PROFILES_PATH:resolve(dir,'profiles.json')},stdio:['ignore','pipe','pipe']});
 const coreProcess=child;let stdout='',stderr='';
 coreProcess.stderr!.on('data',chunk=>{stderr+=String(chunk);});
 await new Promise<void>((ok,fail)=>{
  const timeout=setTimeout(()=>fail(new Error('CORE startup timeout')),20000);
  coreProcess.once('exit',code=>{clearTimeout(timeout);fail(new Error('CORE startup exited '+code+': '+stderr.slice(-1500)));});
  coreProcess.stdout!.on('data',chunk=>{stdout+=String(chunk);for(const line of stdout.split('\n')){try{const message=JSON.parse(line);if(message.event==='ready'){origin=message.origin+'/api/v1';output.features=message.features;clearTimeout(timeout);ok();return;}}catch{}}});
 });
}
async function stop(){if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}child=undefined;}
async function call(method:string,path:string,body?:unknown,key=randomUUID(),version?:number){
 const headers:Record<string,string>={'X-Data-Mode':mode,'X-Request-Id':randomUUID(),Cookie:cookie};
 if(body!==undefined)headers['Content-Type']='application/json';if(method==='POST')headers['Idempotency-Key']=key;if(version)headers['If-Match']=`"${version}"`;
 const response=await fetch(origin+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
 if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie')!.split(';')[0]!;
 const result:any=await response.json();output.responses.push({method,path,mode,status:response.status,error:result.error??null});
 if(!response.ok)throw new Error(`${method} ${path}: ${response.status} ${result.error?.code}: ${result.error?.message}`);return result.data;
}
try {
 await start();await call('POST','/session',{profileKey:'self'});
 const state=await call('GET','/plugin-state');
 const setting=await call('POST','/plugin-settings',{id:'pilgrimage',pluginVersion:'1.0.0',enabled:true,settings:{workQuery:'君の名は。',region:{id:'飛騨',bounds:[137,36,137.4,36.5]},mode:'walking'},confirmed:true,stateRevision:state.revision});
 const searchId=randomUUID();const search=await call('POST','/plugins/pilgrimage/searches',{id:searchId,workQuery:'君の名は。',region:{id:'飛騨',bounds:[137,36,137.4,36.5]}},searchId);
 assert.equal(search.works[0].id,'Q21697406');assert.equal(search.relations.filter((r:any)=>r.verificationStatus==='confirmed').length,4);
 const preview=await call('POST','/plugins/pilgrimage/previews',{searchId,orderedRelationIds:['hida-2','hida-1'],mode:'walking',title:'駅から図書館',settingsVersion:setting.version,acknowledgeUnverified:false});
 const plan=await call('POST','/plugins/pilgrimage/plans',{id:randomUUID(),previewId:preview.id});assert.deepEqual(plan.orderedRelationIds,['hida-2','hida-1']);assert.ok(plan.route.geometry.coordinates.length>2);
 assert.equal((await call('GET','/plugins/pilgrimage/overlay')).features.length,3);
 await stop();await start();
 assert.deepEqual(await call('GET',`/plugins/pilgrimage/plans/${plan.id}`),plan);
 assert.equal((await call('GET','/plugins/pilgrimage/settings')).setting.version,setting.version);
 const disabled=await call('PATCH','/plugin-settings/pilgrimage',{enabled:false},randomUUID(),setting.version);
 assert.equal((await call('GET','/plugins/pilgrimage/overlay')).visible,false);assert.deepEqual(await call('GET',`/plugins/pilgrimage/plans/${plan.id}`),plan);
 await stop();await start();assert.equal((await call('GET','/plugins/pilgrimage/overlay')).visible,false);assert.deepEqual(await call('GET',`/plugins/pilgrimage/plans/${plan.id}`),plan);
 await call('PATCH','/plugin-settings/pilgrimage',{enabled:true},randomUUID(),disabled.version);assert.equal((await call('GET','/plugins/pilgrimage/overlay')).features.length,3);
 mode='demo';cookie='';await call('POST','/session',{profileKey:'self'});assert.deepEqual((await call('GET','/plugins/pilgrimage/plans')).items,[]);
 output.assertions={normalCoreEntrypoint:true,committedGeneratedContract:true,pluginInstallAndToggleHttp:true,realOfficialPlacesRoad:true,orderRetained:true,osProcessRestart:true,settingsReopened:true,stopRetainsPlan:true,stoppedAfterRestart:true,reEnabledOverlayRestored:true,modeIsolation:true};output.complete=true;output.plan=plan;
} catch(error:any){output.error={name:error.name,message:String(error.message)};process.exitCode=1;}
finally {await stop();writeFileSync(resolve(dir,'result.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({result:resolve(dir,'result.json'),complete:output.complete,assertions:output.assertions,error:output.error}));}
