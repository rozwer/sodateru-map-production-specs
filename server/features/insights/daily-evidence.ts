import {calculateAxes,calendarDays,dateInZone} from "./aggregation.ts";
import {classifyNaturalStatement} from "./natural-statements.ts";
import {normalizeRefs,type SourceRef} from "./identity.ts";
import type {StatisticsRange} from "./statistics.ts";

export const axisDefinitions=[
 {key:"nature",label:"自然"},{key:"books",label:"本"},{key:"cafe",label:"カフェ"},
 {key:"walk",label:"散歩"},{key:"social",label:"人との時間"}
] as const;
export type AxisKey=typeof axisDefinitions[number]["key"];
export type ExperienceRecord={id:string;body:string;effectiveAt:number|null;timePrecision:string;activities:{id:string;name:string}[];sourceRefs:SourceRef[]};
export type StatementEvidence={recordId:string;date:string;key:AxisKey;quote:string;field:"body"|"activities";value:boolean;sourceRefs:SourceRef[]};
export type StructuredEvidence={
 selfReports:StatementEvidence[];
 observations:{key:AxisKey;text:string;dates:string[]}[];
 inferences:{text:string;evidenceIds:string[]}[];
 counterexamples:StatementEvidence[];
 unknown:{key:AxisKey|null;date:string|null;reason:string;recordIds:string[]}[];
};

// Deliberately bounded, versioned patterns. Unrecognised text remains unknown.
// These templates recognise an explicit first-person completed experience, not wishes,
// another person's experience, a venue category, or a recorded purpose.
const positive:Record<AxisKey,RegExp>={
 nature:/^(?:(?:公園|森|林|山|海辺|川辺|自然の中)(?:で過ごした|を歩いた|を散歩した)|自然に触れた|自然を楽しんだ)$/,
 books:/^(?:(?:本|書籍|小説|絵本|漫画)(?:を読んだ|を見つけた|を探した|を眺めた|を買った)|読書をした)$/,
 cafe:/^(?:(?:カフェ|喫茶店)(?:で過ごした|で休憩した|に行った|でお茶を飲んだ|でコーヒーを飲んだ))$/,
 walk:/^(?:散歩(?:をした|した)|(?:公園|森|林|山|海辺|川辺|街|近所)(?:を歩いた|を散歩した))$/,
 social:/^(?:(?:友人|友達|家族|同僚|恋人|知人)(?:と話した|と過ごした|と会った|に会った|と食事した|と食事をした)|人と過ごした)$/
};
const activity:Record<AxisKey,RegExp>={
 nature:/^(?:自然に触れる|自然観察|森林浴)$/,books:/^(?:読書|本探し|本を見つけた)$/,
 cafe:/^(?:カフェで過ごす|カフェで休憩)$/,walk:/^(?:散歩|散歩をする)$/,social:/^(?:友人と過ごす|家族と過ごす|人との時間)$/
};
// A partial activity denial (e.g. "did not read") is not a denial of the entire books axis.
const negative:Partial<Record<AxisKey,RegExp>>={
 nature:/^自然に触れなかった$/,books:/^本に触れなかった$/,
 cafe:/^(?:カフェ|喫茶店)(?:に行かなかった|で過ごさなかった)$/,
 walk:/^散歩(?:をしなかった|しなかった)$/,
 social:/^(?:誰とも過ごさなかった|人と過ごさなかった)$/
};
function classify(quote:string,field:"body"|"activities",key:AxisKey):boolean|null{
 const text=quote.trim().replace(/^(?:私は|わたしは)/u,"").replace(/^(?:今日は|今日、)/u,"");
 const allDay=/^(?:一日中|一日|終日)[、,]?/u.test(text);
 const rest=text.replace(/^(?:一日中|一日|終日)[、,]?/u,"");
 if(allDay&&negative[key]?.test(rest))return false;
 if(positive[key].test(rest)||field==="activities"&&activity[key].test(rest))return true;
 return field==="body"?classifyNaturalStatement(rest,key):null;
}
export function deriveDailyEvidence(range:StatisticsRange,input:readonly ExperienceRecord[]){
 const days=calendarDays(range.from,range.to,range.timeZone);
 const keys=axisDefinitions.map(a=>a.key);
 const evidence:StructuredEvidence={selfReports:[],observations:[],inferences:[],counterexamples:[],unknown:[]};
 const records=[...new Map(input.map(r=>[r.id,r])).values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 for(const record of records){
   if(record.effectiveAt===null||record.timePrecision==="unknown"){
     evidence.unknown.push({key:null,date:null,reason:"体験の日時が不明のため日別判定に使っていません。",recordIds:[record.id]});continue;
   }
   if(record.effectiveAt<range.from||record.effectiveAt>=range.to)continue;
   const date=dateInZone(record.effectiveAt,range.timeZone);
   const statements=[...record.body.replace(/[^。！!？?\n]*[？?]/gu,"").split(/[。！!\n]+/u).map(quote=>({quote:quote.trim(),field:"body" as const})),
    ...record.activities.map(a=>({quote:a.name.trim(),field:"activities" as const}))].filter(s=>s.quote);
   for(const statement of statements)for(const key of keys){
     const value=classify(statement.quote,statement.field,key);
     if(value===null)continue;
     const item={recordId:record.id,date,key,...statement,value,sourceRefs:normalizeRefs(record.sourceRefs)};
     evidence.selfReports.push(item);
     if(!value)evidence.counterexamples.push(item);
   }
 }
 const daily=days.flatMap(date=>keys.map(key=>{
   const statements=evidence.selfReports.filter(s=>s.date===date&&s.key===key);
   const values=new Set(statements.map(s=>s.value));
   const value=values.size===1?[...values][0]!:null;
   const recordIds=[...new Set(statements.map(s=>s.recordId))].sort();
   if(value===null)evidence.unknown.push({key,date,reason:values.size>1?"同日の体験ありと一日全体の否定が矛盾しています。":"日全体を判断できる明示的な記録がありません。",recordIds});
   return {date,key,value,recordIds};
 }));
 const axes=calculateAxes(days,keys,daily);
 evidence.observations=axes.map(a=>({key:a.key as AxisKey,text:a.denominator?`判断可能な${a.denominator}日のうち体験ありは${a.numerator}日。不明は${a.unknownDays}日。`:`判断可能な日は0日。不明は${a.unknownDays}日。`,dates:daily.filter(d=>d.key===a.key&&d.value!==null).map(d=>d.date)}));
 const unknown=[...new Set(evidence.unknown.map(e=>e.reason))];
 unknown.push("明示的な体験の記録から集計した暫定結果です。記録のない日は不明で、人格や検証済みの傾向を示しません。");
 return {axes,daily,evidence,unknown,provisionalName:"この期間に記録された体験（暫定）"};
}
