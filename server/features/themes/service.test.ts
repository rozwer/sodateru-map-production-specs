import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTheme, getTheme, patchTheme, deleteTheme, listThemes, writeMemoPresentation, readMemoPresentation } from './service.ts';

function fixture(path=':memory:') {
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE people(id TEXT PRIMARY KEY);
    CREATE TABLE records(id TEXT PRIMARY KEY,person_id TEXT,kind TEXT,body TEXT,version INTEGER,updated_at INTEGER);
    CREATE TABLE media(id TEXT PRIMARY KEY,record_id TEXT REFERENCES records(id) ON DELETE CASCADE,kind TEXT,status TEXT);
    CREATE TABLE themes(id TEXT PRIMARY KEY,person_id TEXT,name TEXT,description TEXT,record_ids_json TEXT,version INTEGER,created_at INTEGER,updated_at INTEGER);
    CREATE TABLE suggestions(id TEXT PRIMARY KEY,person_id TEXT,version INTEGER);
    INSERT INTO records VALUES ('r1','p','experience','first',1,1),('r2','p','experience','second',1,1),('other','q','experience','private',1,1),('memo','p','memo','keep me',1,1);
    INSERT INTO media VALUES ('photo','r1','photo','ready'),('private','other','photo','ready');
    INSERT INTO suggestions VALUES ('s','p',1);`);
  db.exec(readFileSync(new URL('../../db/migrations/themes/001-presentation.sql',import.meta.url),'utf8'));
  return db;
}
test('same-name themes preserve separate IDs, memberships and presentation across reopen',()=>{
  const dir=mkdtempSync(join(tmpdir(),'themes-test-')), path=join(dir,'test.sqlite');
  let db=fixture(path);
  try {
    const first=createTheme(db,'p',{id:'t1',name:'散歩',description:'',recordIds:['r1','r1'],colorKey:'blue',coverMediaId:'photo'});
    createTheme(db,'p',{id:'t2',name:'散歩',description:'',recordIds:['r1']});
    assert.deepEqual(first.recordIds,['r1']);
    const changed=patchTheme(db,'p','t1',1,{recordIds:['r1','r2'],name:'休憩',colorKey:'pink'});
    assert.equal(changed.version,2);
    assert.throws(()=>patchTheme(db,'p','t1',1,{name:'stale'}),{code:'VERSION_CONFLICT'});
    assert.throws(()=>getTheme(db,'q','t1'),{code:'NOT_FOUND'});
    assert.throws(()=>patchTheme(db,'p','t1',2,{recordIds:['other']}),{code:'VALIDATION_FAILED'});
    assert.throws(()=>patchTheme(db,'p','t1',2,{coverMediaId:'private'}),{code:'VALIDATION_FAILED'});
    db.close();db=new DatabaseSync(path);
    assert.deepEqual(getTheme(db,'p','t1'),changed);
    const page=listThemes(db,'p','live',1);
    assert.ok(page.nextCursor);
    const next=listThemes(db,'p','live',1,page.nextCursor!);
    assert.equal(page.items.length,1);assert.equal(next.items.length,1);
    assert.notEqual(page.items[0]!.id,next.items[0]!.id);
    assert.throws(()=>listThemes(db,'p','demo',1,page.nextCursor!),{code:'INVALID_REQUEST'});
    deleteTheme(db,'p','t1',2);
    assert.throws(()=>getTheme(db,'p','t1'),{code:'NOT_FOUND'});
    assert.deepEqual(getTheme(db,'p','t2').recordIds,['r1']);
    assert.equal(db.prepare('SELECT count(*) n FROM records').get()!.n,4);
  } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});
test('structured memo origins and keywords persist, stale origin rejects and removal keeps body',()=>{
  const db=fixture();
  try {
    const memo={name:'次の希望',originRefs:[{type:'record',id:'r1',version:1},{type:'suggestion',id:'s',version:1}],keywords:['休憩','雨']};
    writeMemoPresentation(db,'p','memo',memo);
    assert.deepEqual(readMemoPresentation(db,'p','memo'),memo);
    assert.equal(readMemoPresentation(db,'q','memo'),null);
    db.exec("UPDATE records SET version=2 WHERE id='r1'");
    assert.throws(()=>writeMemoPresentation(db,'p','memo',memo),{code:'INPUT_CHANGED'});
    writeMemoPresentation(db,'p','memo',{...memo,originRefs:[]});
    assert.deepEqual(readMemoPresentation(db,'p','memo')!.originRefs,[]);
    assert.equal(db.prepare("SELECT body FROM records WHERE id='memo'").get()!.body,'keep me');
  } finally {db.close();}
});
