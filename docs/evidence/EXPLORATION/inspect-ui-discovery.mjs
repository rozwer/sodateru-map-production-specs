import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const prior=JSON.parse(readFileSync(new URL('./live-storable-route.json',import.meta.url)));
const cardId='c22ce365-a497-4da7-a4ce-3665734f7f44',runId='d136f521-545e-4a25-8046-68dc989e1680';
const db=new DatabaseSync(prior.databaseDirectory+'/live.sqlite',{readOnly:true});
try{
 const card=db.prepare('SELECT id,anchor_json,bridge,knowledge,observation_prompt,sources_json,source_refs_json,version FROM discovery_cards WHERE id=?').get(cardId);
 const run=db.prepare('SELECT id,status,attempt,model,source_refs_json,applied_refs_json FROM messages WHERE id=?').get(runId);
 assert.ok(card);assert.equal(run.status,'complete');assert.equal(run.model,'gpt-5.6-luna');
 const anchor=JSON.parse(card.anchor_json),sources=JSON.parse(card.sources_json),refs=JSON.parse(card.source_refs_json),applied=JSON.parse(run.applied_refs_json);
 assert.equal(sources.length,1);assert.equal(sources[0].claimScope,'place-specific');assert.equal(sources[0].sourceId,anchor.targetId);
 assert.ok(refs.some(r=>r.type==='place'&&r.id===anchor.targetId));assert.ok(applied.some(r=>r.type==='discovery'&&r.id===cardId));
 const reactions=db.prepare('SELECT reaction FROM discovery_reactions WHERE card_id=? ORDER BY created_at DESC,id ASC').all(cardId);
 assert.equal(reactions[0].reaction,'saved');
 const proof={status:'partial-ui',databaseDirectory:prior.databaseDirectory,entry:'server/app/main.ts',client:'正式UI / packages/api-client',cardId,run,anchor,sources,sourceRefs:refs,reactions,apiChecks:{completeRealLuna:true,placeSpecificSource:true,sourceRefMatchesAnchor:true,appliedReference:true,savedReaction:true},uiObservations:{consentEnabled:true,postConsentReturnedToBlankRoute:true,browserBackToOriginalRouteRecoveredCard:true,saveReactionClicked:true,browserReloadThenSavedListReopenedCard:true,sourceLabel:'対象の出典',knowledgeMatchedRegisteredPlace:true},remaining:'同意完了後に元route params/cardを直接表示する修正はCONNECT-EXPLORE #136'};
 writeFileSync(new URL('./live-discovery-ui.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{db.close();}
