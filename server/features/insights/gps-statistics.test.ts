import {test} from "node:test";
import assert from "node:assert/strict";
import {gpsStatistics} from "./gps-statistics.ts";
const range={from:0,to:100,timeZone:"UTC"};
const point=(id:string,time:number,lon:number,segmentId="s",breakBefore=false)=>({id,sourcePointId:id,observedAt:time,longitude:lon,latitude:0,accuracyM:5,segmentId,breakBefore,updatedAt:time});
test("GPS観測距離は同じ区間の実在辺だけ、削除切断/別区間/期間外をつながない",()=>{
 const result=gpsStatistics(range,[point("a",1,0),point("b",2,1),point("c",3,10,"s",true),point("d",4,20,"other"),point("out",101,40)]);
 assert.ok(Math.abs(result.value!-111195.08)<1);
 assert.equal(result.edgeCount,1);assert.equal(result.pointCount,4);assert.equal(result.status,"observed");
 assert.equal(gpsStatistics(range,[]).value,null);
 assert.equal(gpsStatistics(range,[point("single",1,0)]).value,null);
 assert.equal(gpsStatistics(range,[point("still1",1,0),point("still2",2,0)]).value,0);
});
