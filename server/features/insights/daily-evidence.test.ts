import {test} from "node:test";
import assert from "node:assert/strict";
import {deriveDailyEvidence} from "./daily-evidence.ts";
const from=Date.parse("2026-09-01T00:00:00Z"),day=86400000;
const record=(id:string,body:string,offset=0,activities:{id:string;name:string}[]=[])=>({id,body,effectiveAt:from+offset*day,timePrecision:"exact",activities,sourceRefs:[{type:"record" as const,id,version:1}]});
test("固定5軸: 本を見つけたを含め同日重複は1、明記なしは不明",()=>{
 const result=deriveDailyEvidence({from,to:from+3*day,timeZone:"UTC"},[
 record("a","本を見つけた。カフェで過ごした。公園を歩いた。友人と話した。"),
 record("b","本を読んだ。"),record("c","今日は一日、本を読まなかった。本を見つけなかった。",1)
 ]);
 assert.deepEqual(result.axes.map(a=>a.key),["nature","books","cafe","walk","social"]);
 const books=result.axes.find(a=>a.key==="books")!;
 assert.equal(books.numerator,1);assert.equal(books.denominator,1);assert.equal(books.unknownDays,2);
 assert.equal(result.evidence.selfReports.find(e=>e.recordId==="a")?.quote,"本を見つけた");
 assert.ok(result.daily.find(d=>d.date==="2026-09-01"&&d.key==="walk")?.value);
});
test("願望・他人・日時不明はyesにせず、明示日否定と競合は根拠付き不明",()=>{
 const result=deriveDailyEvidence({from,to:from+2*day,timeZone:"UTC"},[
 record("wish","本を読みたい。本を読んだ？友人が本を読んだ。カフェに行く予定。"),
 record("no","今日は一日、散歩をしなかった。"),
 record("yes","散歩をした。"),{...record("undated","本を読んだ。"),timePrecision:"unknown"},
 record("social-no","今日は一日、誰とも過ごさなかった。",1)
 ]);
 assert.equal(result.axes.find(a=>a.key==="books")?.value,null);
 assert.equal(result.daily.find(d=>d.date==="2026-09-01"&&d.key==="walk")?.value,null);
 assert.ok(result.evidence.counterexamples.some(e=>e.recordId==="no"));
 const social=result.axes.find(a=>a.key==="social")!;
 assert.equal(social.value,0);assert.equal(social.denominator,1);
 assert.ok(result.unknown.some(s=>s.includes("日時")));
});
