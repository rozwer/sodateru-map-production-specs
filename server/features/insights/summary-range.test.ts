import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {openDatabases} from "../../db/connection.ts";
import {loadLocalIdentity,seedProfiles} from "../../core/session.ts";
import {createInformationService} from "../../information/service.ts";
import {createRecord} from "../records/service.ts";
import records from "../records/register.ts";
import {createSummaryService} from "./summary.ts";
import {createInsightsService} from "./service.ts";
import {migration} from "./migration.ts";
test("INFORMATIONのrange契約を使い期間外の記録を根拠へ混入させない",()=>{
 const dir=mkdtempSync(join(tmpdir(),"summary-range-")),identity=loadLocalIdentity(join(dir,"profiles.json"));
 const dbs=openDatabases({livePath:join(dir,"live.sqlite"),demoPath:join(dir,"demo.sqlite"),migrations:[...records.migrations!,migration]});
 seedProfiles(dbs,identity.profiles);
 try{
 const db=dbs.live,context={personId:identity.profiles[0]!.id,dataMode:"live" as const,requestId:"range-check",signal:new AbortController().signal};
 const base={kind:"diary",visitId:null,placeId:null,endedAt:null,timePrecision:"exact",body:"本を読んだ。",purposes:[],activities:[],impression:"",periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:"private",sharedWith:[]};
 createRecord(db,context.personId,{...base,id:"inside",occurredAt:1500});
 createRecord(db,context.personId,{...base,id:"outside",occurredAt:500});
 createRecord(db,context.personId,{...base,id:"undated",occurredAt:null,timePrecision:"unknown"});
 const service=createSummaryService(db,{
  ownMaterials:(db,c,q)=>createInformationService(db).ownMaterials(c,q),
  assertSourcesCurrent:(db,c,q)=>createInformationService(db).assertSourcesCurrent(c,q),
  insights:db=>createInsightsService(db,createInformationService(db))
 });
 const summary=service.get(context,{from:1000,to:2000,timeZone:"UTC"});
 assert.deepEqual(summary.sourceRefs.map(r=>r.id),["inside","undated"]);
 assert.equal(summary.result.axes.find(a=>a.key==="books")!.numerator,1);
 assert.ok(summary.result.unknown.some(text=>text.includes("日時")));
 }finally{dbs.close();}
});
