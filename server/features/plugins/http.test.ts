import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { serve } from '@hono/node-server';
import { createApp } from '../../app/app.ts';
import { openDatabases } from '../../db/connection.ts';
import { loadLocalIdentity,seedProfiles } from '../../core/session.ts';
import type { ApiContract } from '../../core/validation.ts';
import plugins from './register.ts';
import { registerPlugin } from './registry.ts';
import type { PluginRelease } from './types.ts';

const release=(version:string):PluginRelease=>({
  manifest:{id:'http-fixture',name:'HTTP検証用',description:'製品プラグインではありません',category:'test',author:'test',pluginVersion:version,updatedAt:1,changeLog:version,icon:'pin',usageInfo:[],sources:[],settingsSchema:{type:'object',properties:{region:{type:'string'}},required:['region'],additionalProperties:false},defaultSettings:{region:'Tokyo'},trialConditions:['地域']},
  declarations:settings=>[{targetKey:'layer:fixture',property:'region',value:settings.region}],
  trial:()=>({dataKind:'mock',label:'検証用模擬データ',declarations:[],features:[],legends:[],sources:[],generatedAt:Date.now(),warnings:[]}),
});

test('real CORE HTTP session, trial, install/replay, update/rollback, delete and reopen',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'plugins-http-')),contractPath=join(dir,'contract.json');
  execFileSync('mise',['exec','--','python3','docs/evidence/PLUGINS/compose-contract.py',contractPath]);
  const contract=JSON.parse(readFileSync(contractPath,'utf8')) as ApiContract;
  registerPlugin(release('1'));registerPlugin(release('2'));registerPlugin({...release('failed'),prepare:async()=>{throw new Error('provider failure');}});
  const identity=loadLocalIdentity(join(dir,'profiles.json'));
  const open=()=>openDatabases({livePath:join(dir,'live.sqlite'),demoPath:join(dir,'demo.sqlite'),migrations:plugins.migrations});
  let databases=open();seedProfiles(databases,identity.profiles);
  let server:ReturnType<typeof serve>|undefined,origin='';const cookies:Record<string,string>={};
  async function start(){const app=createApp({databases,identity,features:[plugins],contract});await new Promise<void>(resolve=>{server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:0},address=>{origin=`http://127.0.0.1:${address.port}`;resolve();});});}
  async function stop(){if(server)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));}
  async function call(path:string,method='GET',body?:unknown,options:{mode?:string;key?:string;version?:number}={}){
    const mode=options.mode??'live',headers:Record<string,string>={'X-Request-Id':randomUUID(),'X-Data-Mode':mode};
    if(cookies[mode])headers.Cookie=cookies[mode];
    if(method==='POST')headers['Idempotency-Key']=options.key??randomUUID();
    if(options.version)headers['If-Match']=`"${options.version}"`;
    if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetch(origin+'/api/v1'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const cookie=response.headers.get('set-cookie');if(cookie)cookies[mode]=cookie.split(';')[0];
    const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null};
  }
  try{
    await start();assert.equal((await call('/session','POST',{profileKey:'self'})).status,201);
    const state=await call('/plugin-state');assert.equal(state.status,200);assert.equal(state.body.data.items.length,0);
    const trial=await call('/plugins/http-fixture/trial','POST',{pluginVersion:'1',settings:{region:'Kyoto'}});
    assert.equal(trial.status,200);assert.equal(trial.body.data.preview.dataKind,'mock');
    assert.equal((await call('/plugin-settings')).body.items.length,0);
    const input={id:'http-fixture',pluginVersion:'1',settings:trial.body.data.snapshot.settings,enabled:true,confirmed:true,stateRevision:trial.body.data.stateRevision};
    const created=await call('/plugin-settings','POST',input,{key:'install'});assert.equal(created.status,201,JSON.stringify(created));
    let item=created.body.data;
    assert.equal((await call('/plugin-settings','POST',input,{key:'install'})).status,200);
    assert.equal((await call('/plugin-settings','POST',{...input,enabled:false},{key:'install'})).status,409);
    assert.equal((await call('/plugin-settings/http-fixture','PATCH',{enabled:false})).status,428);
    assert.equal((await call('/plugin-settings/http-fixture','PATCH',{enabled:false},{version:99})).status,412);
    await stop();databases.close();databases=open();seedProfiles(databases,identity.profiles);await start();
    assert.deepEqual((await call('/plugin-settings/http-fixture')).body.data,item);
    assert.equal((await call('/plugin-settings','POST',input,{key:'install'})).status,200);
    assert.equal((await call('/session','POST',{profileKey:'self'},{mode:'demo'})).status,201);
    assert.equal((await call('/plugin-settings','GET',undefined,{mode:'demo'})).body.items.length,0);
    let revision=(await call('/plugin-state')).body.data.revision;
    const failed=await call('/plugin-settings/http-fixture/update','POST',{confirmed:true,stateRevision:revision,pluginVersion:'failed'},{version:item.version});
    assert.equal(failed.status,502);assert.deepEqual((await call('/plugin-settings/http-fixture')).body.data,item);
    let result=await call('/plugin-settings/http-fixture/update','POST',{confirmed:true,stateRevision:revision,pluginVersion:'2'},{version:item.version,key:'update'});
    assert.equal(result.status,200,JSON.stringify(result));item=result.body.data;assert.equal(item.pluginVersion,'2');
    revision=(await call('/plugin-state')).body.data.revision;
    result=await call('/plugin-settings/http-fixture/rollback','POST',{confirmed:true,stateRevision:revision},{version:item.version});
    assert.equal(result.status,200);item=result.body.data;assert.equal(item.pluginVersion,'1');
    result=await call('/plugin-settings/http-fixture','PATCH',{enabled:false},{version:item.version});assert.equal(result.status,200);item=result.body.data;
    assert.equal((await call('/plugin-state')).body.data.appliedDeclarations.length,0);
    assert.equal((await call('/plugin-settings/http-fixture','DELETE',undefined,{version:item.version})).status,204);
    assert.equal((await call('/plugin-settings/http-fixture')).status,404);
    assert.equal((await call('/plugin-settings','POST',input,{key:'install'})).status,404);
    assert.equal(JSON.parse(String(databases.live.prepare('SELECT settings_json FROM plugin_settings WHERE id=?').get('http-fixture')?.settings_json)).region,'Kyoto');
  }finally{await stop();databases.close();rmSync(dir,{recursive:true,force:true});}
});
