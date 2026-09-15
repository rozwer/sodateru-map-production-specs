import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {openDatabases} from "../../db/connection.ts";
import {loadLocalIdentity,seedProfiles} from "../../core/session.ts";
import {transaction} from "../../db/migrate.ts";
import {migration} from "./migration.ts";
import {createInsightsService} from "./service.ts";
import {createAnalysisTask} from "./analysis.ts";

test("AI説明の保存は数値と本人判断を保持し、外側transaction失敗で全部rollback",()=>{
 const dir=mkdtempSync(join(tmpdir(),"insights-analysis-"));
 const dbs=openDatabases({livePath:join(dir,"live.sqlite"),demoPath:join(dir,"demo.sqlite"),migrations:[migration]});
 const identity=loadLocalIdentity(join(dir,"profiles.json"));seedProfiles(dbs,identity.profiles);
 const ctx={personId:identity.profiles[0]!.id,dataMode:"live" as const,requestId:"test",signal:new AbortController().signal};
 const service=createInsightsService(dbs.live,{checkSources:(_,{refs})=>{assert.equal(refs.length,0);return [];}});
 const task=createAnalysisTask({insights:()=>service,getRecord:()=>{throw new Error("No record refs in empty-period fixture");}});
 try{
 const axes=[{key:"detour",numerator:0,denominator:0,value:null,unknownDays:1}];
 service.saveAnalysis(ctx,{id:"base",conditions:{},sourceRefs:[],rangeStart:0,rangeEnd:86400000,timeZone:"UTC",generatorVersion:"computed-test",model:null,summary:"",result:{axes,unknown:["記録なし"]}});
 service.review(ctx,"base",1,{review:"unsure",reviewNote:"判断できない"});
 const materials=task.readMaterials(dbs.live,ctx,{insightId:"base"});
 assert.throws(()=>task.validateResult({summary:"不明",evidenceIds:["invented"],unknowns:[]},materials),{code:"OUTPUT_INVALID"});
 const request={input:{insightId:"base"},text:"説明",assistantMessageId:"generated",model:"test-model",promptVersion:"test-prompt"};
 const output={summary:"この期間は記録不足で傾向を判断できません。",evidenceIds:[],unknowns:["材料が不足"]};
 assert.throws(()=>transaction(dbs.live,()=>{task.persistResult(dbs.live,ctx,output,materials,request);throw new Error("message write failed");}));
 assert.equal(dbs.live.prepare("SELECT COUNT(*) n FROM insights WHERE id='generated'").get()?.n,0);
 assert.equal(dbs.live.prepare("SELECT COUNT(*) n FROM insights_creation_receipts WHERE id='generated'").get()?.n,0);
 transaction(dbs.live,()=>task.persistResult(dbs.live,ctx,output,materials,request));
 const saved=service.get(ctx,"generated");
 assert.deepEqual((saved.result as any).axes,axes);
 assert.equal(saved.review,"unsure");assert.equal(saved.reviewNote,"判断できない");
 assert.deepEqual((saved.result as any).unknown,["記録なし","材料が不足"]);
 }finally{dbs.close();rmSync(dir,{recursive:true,force:true});}
});
