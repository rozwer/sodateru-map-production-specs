import {createInformationService} from "../../information/service.ts";
import {registerAiTask} from "../../ai/index.ts";
import {createInsightsService} from "./service.ts";
import {createSummaryService} from "./summary.ts";
import {createInsightsFeature} from "./routes.ts";
import {createAnalysisTask} from "./analysis.ts";
import {getActivityStatistics} from "./statistics-service.ts";
import type {StatisticsRange} from "./statistics.ts";
import type {DatabaseSync} from "node:sqlite";

const insights=(db:DatabaseSync)=>createInsightsService(db,createInformationService(db));
const summaries=(db:DatabaseSync)=>createSummaryService(db,{
 insights,
 ownMaterials:(db,context,query)=>createInformationService(db).ownMaterials(context,query),
 assertSourcesCurrent:(db,context,input)=>createInformationService(db).assertSourcesCurrent(context,input)
});
const feature=createInsightsFeature(insights,summaries);
let registered=false;
export default {...feature,register(...args:Parameters<typeof feature.register>){
 if(!registered){
  registerAiTask(createAnalysisTask({insights,getRecord:(db,context,id)=>createInformationService(db).getRecord(context,id)}));
  registered=true;
 }
 args[0].get("/reflection/activity-statistics",c=>c.json({data:getActivityStatistics(c.get("db"),c.get("context"),c.get("input").query as StatisticsRange)}));
 return feature.register(...args);
}};
