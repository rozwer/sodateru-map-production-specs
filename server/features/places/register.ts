import {readFileSync} from "node:fs";
import {defineFeature} from "../../core/features.ts";
import type {ContentfulStatusCode} from "hono/utils/http-status";
import {idempotencyKey,idempotentMutation} from "../../core/idempotency.ts";
import {getPlace} from "./repository.ts";
import {placesService,listPlaces,validateSearch,validateCreate} from "./service.ts";
import {candidateResultDto} from "./http-dto.ts";

export default defineFeature({
  id:"PLACES",
  migrations:[{id:"places-001-details",sql:readFileSync(new URL("../../db/migrations/places/001-details.sql",import.meta.url),"utf8")}],
  register(api) {
    api.get("/places",c=>c.json(listPlaces(c.get("context"),c.get("db"),c.req.query())));
    api.get("/place-candidates",async c=>c.json({data:candidateResultDto(await placesService.search(c.get("context"),c.get("db"),validateSearch(c.req.query())))}));
    api.get("/places/:placeId",async c=>{
      const {getPlaceDetail}=await import("./detail.ts");
      const detail=await getPlaceDetail(c.get("context"),c.get("db"),c.req.param("placeId"));
      c.header("ETag",`"${detail.place.version}"`);
      return c.json({data:detail});
    });
    api.post("/places",async c=>{
      const context=c.get("context"),db=c.get("db"),input=validateCreate(c.get("input").body??await c.req.json());
      const result=idempotentMutation(db,{context,operation:"POST /api/v1/places",key:idempotencyKey(c.req.header("Idempotency-Key")),input},{
        execute(){
          const {place,created}=placesService.adopt(context,db,input);
          return {status:created?201:200,body:{data:place},resource:{type:"place",id:place.id},headers:{ETag:`"${place.version}"`,Location:`/api/v1/places/${encodeURIComponent(place.id)}`}};
        },
        replay(stored){
          const place=getPlace(db,stored.resource!.id);
          return {status:200,body:{data:place},headers:{ETag:`"${place.version}"`}};
        }
      });
      return c.body(JSON.stringify(result.body),result.status as ContentfulStatusCode,{"Content-Type":"application/json",...result.headers});
    });
    // PATCH registration awaits only the shared-place editing authority decision.
  }
});
