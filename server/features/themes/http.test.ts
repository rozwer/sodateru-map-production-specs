import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../app/app.ts';
import { openDatabases } from '../../db/connection.ts';
import { seedProfiles, type LocalIdentity } from '../../core/session.ts';
import { loadContract } from '../../core/validation.ts';
import themes from './register.ts';

test('CORE HTTP and persistent receipts preserve themes across restart and separate people/modes',async()=>{
  const root=mkdtempSync(join(tmpdir(),'themes-http-'));
  const options={livePath:join(root,'live.sqlite'),demoPath:join(root,'demo.sqlite'),migrations:themes.migrations};
  const identity:LocalIdentity={version:1,secret:'test-only-secret-for-themes-integration',profiles:[{key:'self',id:'p',name:'本人'},{key:'other',id:'q',name:'別人'}]};
  // Only compose the feature schemas in-memory while CORE owns generated files.
  const contract=loadContract();
  const fragment=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/THEMES.json',import.meta.url),'utf8'));
  contract.components.schemas={...(contract.components.schemas as object),...fragment.schemas};
  let databases=openDatabases(options);seedProfiles(databases,identity.profiles);
  let app=createApp({databases,identity,features:[themes],contract});
  const cookies:Record<string,string>={};
  async function request(method:string,path:string,body?:unknown,extra:Record<string,string>={},mode='live',person='self') {
    const response=await app.request(`/api/v1${path}`,{method,headers:{'X-Request-Id':randomUUID(),'X-Data-Mode':mode,...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookies[mode+person]?{Cookie:cookies[mode+person]}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
    const value=response.status===204?null:await response.json();
    return {response,value};
  }
  async function login(mode='live',person='self') {
    const {response}=await request('POST','/session',{profileKey:person},{'Idempotency-Key':randomUUID()},mode,person);
    assert.equal(response.status,201);
    cookies[mode+person]=response.headers.get('set-cookie')!.split(';')[0]!;
  }
  try {
    await login();await login('demo');await login('live','other');
    databases.live.prepare(`INSERT INTO records(id,created_at,updated_at,person_id,kind,time_precision,body,purposes_json,activities_json,impression,period_answers_json,bookmarked,use_for_suggestions,visibility,shared_with_json)
      VALUES('r',1,1,'p','experience','unknown','fixture','[]','[]','','{}',0,1,'private','[]')`).run();
    const input={id:'theme',name:'散歩',description:'道の楽しみ',recordIds:['r'],colorKey:'purple',coverMediaId:null};
    const created=await request('POST','/themes',input,{'Idempotency-Key':'create-theme'});
    assert.equal(created.response.status,201,JSON.stringify(created.value));
    assert.equal(created.value.data.colorKey,'purple');
    assert.equal(created.response.headers.get('etag'),'"1"');
    assert.equal((await request('POST','/themes',input,{'Idempotency-Key':'create-theme'})).response.status,200);
    assert.equal((await request('POST','/themes',{...input,name:'別名'},{'Idempotency-Key':'create-theme'})).response.status,409);
    assert.equal((await request('PATCH','/themes/theme',{name:'変更'})).response.status,428);
    const updated=await request('PATCH','/themes/theme',{name:'変更',colorKey:'orange',recordIds:[]},{'If-Match':'"1"'});
    assert.equal(updated.response.status,200,JSON.stringify(updated.value));
    assert.equal(updated.value.data.version,2);
    assert.equal((await request('PATCH','/themes/theme',{name:'古い'},{'If-Match':'"1"'})).response.status,412);
    assert.equal((await request('GET','/themes/theme',undefined,{},'demo')).response.status,404);
    assert.equal((await request('GET','/themes/theme',undefined,{},'live','other')).response.status,404);
    databases.close();databases=openDatabases(options);seedProfiles(databases,identity.profiles);
    app=createApp({databases,identity,features:[themes],contract});
    const restored=await request('GET','/themes/theme');
    assert.equal(restored.response.status,200);assert.deepEqual(restored.value,updated.value);
    const replay=await request('POST','/themes',input,{'Idempotency-Key':'create-theme'});
    assert.equal(replay.value.data.version,2);
    assert.equal((await request('DELETE','/themes/theme',undefined,{'If-Match':'"2"'})).response.status,204);
    assert.equal((await request('POST','/themes',input,{'Idempotency-Key':'create-theme'})).response.status,404);
    assert.equal(databases.live.prepare("SELECT count(*) n FROM records WHERE id='r'").get()!.n,1);
  } finally {databases.close();rmSync(root,{recursive:true,force:true});}
});
