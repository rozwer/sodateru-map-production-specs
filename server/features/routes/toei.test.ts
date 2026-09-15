import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDirectBusRoutesService } from './index.ts';
import { openDatabases } from '../../db/connection.ts';
import { seedProfiles } from '../../core/session.ts';
import { createApiClient } from '../../../packages/api-client/index.ts';
const options={feedPath:'/private/tmp/sodateru-c-toei-gtfs.zip',metadataPath:'/private/tmp/sodateru-c-toei-gtfs-metadata.json'};
test('real valid Toei feed → ordered three-stop comparison/fare → save → normal CORE HTTP in another OS', {skip:!existsSync(options.feedPath)},async()=>{
 const directory=mkdtempSync(join(tmpdir(),'toei-routes-')),paths={livePath:join(directory,'live.sqlite'),demoPath:join(directory,'demo.sqlite')};
 const dbs=openDatabases(paths),profile={key:'self',id:'toei-owner',name:'都営実データ確認'};
 const context={personId:profile.id,dataMode:'live' as const,requestId:'toei-evidence',signal:new AbortController().signal};
 const identity={version:1,secret:'local-toei-evidence-identity-secret',profiles:[profile]};writeFileSync(join(directory,'profiles.json'),JSON.stringify(identity));seedProfiles(dbs,identity.profiles);
 const service=createDirectBusRoutesService(dbs.live,options);
 const input={mode:'transit' as const,title:'都営実時刻表',conditions:{departAt:1789520400000,timeZone:'Asia/Tokyo',returnBy:1789524000000},waypoints:[{kind:'point' as const,coordinates:[139.765721,35.679934] as [number,number],label:'東京駅丸の内南口'},{kind:'point' as const,coordinates:[139.773148,35.664239] as [number,number],label:'築地六丁目'},{kind:'point' as const,coordinates:[139.773195,35.64708] as [number,number],label:'晴海埠頭'}]};
 let child:ReturnType<typeof spawn>|undefined;
 try{
  const previews=await service.compareRoutes(context,input);assert.equal(previews.length,2);
  const snapshots=previews.map((p,i)=>{
   assert.equal(p.provider,'toei-gtfs');assert.equal(p.legs.length,2);assert.equal(p.transitEvidence!.source.version,'20260915_030753');
   assert.deepEqual(p.transitEvidence!.stops.map(s=>s.stopId),['0966-03','0946-02','1249-01']);assert.equal(p.transitEvidence!.fare.amount,210);assert.equal(p.transitEvidence!.fare.payment,'cash');assert.equal(p.transitEvidence!.fare.passEvaluation,'not_applied');
   assert.equal(p.durationSec,p.transitEvidence!.waitDurationSec+p.transitEvidence!.rideDurationSec);
   assert.deepEqual(p.legs[0]!.geometry.coordinates.at(-1),p.legs[1]!.geometry.coordinates[0]);
   const save={id:'toei-'+i,previewId:p.previewId,title:'都営時刻表 '+i};const route=service.saveRoute(context,save).data;assert.deepEqual(route.transitEvidence,p.transitEvidence);return {input:save,route};
  });
  await assert.rejects(service.previewRoute(context,{...input,conditions:{...input.conditions,transitPassIds:['unverified-pass']}}),{code:'MODE_UNSUPPORTED'});
  await assert.rejects(service.previewRoute(context,{...input,conditions:{...input.conditions,departAt:Date.parse('2030-01-01T00:00:00+09:00'),returnBy:undefined}}),{code:'FEED_EXPIRED'});
  assert.equal(dbs.live.prepare('select count(*) n from saved_routes').get()!.n,2);dbs.close();
  child=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{cwd:fileURLToPath(new URL('../../../',import.meta.url)),env:{...process.env,SODATERU_PORT:'0',SODATERU_HOST:'127.0.0.1',SODATERU_DB_PATH:paths.livePath,SODATERU_DEMO_DB_PATH:paths.demoPath,SODATERU_PROFILES_PATH:join(directory,'profiles.json')},stdio:['ignore','pipe','pipe']});
  const origin=await new Promise<string>((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error('normal main startup timeout: '+errors)),20000);child!.stderr!.on('data',d=>errors+=d);child!.once('error',reject);child!.once('exit',code=>{clearTimeout(timer);reject(Error('main exited '+code+': '+errors))});child!.stdout!.on('data',d=>{output+=d;for(const line of output.split('\n'))if(line.startsWith('{'))try{const v=JSON.parse(line);if(v.event==='ready'){clearTimeout(timer);resolve(v.origin)}}catch{}})});
  let cookie='';const client=createApiClient({baseUrl:origin+'/api/v1',fetch:async(url,init)=>{const headers=new Headers(init?.headers);headers.set('Cookie',cookie);const response=await fetch(url,{...init,headers});const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0]!;return response;}});
  await client.request('postSession',{body:{profileKey:'self'},idempotencyKey:'toei-normal-session'});
  for(const item of snapshots){assert.deepEqual((await client.request('getSavedRoutesRouteId',{path:{routeId:item.route.id}})).data,item.route);assert.deepEqual((await client.request('postSavedRoutes',{body:{id:item.input.id,resultId:item.input.previewId,title:item.input.title},idempotencyKey:'toei-replay-'+item.input.id})).data,item.route);}
  writeFileSync(new URL('../../../docs/evidence/ROUTES/toei-connection.json',import.meta.url),JSON.stringify({result:'PASS',checkedAt:new Date().toISOString(),scope:'Actual provided Toei GTFS via formal direct-bus factory; compare/save in real CORE SQLite. Separate OS normal main HTTP GET and save replay. Shared generation and standard HTTP search selection are not integrated.',externalCalls:0,parentPid:process.pid,readPid:child.pid,checks:['three ordered stops and two full-trip timetable choices','active service day and actual cash fare210, no pass applied','all two legs joined, wait+ride totals','pass request and expired feed rejected without extra saves','normal main HTTP after separate OS startup returns identical evidence/geometry/times/fare and save replay'],snapshots},null,2)+'\n');
 }finally{if(dbs.live.isOpen)dbs.close();if(child&&child.exitCode===null){const p=child;await new Promise<void>(resolve=>{p.once('exit',()=>resolve());p.kill('SIGTERM')});}rmSync(directory,{recursive:true,force:true});}
});
