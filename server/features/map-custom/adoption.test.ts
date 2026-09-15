// Fixed completed-result fixture tests adoption storage; this is NOT a real AI execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {openDatabases} from '../../db/connection.ts';
import {transaction} from '../../db/migrate.ts';
import {loadLocalIdentity,seedProfiles} from '../../core/session.ts';
import {createConversation,readAppliedRefs} from '../../ai/index.ts';
import {getTask} from '../../ai/registry.ts';
import {PluginRegistry,PluginService,PluginStore} from '../plugins/index.ts';
import {MapCustomRepository} from './repository.ts';
import {MapCustomAdoption} from './adoption.ts';
import {registerMapstyleTask} from './mapstyle.ts';
registerMapstyleTask();

test('fixed result: preview/cancel/conflicts and atomic settings + common applied reference with replay',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'map-custom-adopt-'));
  const migrations=[{id:'plugins-001',sql:readFileSync(new URL('../../db/migrations/plugins/001-plugins.sql',import.meta.url),'utf8')},{id:'map-custom/001',sql:readFileSync(new URL('../../db/migrations/map-custom/001-map-custom.sql',import.meta.url),'utf8')}];
  const dbs=openDatabases({livePath:join(directory,'live.sqlite'),demoPath:join(directory,'demo.sqlite'),migrations});
  try {
    const identity=loadLocalIdentity(join(directory,'profiles.json'));seedProfiles(dbs,identity.profiles);
    const context={personId:identity.profiles[0]!.id,dataMode:'live' as const,requestId:randomUUID(),signal:new AbortController().signal};
    const db=dbs.live,repository=new MapCustomRepository(db,context),adoption=new MapCustomAdoption(db,context);
    const conversationId=randomUUID();createConversation(db,context,{id:conversationId,purpose:'consult',title:'採用の固定結果検証',recordId:null});
    let position=0;
    async function preview() {
      const current=repository.getSettings(),messageId=randomUUID();
      const request={conversationId,userMessageId:randomUUID(),assistantMessageId:messageId,task:'mapstyle',text:'夜に落ち着いた地図',input:{current:current.style},expectedRefs:[]};
      await getTask('mapstyle').definition.readMaterials(db,context,request.input,request);
      const result={proposal:{...current.style,lightPreset:'night'},explanation:'固定結果の保存検証。実AI応答ではありません。'};
      db.prepare(`INSERT INTO messages(id,version,created_at,updated_at,conversation_id,position,role,body,status,attempt,model,source_refs_json,task,request_hash,request_json,result_json,applied_refs_json)
        VALUES(?,3,1,1,?,?,'assistant',?,'complete',1,'test-fixture','[]','mapstyle','fixture',?,?,'[]')`).run(messageId,conversationId,++position,result.explanation,JSON.stringify({...request,model:'test-fixture',promptVersion:'map-custom-v1',sourceRefs:[]}),JSON.stringify(result));
      const verified=await adoption.verifiedResult(messageId);
      const value=transaction(db,()=>adoption.createPreviewSync(messageId,verified));
      assert.deepEqual(repository.getSettings(),current,'proposal/preview must not save settings');
      return {value,verified,current,messageId};
    }
    const first=await preview();
    db.exec(`CREATE TRIGGER fail_applied_ref BEFORE UPDATE OF applied_refs_json ON messages BEGIN SELECT RAISE(ABORT,'test write failure'); END;`);
    assert.throws(()=>transaction(db,()=>adoption.adoptSync(first.value.id,first.current.version,first.verified)),/test write failure/);
    assert.deepEqual(repository.getSettings(),first.current);assert.deepEqual(readAppliedRefs(db,context,first.messageId),[]);assert.equal(adoption.getPreview(first.value.id).state,'ready');
    db.exec('DROP TRIGGER fail_applied_ref');
    const applied=transaction(db,()=>adoption.adoptSync(first.value.id,first.current.version,first.verified));
    assert.equal(applied.settings.style.lightPreset,'night');assert.equal(applied.settings.version,first.current.version+1);assert.equal(applied.preview.state,'applied');
    assert.equal(readAppliedRefs(db,context,first.messageId).length,1);
    const currentVerified=await adoption.verifiedResult(first.messageId);
    const replay=transaction(db,()=>adoption.adoptSync(first.value.id,first.current.version,currentVerified));
    assert.equal(replay.alreadyApplied,true);assert.equal(replay.settings.version,applied.settings.version);assert.equal(readAppliedRefs(db,context,first.messageId).length,1);
    const cancelled=await preview();transaction(db,()=>adoption.cancelSync(cancelled.value.id,cancelled.value.version));
    assert.throws(()=>transaction(db,()=>adoption.adoptSync(cancelled.value.id,cancelled.current.version,cancelled.verified)),(e:any)=>e.code==='STATE_CONFLICT');
    const stale=await preview();transaction(db,()=>repository.saveSettings(stale.current.version,{style:{...stale.current.style,theme:'faded'},layers:stale.current.layers}));
    assert.throws(()=>transaction(db,()=>adoption.adoptSync(stale.value.id,stale.current.version,stale.verified)),(e:any)=>e.code==='VERSION_CONFLICT');
    const changed=await preview();
    const registry=new PluginRegistry();registry.register({manifest:{id:'test-state-change',name:'Test fixture',description:'Test only',category:'test',author:'test',pluginVersion:'1',updatedAt:1,changeLog:'fixture',icon:'map',usageInfo:[],sources:[],settingsSchema:{type:'object',additionalProperties:false},defaultSettings:{},trialConditions:[]},declarations:()=>[{targetKey:'layer:bike',property:'visibility',value:true}],trial:()=>({dataKind:'mock',label:'Test fixture',declarations:[],features:[],legends:[],sources:[],generatedAt:1,warnings:[]})});
    const plugins=new PluginService(new PluginStore(db,context),registry);
    await plugins.install({id:'test-state-change',pluginVersion:'1',enabled:true,settings:{},confirmed:true,stateRevision:plugins.state().revision});
    assert.throws(()=>transaction(db,()=>adoption.adoptSync(changed.value.id,changed.current.version,changed.verified)),(e:any)=>e.code==='INPUT_CHANGED');
    assert.deepEqual(repository.getSettings(),changed.current);assert.deepEqual(readAppliedRefs(db,context,changed.messageId),[]);
  } finally {dbs.close();rmSync(directory,{recursive:true,force:true});}
});
