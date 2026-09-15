import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabases } from '../../db/connection.ts';
import { transaction } from '../../db/migrate.ts';
import { seedProfiles } from '../../core/session.ts';
import { createRecord,patchRecord,deleteRecord } from '../records/service.ts';
import records from '../records/register.ts';
import { registerMemoExtension } from './record-extension.ts';
import { themesMigration } from './register.ts';
import { createTheme,getTheme,readMemoPresentation } from './service.ts';

test('RECORDS transaction saves memo presentation and keeps ordinary long answers and independent body',()=>{
  const dir=mkdtempSync(join(tmpdir(),'themes-records-'));
  const databases=openDatabases({livePath:join(dir,'live.sqlite'),demoPath:join(dir,'demo.sqlite'),migrations:[...(records.migrations??[]),themesMigration]});
  seedProfiles(databases,[{key:'self',id:'p',name:'本人'}]);
  registerMemoExtension();const db=databases.live;
  const base={visitId:null,placeId:null,occurredAt:null,endedAt:null,timePrecision:'unknown' as const,purposes:[],activities:[],impression:'',periodAnswers:{},bookmarked:false,useForSuggestions:true,topicKey:null,visibility:'private' as const,sharedWith:[]};
  try {
    const source=transaction(db,()=>createRecord(db,'p',{...base,id:'source',kind:'experience',body:'元の体験'}));
    const memo={name:'次の希望',originRefs:[{type:'record' as const,id:source.id,version:source.version}],keywords:['休憩']};
    const input={...base,id:'memo',kind:'memo' as const,body:'屋内で休みたい',memo};
    transaction(db,()=>createRecord(db,'p',input));
    assert.deepEqual(readMemoPresentation(db,'p','memo'),memo);
    const ordinary=transaction(db,()=>createRecord(db,'p',{...base,id:'answer',kind:'memo',body:'あ'.repeat(300)}));
    assert.equal(ordinary.body.length,300);assert.equal(readMemoPresentation(db,'p','answer'),null);
    assert.throws(()=>transaction(db,()=>patchRecord(db,'p','memo',{body:'あ'.repeat(201)},1)),{code:'VALIDATION_FAILED'});
    assert.equal(db.prepare("SELECT body FROM records WHERE id='memo'").get()!.body,'屋内で休みたい');
    const edited=transaction(db,()=>patchRecord(db,'p','memo',{body:'次は静かな屋内',useForSuggestions:false},1));
    assert.equal(edited.useForSuggestions,false);assert.deepEqual(readMemoPresentation(db,'p','memo'),memo);
    createTheme(db,'p',{id:'t',name:'体験',description:'',recordIds:['source','memo']});
    transaction(db,()=>deleteRecord(db,'p','source',1));
    assert.deepEqual(getTheme(db,'p','t').recordIds,['memo']);
    assert.deepEqual(readMemoPresentation(db,'p','memo')!.originRefs,[]);
    assert.equal(db.prepare("SELECT body FROM records WHERE id='memo'").get()!.body,'次は静かな屋内');
    assert.equal(readMemoPresentation(db,'p','memo')!.name,'次の希望');
  } finally {databases.close();rmSync(dir,{recursive:true,force:true});}
});
