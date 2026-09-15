import {randomUUID} from "node:crypto";
import {writeFileSync} from "node:fs";
const origin="http://127.0.0.1:3001",suffix=randomUUID(),date=Date.now();
const from=date-3600000,to=date+3600000;
let cookie="";
async function call(path:string,method="GET",body?:unknown){
 const res=await fetch(origin+"/api/v1"+path,{method,headers:{"Content-Type":"application/json","X-Request-Id":randomUUID(),"X-Data-Mode":"demo","Idempotency-Key":randomUUID(),Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await res.json() as any;if(!res.ok)throw new Error(path+" "+res.status+" "+JSON.stringify(data));
 return {res,data};
}
const session=await call("/session","POST",{profileKey:"self"});cookie=session.res.headers.get("set-cookie")!.split(";")[0]!;
const recordId="insights-demo-"+suffix;
await call("/records","POST",{id:recordId,kind:"diary",visitId:null,placeId:null,occurredAt:date,endedAt:null,timePrecision:"exact",body:"本を見つけた。カフェで過ごした。公園を歩いた。友人と話した。\nINSIGHTS担当が作成したデモ用の合成記録です。",purposes:[],activities:[],impression:"INSIGHTS #101 デモ検証用。本人の実体験ではありません。",periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:"private",sharedWith:[]});
const summary=(await call("/reflection/summary?from="+from+"&to="+to+"&timeZone=Asia%2FTokyo")).data;
const evidence={origin,dataMode:"demo",recordId,occurredAt:date,description:"INSIGHTS担当の合成記録、他担当記録は変更なし",summary};
writeFileSync(new URL("./shared-demo-seed.json",import.meta.url),JSON.stringify(evidence,null,2)+"\n");
console.log(JSON.stringify({recordId,axes:summary.data.result.axes}));
