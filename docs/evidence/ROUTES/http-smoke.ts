/** Real CORE HTTP entry, real Mapbox, real SQLite; restart the OS process before rereading. */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createApiClient } from '../../../packages/api-client/index.ts';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const envPath=process.env.ROUTES_ENV_FILE;
if(!envPath)throw Error('Set ROUTES_ENV_FILE to the configured env file');
const env=await readFile(envPath,'utf8');
const token=env.match(/^MAPBOX_ACCESS_TOKEN=(.*)$/m)?.[1]?.trim().replace(/^[\'\"]|[\'\"]$/g,'');
if(!token)throw Error('MAPBOX_ACCESS_TOKEN is not configured');
const directory=await mkdtemp(join(tmpdir(),'routes-http-'));
let child:ChildProcess|undefined,origin='';
const cookies=new Map<string,string>();
const client=createApiClient({baseUrl:'http://route-test/api/v1',fetch:async(url,init)=>{
  const headers=new Headers(init?.headers);
  headers.set('Cookie',[...cookies].map(([k,v])=>`${k}=${v}`).join('; '));
  const u=new URL(String(url));
  const response=await fetch(origin+u.pathname+u.search,{...init,headers});
  for(const value of response.headers.getSetCookie()) {
    const cookie=value.split(';')[0]!,i=cookie.indexOf('=');
    cookies.set(cookie.slice(0,i),cookie.slice(i+1));
  }
  return response;
}});
async function start(){
  const proc=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{cwd:root,env:{...process.env,MAPBOX_ACCESS_TOKEN:token,SODATERU_PORT:'0',SODATERU_HOST:'127.0.0.1',SODATERU_DB_PATH:join(directory,'live.sqlite'),SODATERU_DEMO_DB_PATH:join(directory,'demo.sqlite'),SODATERU_PROFILES_PATH:join(directory,'profiles.json')},stdio:['ignore','pipe','pipe']});
  child=proc;
  await new Promise<void>((resolve,reject)=>{
    let output='',errors='';
    const timer=setTimeout(()=>{proc.kill('SIGTERM');reject(Error('HTTP server startup timeout'));},20000);
    proc.stderr!.on('data',data=>{errors+=String(data)});
    proc.once('error',error=>{clearTimeout(timer);reject(error)});
    proc.once('exit',code=>{clearTimeout(timer);if(!origin)reject(Error(`HTTP server exited ${code}: ${errors}`))});
    proc.stdout!.on('data',data=>{
      output+=String(data);
      for(const line of output.split('\n'))if(line.startsWith('{'))try{const event=JSON.parse(line);if(event.event==='ready'){origin=event.origin;clearTimeout(timer);resolve()}}catch{}
    });
  });
}
async function stop(){if(!child||child.exitCode!==null)return;const proc=child;await new Promise<void>(resolve=>{proc.once('exit',()=>resolve());proc.kill('SIGTERM')});origin='';}
const waypoints=[{kind:'point' as const,coordinates:[139.767125,35.681236] as [number,number],label:'東京駅'},{kind:'point' as const,coordinates:[139.769,35.682] as [number,number],label:'経由地'},{kind:'point' as const,coordinates:[139.771,35.684] as [number,number],label:'目的地'}];
const saved:{mode:'live'|'demo';id:string;route:any;input:any;key:string}[]=[];
try{
  await start();
  for(const mode of ['live','demo'] as const){
    client.setDataMode(mode);
    await client.request('postSession',{body:{profileKey:'self'},idempotencyKey:'routes-session-'+mode});
    for(const transport of (mode==='live'?['walking','driving']:['walking']) as ('walking'|'driving')[]){
      const key='preview-'+mode+'-'+transport;
      const body={waypoints,mode:transport,title:'東京駅周辺'};
      const search=await client.request('postRouteSearches',{body,idempotencyKey:key});
      assert.equal(search.data.legs.length,2);
      const repeated=await client.request('postRouteSearches',{body,idempotencyKey:key});
      assert.deepEqual(repeated,search);
      const input={id:'route-'+transport,resultId:search.data.resultId,title:mode+' '+transport};
      const create=await client.request('postSavedRoutes',{body:input,idempotencyKey:'save-'+key});
      assert.deepEqual(create.data.geometry,search.data.geometry);assert.deepEqual(create.data.waypoints,search.data.waypoints);assert.deepEqual(create.data.legs,search.data.legs);assert.equal(create.data.fetchedAt,search.data.fetchedAt);
      const navigating=await client.request('patchSavedRoutesRouteId',{path:{routeId:input.id},body:{status:'navigating',currentLeg:1},version:create.data.version});
      saved.push({mode,id:input.id,route:navigating.data,input,key:'save-'+key});
    }
  }
  await stop();await start();
  for(const item of saved){
    client.setDataMode(item.mode);
    const reread=await client.request('getSavedRoutesRouteId',{path:{routeId:item.id}});
    assert.deepEqual(reread.data,item.route);
    const replay=await client.request('postSavedRoutes',{body:item.input,idempotencyKey:item.key});
    assert.deepEqual(replay.data,item.route);
  }
  client.setDataMode('live');
  const before=await client.request('getSavedRoutes',{});
  const oceanWaypoints=[...waypoints.slice(0,2),{kind:'point' as const,coordinates:[0,0] as [number,number],label:'道路のない地点'}];
  let failure='';
  try{await client.request('postRouteSearches',{body:{waypoints:oceanWaypoints,mode:'walking',title:'2区間目失敗'},idempotencyKey:'no-route-second-leg'});throw Error('Expected second-leg provider failure')}catch(error:any){assert.equal(error.code,'PROVIDER_UNAVAILABLE');assert.equal(error.details.failedLeg,1);failure=error.code;}
  const after=await client.request('getSavedRoutes',{});assert.deepEqual(after,before);
  const outcome={result:'PASS',checkedAt:new Date().toISOString(),entry:'server/app/main.ts',processStarts:2,core:'fb767fe / develop 413598b',provider:'actual Mapbox Directions',snapshots:saved.map(s=>({dataMode:s.mode,id:s.id,transport:s.route.mode,distanceM:s.route.distanceM,durationSec:s.route.durationSec,fetchedAt:s.route.fetchedAt,legs:s.route.legs.length,steps:s.route.legs.map((l:any)=>l.steps?.length),version:s.route.version,status:s.route.status,currentLeg:s.route.currentLeg})),assertions:['full snapshot equality after OS process restart','same id separated by live/demo databases','same search key replays same preview','save replay survives preview loss and returns current navigation state','actual second-leg provider rejection creates no saved success'],actualFailure:failure};
  await writeFile(new URL('./http-smoke.json',import.meta.url),JSON.stringify(outcome,null,2)+'\n');console.log(JSON.stringify(outcome,null,2));
}finally{await stop();await rm(directory,{recursive:true,force:true});}
