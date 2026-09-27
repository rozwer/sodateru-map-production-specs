import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, type ChildProcess} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

// Real acquired feed only: default API factory, dedicated DB, fixed port (no fallback).
test('real GTFS through normal HTTP search, save, restart and replay',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'routes25-http-'));
 const transfer=process.env.ROUTES_TEST_TRANSFERS==='1';
 const port='43225',host='routes25.localhost';
 writeFileSync(join(dir,'profiles.json'),JSON.stringify({version:1,secret:'routes25-real-http-evidence-secret',profiles:[{key:'self',id:'routes25-owner',name:'本人'}]}));
 let child:ChildProcess|undefined;let cookie='';const pids:number[]=[];
 const start=async()=>{
  child=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{env:{...process.env,SODATERU_PORT:port,SODATERU_HOST:'127.0.0.1',SODATERU_DB_PATH:join(dir,'live.sqlite'),SODATERU_DEMO_DB_PATH:join(dir,'demo.sqlite'),SODATERU_PROFILES_PATH:join(dir,'profiles.json'),ROUTES_TOEI_FEED_PATH:'/private/tmp/sodateru-c-toei-gtfs.zip',ROUTES_TOEI_METADATA_PATH:'/private/tmp/sodateru-c-toei-gtfs-metadata.json',PYTHONDONTWRITEBYTECODE:'1'},stdio:['ignore','pipe','pipe']});
  pids.push(child.pid!);
  await new Promise<void>((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error('startup timeout '+errors)),20000);child!.stderr!.on('data',d=>errors+=d);child!.once('error',reject);child!.once('exit',code=>{clearTimeout(timer);reject(Error('startup exit '+code+errors));});child!.stdout!.on('data',d=>{output+=d;if(output.includes('"event":"ready"')){clearTimeout(timer);resolve();}});});
 };
 const stop=async()=>{if(child&&child.exitCode===null){const p=child;await new Promise<void>(resolve=>{p.once('exit',()=>resolve());p.kill('SIGTERM');});}};
 const request=async(path:string,body?:unknown,key=randomUUID())=>{
  const response=await fetch('http://127.0.0.1:'+port+'/api/v1'+path,{method:body?'POST':'GET',headers:{Host:host+':'+port,'X-Request-Id':randomUUID(),'X-Data-Mode':'live','Content-Type':'application/json','Idempotency-Key':key,Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})});
  const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0]!;
  const value=await response.json();assert.ok(response.ok,JSON.stringify(value));return value;
 };
 try{
  await start();await request('/session',{profileKey:'self'});
  const input={mode:'transit',title:'都営バス実HTTP',conditions:{departAt:Date.parse('2026-09-27T08:00:00+09:00'),timeZone:'Asia/Tokyo'},waypoints:[{kind:'point',coordinates:[139.765721,35.679934],label:'東京駅丸の内南口'},{kind:'point',coordinates:[139.773148,35.664239],label:'築地六丁目'},{kind:'point',coordinates:[139.773195,35.64708],label:'晴海埠頭'}]};
  if(transfer)input.waypoints=[{kind:'point',coordinates:[139.764696,35.680858],label:'東京駅丸の内南口'},{kind:'point',coordinates:[139.797123,35.65515],label:'豊洲駅前'}];
  const previews=(await request('/route-comparisons',input)).data.items;
  assert.ok(previews.length);assert.equal(previews[0].transitEvidence.fare.amount,transfer?420:210);
  if(transfer){assert.equal(previews[0].transitEvidence.scope,'bus_transfers');assert.equal(previews[0].transitEvidence.segments.length,2);}else assert.equal(previews.length,2);
  const save={id:'routes25-real-http',resultId:previews[0].resultId,title:input.title};const key=randomUUID();
  const saved=(await request('/saved-routes',save,key)).data;
  assert.deepEqual(saved.transitEvidence,previews[0].transitEvidence);
  await stop();await start();
  assert.deepEqual((await request('/saved-routes/'+save.id)).data,saved);
  assert.deepEqual((await request('/saved-routes',save,key)).data,saved);
  writeFileSync('docs/evidence/ROUTES/'+(transfer?'transfer-http':'transit-http')+'.json',JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),origin:'http://'+host+':'+port,transport:'127.0.0.1 with dedicated Host header',pids,checks:[transfer?'normal HTTP comparison: real 2-trip transfer, 420 JPY':'normal HTTP comparison: 2 real GTFS trips','selected full itinerary save','new OS process reads same snapshot and save replay'],feedVersion:saved.transitEvidence.source.version,sha256:saved.transitEvidence.source.sha256,route:saved},null,2)+'\n');
 }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});
