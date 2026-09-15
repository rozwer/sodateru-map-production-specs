import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {serve} from '@hono/node-server';
import {createApp} from '../../app/app.ts';
import {openDatabases} from '../../db/connection.ts';
import {loadLocalIdentity,seedProfiles} from '../../core/session.ts';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const module=await import('./router.mjs').catch(()=>({}));

test('real HTTP checkin persistence, version conflict, replay, mode separation and DB reopen',async()=>{
  assert.equal(typeof module.default?.register,'function');
  const dir=mkdtempSync(join(tmpdir(),'suggestions-http-'));
  const identity=loadLocalIdentity(join(dir,'identity.json'));
  const contract=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/openapi.json',import.meta.url),'utf8'));
  // Use the feature fragment in this test until CORE publishes the composed contract.
  const fragment=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/SUGGESTIONS.json',import.meta.url),'utf8'));
  Object.assign(contract.components.schemas,fragment.schemas);
  for(const operation of fragment.operations)contract.paths[operation.path][operation.method]=operation;
  const ajv=new Ajv2020({strict:false});addFormats(ajv);
  const checkinValid=ajv.compile({$ref:'#/components/schemas/SelfCheckin',components:contract.components});
  let dbs,server,origin;
  const boot=async()=>{
    dbs=openDatabases({livePath:join(dir,'live.sqlite'),demoPath:join(dir,'demo.sqlite'),migrations:module.default.migrations});
    seedProfiles(dbs,identity.profiles);
    const app=createApp({databases:dbs,identity,features:[module.default],contract});
    await new Promise(resolve=>{server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:0},address=>{origin=`http://127.0.0.1:${address.port}`;resolve();});});
  };
  const stop=async()=>{await new Promise(resolve=>server.close(resolve));dbs.close();server=null;};
  const cookies={};
  const request=async(path,method='GET',body=undefined,mode='live',extra={})=>{
    const response=await fetch(origin+'/api/v1'+path,{method,headers:{'X-Request-Id':randomUUID(),'X-Data-Mode':mode,'Content-Type':'application/json','Cookie':cookies[mode]??'',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(response.headers.get('set-cookie'))cookies[mode]=response.headers.get('set-cookie').split(';')[0];
    return {status:response.status,body:response.status===204?null:await response.json()};
  };
  try {
    await boot();
    assert.equal((await request('/session','POST',{profileKey:'self'},'live',{'Idempotency-Key':'session'})).status,201);
    const input={id:'answer',localDate:new Date().toISOString().slice(0,10),timezone:'UTC',answers:{state:'calm',wishes:[],minutes:null,note:'',timeBudget:{kind:'atLeast',minutes:120},companion:'pet',effort:'easy',mode:'walking'},validUntil:Date.now()+3600000};
    const saved=await request('/self-checkins','POST',input,'live',{'Idempotency-Key':'save'});
    assert.equal(saved.status,201,JSON.stringify(saved.body));
    assert.ok(checkinValid(saved.body.data),JSON.stringify(checkinValid.errors));
    assert.equal(saved.body.data.answers.timeBudget.kind,'atLeast');
    assert.equal((await request('/self-checkins','POST',input,'live',{'Idempotency-Key':'save'})).body.data.id,'answer');
    assert.equal((await request('/self-checkins','POST',{...input,localDate:'2026-01-01'},'live',{'Idempotency-Key':'save'})).status,409);
    assert.equal((await request('/self-checkins/answer','PATCH',{answers:{...input.answers,state:'tired'}},'live',{'If-Match':'"1"'})).body.data.version,2);
    assert.equal((await request('/self-checkins/answer','PATCH',{answers:input.answers},'live',{'If-Match':'"1"'})).status,412);
    assert.equal((await request('/self-checkins/answer','PATCH',{answers:input.answers})).status,428);
    await request('/session','POST',{profileKey:'self'},'demo',{'Idempotency-Key':'demo'});
    assert.equal((await request('/self-checkins/answer','GET',undefined,'demo')).status,404);
    await stop();await boot();
    const restored=await request('/self-checkins/answer');
    assert.equal(restored.body.data.answers.state,'tired');
    assert.equal(restored.body.data.answers.companion,'pet');
    assert.equal(dbs.live.prepare('PRAGMA foreign_key_check').all().length,0);
    assert.equal((await request('/self-checkins/answer','DELETE',undefined,'live',{'If-Match':'"2"'})).status,204);
    assert.equal((await request('/self-checkins','POST',input,'live',{'Idempotency-Key':'save'})).status,404);
  }finally{if(server)await stop();rmSync(dir,{recursive:true,force:true});}
});
