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


test("承認済み原文と補完14記録から日別割合を計算し、無記録4日は分母に含めない",async()=>{
 const {readFileSync}=await import("node:fs");
 const data=JSON.parse(readFileSync(new URL("../../../docs/evidence/INSIGHTS/self-type-diagnosis-grounded-demo.json",import.meta.url),"utf8"));
 const range={from:Date.parse("2026-09-02T00:00:00+09:00"),to:Date.parse("2026-09-16T00:00:00+09:00"),timeZone:"Asia/Tokyo"};
 const records=data.records.map((r:any)=>({
  id:r.id,body:r.text,effectiveAt:Date.parse(r.date+"T"+(r.time??"00:00")+":00+09:00"),
  timePrecision:r.time?"exact":"approximate",
  // These explicit activities retain the place+text context of the two source scenes.
  // A venue category alone never creates a claim.
  activities:r.id==="rehearsal-0910-cafe"?[{id:"cafe-experience",name:"カフェで過ごす"}]:
   r.id==="rehearsal-0910-park"?[{id:"green-experience",name:"自然に触れる"}]:[],
  sourceRefs:[{type:"record" as const,id:r.id,version:1}]
 }));
 const result=deriveDailyEvidence(range,records);
 assert.deepEqual(result.axes.map(a=>[a.numerator,a.denominator,a.unknownDays]),[[6,10,4],[8,10,4],[6,10,4],[8,10,4],[4,10,4]]);
 assert.deepEqual(result.daily,data.daily.map(({date,key,value,recordIds}:any)=>({date,key,value,recordIds})));
 assert.ok(result.evidence.selfReports.every(e=>e.field==="activities"||records.find((r:any)=>r.id===e.recordId).body.includes(e.quote)));
});

test("自然文の願望・伝聞・他人・用途・部分否定・場所名だけは体験にしない",()=>{
 const result=deriveDailyEvidence({from,to:from+day,timeZone:"UTC"},[
 record("wish","公園を散歩して本を読みたい。友人とカフェで話す予定だった。"),
 record("other","友人が公園を散歩した。友人が本を読んだと聞いた。"),
 record("partial","本を読まなかった。本を見つけなかった。カフェの近くで待った。"),
 record("question","カフェで本を読んだ？公園を散歩した？"),
 record("future","明日は公園を散歩してから本を読む。"),
 record("unrealized","本を読んだことはない。散歩していない。本を開いていない。本を読んだら話そう。")
 ]);
 assert.ok(result.axes.every(a=>a.value===null&&a.denominator===0));
});

test("否定された体験と一部時間帯の不実施を日全体の判定にしない",()=>{
 const result=deriveDailyEvidence({from,to:from+day,timeZone:"UTC"},[
 record("denied","本を読んだわけではない。友人と話したわけではない。"),
 record("morning","朝は散歩しなかった。午後は家で休んだ。"),
 record("evening","夜はカフェに行かなかった。")
 ]);
 assert.ok(result.axes.every(a=>a.denominator===0&&a.value===null));
});
