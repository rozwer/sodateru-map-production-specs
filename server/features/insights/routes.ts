import type { DatabaseSync } from "node:sqlite";
import { defineFeature } from "../../core/features.ts";
import { expectedVersion } from "../../core/errors.ts";
import type { createInsightsService, ListInsightsInput } from "./service.ts";
import type { Review } from "./repository.ts";
import { migration } from "./migration.ts";
import {idempotentMutation,idempotencyKey} from "../../core/idempotency.ts";
import type {createSummaryService} from "./summary.ts";
import type {StatisticsRange} from "./statistics.ts";

/** The integration entry supplies INFORMATION-backed services for the selected DB. */
export function createInsightsFeature(serviceFor:(db:DatabaseSync)=>ReturnType<typeof createInsightsService>,summaryFor?:(db:DatabaseSync)=>ReturnType<typeof createSummaryService>) {
 return defineFeature({
   id:"insights",migrations:[migration],
   register(api){
     if(summaryFor){
       api.get("/reflection/summary",c=>c.json({data:summaryFor(c.get("db")).get(c.get("context"),c.get("input").query as StatisticsRange)}));
       api.post("/insights",c=>{
         const db=c.get("db"),context=c.get("context"),input=c.get("input").body as StatisticsRange&{id:string};
         const result=idempotentMutation(db,{context,operation:"POST /api/v1/insights",key:idempotencyKey(c.req.header("Idempotency-Key")),input},{
           execute(){
             const {insight,created}=summaryFor(db).create(context,input);
             return {status:created?201:200,resource:{type:"insight",id:insight.id},body:{data:insight},headers:{ETag:'"'+insight.version+'"',Location:"/api/v1/insights/"+insight.id}};
           },
           replay(stored){
             const insight=serviceFor(db).get(context,stored.resource!.id);
             return {...stored,body:{data:insight},headers:{ETag:'"'+insight.version+'"',Location:"/api/v1/insights/"+insight.id}};
           }
         });
         for(const [key,value] of Object.entries(result.headers??{}))c.header(key,value);
         return c.json(result.body as any,result.status as 200|201);
       });
     }
     api.get("/insights",c=>{
       const service=serviceFor(c.get("db"));
       return c.json(service.list(c.get("context"),c.get("input").query as ListInsightsInput));
     });
     api.get("/insights/:insightId",c=>{
       const value=serviceFor(c.get("db")).get(c.get("context"),c.req.param("insightId"));
       c.header("ETag",'"'+value.version+'"');
       return c.json({data:value});
     });
     api.patch("/insights/:insightId",c=>{
       const value=serviceFor(c.get("db")).review(c.get("context"),c.req.param("insightId"),expectedVersion(c.req.header("If-Match")),c.get("input").body as {review?:Review;reviewNote?:string|null});
       c.header("ETag",'"'+value.version+'"');
       return c.json({data:value});
     });
     api.delete("/insights/:insightId",c=>{
       serviceFor(c.get("db")).remove(c.get("context"),c.req.param("insightId"),expectedVersion(c.req.header("If-Match")));
       return c.body(null,204);
     });
   }
 });
}
