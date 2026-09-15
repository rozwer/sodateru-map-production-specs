import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateAxes, calendarDays } from "./aggregation.ts";
test("確定日判定の1 yes / 1 no / 1 unknownは1/2、未知日を分母に入れない",()=>{
 const days=["2026-09-01","2026-09-02","2026-09-03"];
 assert.deepEqual(calculateAxes(days,["confirmed-axis"],[{date:days[0],key:"confirmed-axis",value:true},{date:days[1],key:"confirmed-axis",value:false}]),[{key:"confirmed-axis",numerator:1,denominator:2,value:0.5,unknownDays:1}]);
 assert.deepEqual(calculateAxes(days,["confirmed-axis"],[]),[{key:"confirmed-axis",numerator:0,denominator:0,value:null,unknownDays:3}]);
});
test("同日の相反入力を勝手に統合せず上位の判定契約へ戻す",()=>{
 assert.throws(()=>calculateAxes(["2026-09-01"],["x"],[{date:"2026-09-01",key:"x",value:true},{date:"2026-09-01",key:"x",value:false}]));
});
test("IANA timezoneの半開期間は終端翌日を含めずDSTでも暦日数を返す",()=>{
 assert.deepEqual(calendarDays(Date.parse("2026-09-01T00:00:00+09:00"),Date.parse("2026-09-04T00:00:00+09:00"),"Asia/Tokyo"),["2026-09-01","2026-09-02","2026-09-03"]);
 assert.deepEqual(calendarDays(Date.parse("2026-03-07T00:00:00-05:00"),Date.parse("2026-03-10T00:00:00-04:00"),"America/New_York"),["2026-03-07","2026-03-08","2026-03-09"]);
});
