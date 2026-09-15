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

test('CORE real HTTP saves drafts and settings with replay, partial PATCH and restart across live/demo',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'companion-http-'));
  const identity=loadLocalIdentity(join(dir,'profiles.json'));
  const contract=loadContract();
  const fragment=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/COMPANION.json',import.meta.url),'utf8'));
  Object.assign(contract.components.schemas as object,fragment.schemas);
  for (const {method,path,...operation} of fragment.operations) (contract.paths[path]??={})[method]=operation;
  let dbs:Databases,server:Server,origin='',mode='live',booted=false;
  const cookies=new Map<string,string>();
  async function boot(){
    dbs=openDatabases({livePath:join(dir,'live.db'),demoPath:join(dir,'demo.db'),migrations:companion.migrations});
    seedProfiles(dbs,identity.profiles);
    const app=createApp({databases:dbs,identity,features:[companion],contract});
    await new Promise<void>(resolve=>{server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:0},a=>{origin=`http://127.0.0.1:${a.port}`;resolve();}) as Server;});
    booted=true;
  }
  async function stop(){await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));dbs.close();booted=false;}
  async function request(method:string,path:string,body?:unknown,version?:number,key:string=randomUUID()){
    const headers=new Headers({'X-Request-Id':randomUUID(),'X-Data-Mode':mode,'Idempotency-Key':key,'Cookie':[...cookies.values()].join('; ')});
    if(body!==undefined)headers.set('Content-Type','application/json');
    if(version!==undefined)headers.set('If-Match',`"${version}"`);
    const response=await fetch(origin+'/api/v1'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0]!;cookies.set(pair.split('=')[0]!,pair);}
    return {status:response.status,body:await response.json(),etag:response.headers.get('etag')};
  }
  try {
    await boot();
    assert.equal((await request('POST','/session',{profileKey:'self'})).status,201);
    const input={name:'旅猫',appearance:'青い帽子',referenceImageId:null};
    const created=await request('POST','/companion/drafts',input,undefined,'draft-1');
    assert.equal(created.status,201);assert.equal(typeof created.body.data.createdAt,'number');
    const id=created.body.data.id;
    const patch=await request('PATCH','/companion/drafts/'+id,{appearance:'赤い帽子'},1);
    assert.equal(patch.status,200);assert.equal(patch.body.data.name,'旅猫');assert.equal(patch.etag,'"2"');
    assert.equal((await request('PATCH','/companion/drafts/'+id,{name:'古い版'},1)).status,412);
    const replay=await request('POST','/companion/drafts',input,undefined,'draft-1');
    assert.equal(replay.status,200);assert.equal(replay.body.data.appearance,'赤い帽子');
    assert.equal((await request('POST','/companion/drafts',{...input,name:'異入力'},undefined,'draft-1')).status,409);
    assert.equal((await request('PATCH','/companion/settings',{visible:false},1)).status,200);
    assert.equal((await request('GET','/companion/drafts')).body.items.length,1);
    await stop();await boot();
    assert.equal((await request('GET','/companion/drafts/'+id)).body.data.appearance,'赤い帽子');
    assert.equal((await request('GET','/companion/settings')).body.data.visible,false);
    mode='demo';await request('POST','/session',{profileKey:'self'});
    assert.equal((await request('GET','/companion/drafts/'+id)).status,404);
    assert.equal((await request('GET','/companion/settings')).body.data.visible,true);
    const provider=await request('GET','/companion/provider');assert.equal(provider.body.data.connected,false);
    const draft=await request('POST','/companion/drafts',input);
    assert.equal((await request('POST','/companion/generations',{draftId:draft.body.data.id,draftVersion:1})).status,503);
    assert.equal((await request('GET','/companion/drafts/'+draft.body.data.id)).body.data.appearance,'青い帽子');
    await stop();
  } finally {if(booted)await stop();rmSync(dir,{recursive:true,force:true});}
});
