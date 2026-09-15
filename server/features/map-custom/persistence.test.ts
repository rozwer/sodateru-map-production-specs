import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {openDatabases} from '../../db/connection.ts';
import {transaction} from '../../db/migrate.ts';
import {loadLocalIdentity,seedProfiles} from '../../core/session.ts';
import {CommonError} from '../../core/errors.ts';
import {MapCustomRepository} from './repository.ts';
import {validateObject,validateStyle} from './domain.ts';

test('real CORE SQLite: manual persistence survives reopen, separates owners/modes, leaves growth sources unchanged',()=>{
  const directory=mkdtempSync(join(tmpdir(),'map-custom-persistence-'));
  const paths={livePath:join(directory,'live.sqlite'),demoPath:join(directory,'demo.sqlite'),migrations:[{id:'map-custom/001',sql:readFileSync(new URL('../../db/migrations/map-custom/001-map-custom.sql',import.meta.url),'utf8')}]};
  let databases=openDatabases(paths);
  try {
    const identity=loadLocalIdentity(join(directory,'profiles.json'));
    identity.profiles.push({key:'other',id:randomUUID(),name:'別の本人'});
    seedProfiles(databases,identity.profiles);
    const context={personId:identity.profiles[0]!.id,dataMode:'live' as const,requestId:randomUUID(),signal:new AbortController().signal};
    const db=databases.live;
    db.prepare("INSERT INTO places(id,created_at,updated_at,name,longitude,latitude,provider,attribution,building_key) VALUES('growth-place',1,1,'成長元建物',139,35,'manual','test','building-1')").run();
    db.prepare(`INSERT INTO records(id,created_at,updated_at,person_id,kind,place_id,time_precision,body,purposes_json,activities_json,impression,period_answers_json,bookmarked,use_for_suggestions,visibility,shared_with_json)
      VALUES('growth-record',1,1,?,'experience','growth-place','unknown','成長元体験','["食事"]','[]','','{}',0,1,'private','[]')`).run(context.personId);
    const growthBefore={places:db.prepare('SELECT * FROM places').all(),records:db.prepare('SELECT * FROM records').all()};
    let repository=new MapCustomRepository(db,context);
    const object=transaction(db,()=>repository.createObject(validateObject({name:'🌳'.repeat(20),memo:'手動の飾り',color:'teal',size:'small',position:{longitude:139.1,latitude:35.1}})));
    const initial=repository.getSettings();
    const settings=transaction(db,()=>repository.saveSettings(initial.version,{style:validateStyle({...initial.style,lightPreset:'night',colors:{water:'#123456',greenspace:'#234567',roads:'#345678',buildings:'#456789'}}),layers:{...initial.layers,bike:true,plugins:{bike:true}}}));
    assert.throws(()=>new MapCustomRepository(db,{...context,personId:identity.profiles[1]!.id}).getObject(object.id),(e:unknown)=>e instanceof CommonError&&e.code==='NOT_FOUND');
    assert.throws(()=>new MapCustomRepository(databases.demo,{...context,dataMode:'demo'}).getObject(object.id),(e:unknown)=>e instanceof CommonError&&e.code==='NOT_FOUND');
    databases.close(); databases=openDatabases(paths); repository=new MapCustomRepository(databases.live,context);
    assert.deepEqual(repository.getObject(object.id),object);assert.deepEqual(repository.getSettings(),settings);
    assert.throws(()=>repository.saveSettings(initial.version,{style:initial.style,layers:initial.layers}),(e:unknown)=>e instanceof CommonError&&e.code==='VERSION_CONFLICT');
    transaction(databases.live,()=>repository.deleteObject(object.id,object.version));
    assert.deepEqual({places:databases.live.prepare('SELECT * FROM places').all(),records:databases.live.prepare('SELECT * FROM records').all()},growthBefore);
    assert.equal(databases.live.prepare('PRAGMA foreign_key_check').all().length,0);
  } finally {databases.close();rmSync(directory,{recursive:true,force:true});}
});
