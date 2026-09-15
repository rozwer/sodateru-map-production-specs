import {readFileSync} from "node:fs";
import {defineFeature} from "../../core/features.ts";
import {placesService,listPlaces,validateSearch} from "./service.ts";
import {candidateResultDto} from "./http-dto.ts";

export default defineFeature({
  id:"PLACES",
  migrations:[{id:"places-001-details",sql:readFileSync(new URL("../../db/migrations/places/001-details.sql",import.meta.url),"utf8")}],
  register(api) {
    api.get("/places",c=>c.json(listPlaces(c.get("context"),c.get("db"),c.req.query())));
    api.get("/place-candidates",async c=>c.json({data:candidateResultDto(await placesService.search(c.get("context"),c.get("db"),validateSearch(c.req.query())))}));
    api.get("/places/:placeId",async c=>{
      const {getPlaceDetail}=await import("./detail.ts");
      return c.json({data:await getPlaceDetail(c.get("context"),c.get("db"),c.req.param("placeId"))});
    });
    // POST/PATCH connect here when CORE provides the mutation/transaction signature.
    // No private copy of the shared idempotency or transaction runtime is installed.
  }
});
