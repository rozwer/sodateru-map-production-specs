import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { createApp } from '../../app/app.ts';
import { openDatabases,type Databases } from '../../db/connection.ts';
import { loadLocalIdentity,seedProfiles } from '../../core/session.ts';
import { loadContract } from '../../core/validation.ts';
import companion from './register.ts';

test('real multipart ZIP import confirms, registers, selects and reloads with invalid uploads preserving state',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'companion-import-')),identity=loadLocalIdentity(join(dir,'profiles.json'));
  const contract=loadContract(),fragment=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/COMPANION.json',import.meta.url),'utf8'));
  Object.assign(contract.components.schemas as object,fragment.schemas);
  for(const {method,path,...operation} of fragment.operations)(contract.paths[path]??={})[method]=operation;
  let dbs:Databases,server:Server,origin='',cookie='',booted=false;
  async function boot(){
    dbs=openDatabases({livePath:join(dir,'live.db'),demoPath:join(dir,'demo.db'),migrations:companion.migrations});seedProfiles(dbs,identity.profiles);
    const app=createApp({databases:dbs,identity,features:[companion],contract});
    await new Promise<void>(resolve=>{server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:0},a=>{origin=`http://127.0.0.1:${a.port}`;resolve();}) as Server;});
    booted=true;
  }
  async function stop(){await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));dbs.close();booted=false;}
  async function request(method:string,path:string,body?:unknown,version?:number){
    const headers=new Headers({'X-Request-Id':randomUUID(),'X-Data-Mode':'live','Idempotency-Key':randomUUID(),'Cookie':cookie});
    if(body!==undefined && !(body instanceof FormData))headers.set('Content-Type','application/json');
    if(version!==undefined)headers.set('If-Match',`"${version}"`);
    const response=await fetch(origin+'/api/v1'+path,{method,headers,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
    for(const value of response.headers.getSetCookie())cookie=value.split(';')[0]!;
    return {status:response.status,body:await response.json()};
  }
  const form=(bytes:Uint8Array)=>{const value=new FormData();value.set('file',new Blob([Buffer.from(bytes)],{type:'application/zip'}),'pet.zip');return value;};
  try {
    await boot();await request('POST','/session',{profileKey:'self'});
    // Original UI fixture from #19 commit 15d9aab; independent from the server validator.
    const atlas=readFileSync(new URL('../../../docs/evidence/COMPANION/fixtures/spritesheet.png',import.meta.url));
    const zip=readFileSync(new URL('../../../docs/evidence/COMPANION/fixtures/companion-ui-test.zip',import.meta.url));
    const imported=await request('POST','/companion/imports',form(zip));
    assert.equal(imported.status,201,JSON.stringify(imported.body));
    const id=imported.body.data.id;
    assert.equal(imported.body.data.requiredActions.length,25);
    assert.equal((await request('POST',`/companion/imports/${id}/registration`,{selectCurrent:false},1)).status,409);
    await request('PATCH',`/companion/imports/${id}/confirmation`,{actions:imported.body.data.requiredActions},1);
    assert.equal((await request('POST',`/companion/imports/${id}/registration`,{selectCurrent:true,settingsVersion:99},2)).status,412);
    assert.equal((await request('GET','/companions')).body.items.length,0);
    const registered=await request('POST',`/companion/imports/${id}/registration`,{selectCurrent:false},2);
    assert.equal(registered.status,201);assert.equal(registered.body.data.settings.selectedCompanionId,null);
    const petId=registered.body.data.companion.id;
    assert.equal((await request('PATCH','/companion/settings',{selectedCompanionId:petId},1)).status,200);
    const invalid=await request('POST','/companion/imports',form(Buffer.from('broken zip')));
    assert.equal(invalid.status,422);assert.equal(invalid.body.error.code,'VALIDATION_FAILED');
    assert.equal(invalid.body.error.details.fields[0].reason,'ZIP_CORRUPT');
    assert.equal((await request('POST','/companion/imports',form(Buffer.alloc(50_000_001)))).status,413);
    assert.equal((await request('GET','/companions')).body.items.length,1);
    await stop();await boot();
    assert.equal((await request('GET','/companion/settings')).body.data.selectedCompanionId,petId);
    assert.equal((await request('GET',`/companions/${petId}`)).body.data.importId,id);
    const image=await fetch(origin+`/api/v1/companion/imports/${id}/atlas`,{headers:{Cookie:cookie,'X-Request-Id':randomUUID(),'X-Data-Mode':'live'}});
    assert.equal(image.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),atlas);
    assert.equal(dbs!.live.prepare('PRAGMA foreign_key_check').all().length,0);
    await stop();
  } finally {if(booted)await stop();rmSync(dir,{recursive:true,force:true});}
});
