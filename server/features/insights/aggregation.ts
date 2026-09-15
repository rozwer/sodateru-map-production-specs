import type { AnalysisAxis } from "./repository.ts";
export type DailyJudgement={date:string;key:string;value:boolean|null};

/** Math only: the caller supplies one adjudicated judgement per axis/day.
 * Deriving judgements from record text, purposes, or contradictory answers is not done here.
 */
export function calculateAxes(days:readonly string[],keys:readonly string[],judgements:readonly DailyJudgement[]):AnalysisAxis[]{
 if(new Set(days).size!==days.length||new Set(keys).size!==keys.length)throw new TypeError("Duplicate day or axis");
 const byDay=new Map<string,boolean|null>();
 for(const item of judgements){
   if(!days.includes(item.date)||!keys.includes(item.key)||![true,false,null].includes(item.value))throw new TypeError("Invalid daily judgement");
   const key=item.key+"|"+item.date;
   if(byDay.has(key))throw new TypeError("Daily judgements must be resolved before aggregation");
   byDay.set(key,item.value);
 }
 return keys.map(key=>{
   let numerator=0,denominator=0;
   for(const date of days){
     const value=byDay.get(key+"|"+date);
     if(typeof value==="boolean"){denominator++;if(value)numerator++;}
   }
   return {key,numerator,denominator,value:denominator===0?null:numerator/denominator,unknownDays:days.length-denominator};
 });
}

export function dateInZone(timestamp:number,timeZone:string):string{
 const parts=new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(timestamp);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 return part("year")+"-"+part("month")+"-"+part("day");
}

export function calendarDays(from:number,to:number,timeZone:string):string[]{
 if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||to<=from)throw new TypeError("Invalid half-open range");
 // Sampling UTC hours follows actual IANA calendar dates, including DST and skipped dates.
 // Ordinary calendar days exceed one hour; timestamps are millisecond precision.
 const days=new Set<string>([dateInZone(from,timeZone),dateInZone(to-1,timeZone)]);
 const formatter=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"});
 for(let at=from;at<to;at+=3_600_000){
   const parts=formatter.formatToParts(at);
   const part=(type:string)=>parts.find(p=>p.type===type)!.value;
   days.add(part("year")+"-"+part("month")+"-"+part("day"));
 }
 return [...days].sort();
}
