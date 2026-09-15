import {test} from "node:test";
import assert from "node:assert/strict";
import {activityStatistics} from "./statistics.ts";
test("confirmed訪問はID単位、初回は全履歴、日時不明/取消と活動原文を分離",()=>{
 const visit=(id:string,placeId:string,startedAt:number|null,status="confirmed")=>({id,placeId,startedAt,endedAt:null,timePrecision:startedAt===null?"unknown":"exact",status,origin:"manual",version:1,updatedAt:100});
 const visits=[visit("old","known",1),visit("a","known",11),visit("b","new",12),visit("b","new",12),visit("u","uncertain",null),visit("c","uncertain",13),visit("r","rejected",14,"rejected"),{...visit("ongoing","prior",1),endedAt:15}];
 const records=[{id:"r1",effectiveAt:11,endedAt:null,timePrecision:"exact",visitStatus:"confirmed",purposes:["休憩"],activities:[{id:"a1",name:"本を見つけた"}],sourceRefs:[{type:"record" as const,id:"r1",version:1}]}];
 const result=activityStatistics({from:10,to:20,timeZone:"UTC"},visits,records);
 assert.equal(result.confirmedVisits.value,3);
 assert.equal(result.newPlaces.value,1);
 assert.deepEqual(result.newPlaces.unknownPlaceIds,["uncertain"]);
 assert.equal(result.undatedVisits,1);
 assert.deepEqual(result.activities.map(a=>[a.name,a.count,a.recordIds]),[["本を見つけた",1,["r1"]]]);
 assert.equal(result.gpsDistanceMeters.value,null);
 assert.equal(result.gpsDistanceMeters.status,"unavailable");
});
