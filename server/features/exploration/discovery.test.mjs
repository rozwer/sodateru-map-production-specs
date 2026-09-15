import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DiscoveryRepository,DiscoveryService} from './discovery.mjs';
const ctx={personId:'p1',dataMode:'live',signal:new AbortController().signal};
const result={anchor:{kind:'place',targetId:'place1',features:['赤い壁']},bridge:'壁の色に気づいた',knowledge:'顔料の一般知識',observationPrompt:'周囲も比べよう',conceptIds:['color'],sources:[{url:'https://example.org/fact',title:'一般資料',claimScope:'general',sourceId:null}]};
function database(path) {
 const db=new DatabaseSync(path);db.exec("PRAGMA foreign_keys=ON;CREATE TABLE IF NOT EXISTS people(id TEXT PRIMARY KEY);INSERT OR IGNORE INTO people VALUES ('p1'),('p2');");
 const additions=readFileSync(new URL("../../../docs/01_requirements/02_common/references/storage-additions.sql",import.meta.url),"utf8");
 if(!db.prepare("SELECT name FROM sqlite_master WHERE name=\'discovery_cards\'").get())db.exec(additions.slice(additions.indexOf("CREATE TABLE discovery_cards"),additions.lastIndexOf("COMMIT;")));
 const sql=readFileSync(new URL('../../db/migrations/exploration/001-discovery.sql',import.meta.url),'utf8');db.exec(sql);return db;
}
function fixture(db) {
 let source='current',status='complete',attempt=1,now=1000;
 const run=()=>({id:'a1',task:'discover',status,attempt,result:structuredClone(result),sourceRefs:[{type:'place',id:'place1',version:1}],version:1});
 const deps={getRun:async()=>run(),checkSources:async()=>[{state:source,currentVersion:source==='changed'?2:1}],assertAdoptable:()=>{if(status!=='complete'||attempt!==1)throw Object.assign(new Error('stale'),{code:'STATE_CONFLICT'});},recordAdoption:()=>{},now:()=>now};
 return {repo:new DiscoveryRepository(db,'live'),service:new DiscoveryService(new DiscoveryRepository(db,'live'),deps),setSource:v=>source=v,setStatus:v=>status=v,setAttempt:v=>attempt=v,setNow:v=>now=v,deps};
}
test('real SQLite persists discovery and latest saved/blocked state with stable reaction replay',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'exploration-'));const path=join(dir,'live.sqlite');let db=database(path);
 try {
  let f=fixture(db);const input={id:'card1',assistantMessageId:'a1',expectedAttempt:1};
  const card=await f.service.create(ctx,input);assert.deepEqual(card.sources,result.sources);
  assert.deepEqual(await f.service.create(ctx,input),card);
  assert.equal((await f.service.list(ctx,{})).items.length,0);
  const reaction=await f.service.react(ctx,'card1',{id:'reaction1',reaction:'saved'});
  assert.deepEqual(await f.service.react(ctx,'card1',{id:'reaction1',reaction:'saved'}),reaction);
  assert.equal((await f.service.list(ctx,{})).items[0].id,'card1');
  db.close();db=database(path);f=fixture(db);
  assert.equal((await f.service.get(ctx,'card1')).knowledge,result.knowledge);
  assert.equal((await f.service.reaction(ctx,'card1','reaction1')).reaction,'saved');
  await f.service.react(ctx,'card1',{id:'reaction2',reaction:'dismissed'});
  await f.service.react(ctx,'card1',{id:'reaction3',reaction:'interested'});
  assert.equal((await f.service.list(ctx,{})).items.length,0);
  assert.equal((await f.service.reactions(ctx,'card1',{})).items.length,3);
  await assert.rejects(f.service.react(ctx,'card1',{id:'reaction1',reaction:'blocked'}),{code:'REQUEST_CONFLICT'});
  await assert.rejects(f.service.get({...ctx,personId:'p2'},'card1'),{code:'NOT_FOUND'});
  await assert.rejects(f.service.get({...ctx,dataMode:'demo'},'card1'),{code:'NOT_FOUND'});
  f.setSource('changed');await assert.rejects(f.service.get(ctx,'card1'),{code:'SOURCE_CHANGED'});
  f.setSource('unavailable');await assert.rejects(f.service.get(ctx,'card1'),{code:'NOT_FOUND'});
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('cancelled/stale run cannot be adopted and delete leaves receipt preventing resurrection',async()=>{
 const db=database(':memory:');try {
  const f=fixture(db),input={id:'card1',assistantMessageId:'a1',expectedAttempt:1};
  f.setStatus('cancelled');await assert.rejects(f.service.create(ctx,input),{code:'NOT_READY'});
  f.setStatus('complete');f.setAttempt(2);await assert.rejects(f.service.create(ctx,input),{code:'STATE_CONFLICT'});
  f.setAttempt(1);await f.service.create(ctx,input);
  await assert.rejects(f.service.remove(ctx,'card1',2),{code:'VERSION_CONFLICT'});
  await f.service.remove(ctx,'card1',1);
  await assert.rejects(f.service.create(ctx,input),{code:'NOT_FOUND'});
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM discovery_reactions').get().n,0);
 }finally{db.close();}
});
test('source changes or cancellation between AI read and commit prevent adoption',async()=>{
 const db=database(':memory:');try {
  const f=fixture(db);f.deps.checkSources=async()=>{f.setStatus('cancelled');return [{state:'current'}];};
  await assert.rejects(f.service.create(ctx,{id:'card1',assistantMessageId:'a1',expectedAttempt:1}),{code:'STATE_CONFLICT'});
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM discovery_cards').get().n,0);
 }finally{db.close();}
});
