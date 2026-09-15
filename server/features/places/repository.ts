import type { DatabaseSync } from "node:sqlite";
import { CommonError } from "../../core/errors.ts";
import { normalize, type Place, type PlaceCandidate } from "./types.ts";
export function placeDto(row: any): Place {
  return {id:row.id,name:row.name,address:row.address,coordinates:[row.longitude,row.latitude],
    categories:JSON.parse(row.categories_json),provider:row.provider,externalId:row.external_id,buildingKey:row.building_key,
    sourceUrl:row.source_url,attribution:row.attribution,fetchedAt:row.fetched_at,
    version:row.version,createdAt:row.created_at,updatedAt:row.updated_at};
}
export function getPlace(db: DatabaseSync,id: string): Place {
  const row=db.prepare("SELECT * FROM places WHERE id=?").get(id);
  if(!row) throw new CommonError("NOT_FOUND","場所が見つかりません。",false);
  return placeDto(row);
}
export function savedCandidates(db: DatabaseSync,query: string,limit: number): Omit<PlaceCandidate,"candidateId">[] {
  const q=normalize(query);
  return db.prepare("SELECT * FROM places ORDER BY created_at ASC,id ASC").all()
    .filter((r:any)=>normalize(r.name).includes(q)||normalize(r.address??"").includes(q)).slice(0,limit)
    .map(r=> {const {id,version,createdAt,updatedAt,...place}=placeDto(r);return {...place,placeId:id,retention:"storable"};});
}
export function colocated(db: DatabaseSync,place: Place) {
  if(!place.buildingKey)return [];
  return db.prepare("SELECT id,name,address,longitude,latitude FROM places WHERE building_key=? ORDER BY name ASC,id ASC").all(place.buildingKey)
    .map((r:any)=>({id:r.id,name:r.name,address:r.address,coordinates:[r.longitude,r.latitude]}));
}
export function insertPlace(db: DatabaseSync,id: string,c: Omit<PlaceCandidate,"candidateId">,personId: string,now: number) {
  db.prepare(`INSERT INTO places (id,name,address,longitude,latitude,categories_json,provider,external_id,building_key,source_url,attribution,fetched_at,version,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`).run(id,c.name,c.address,...c.coordinates,JSON.stringify(c.categories),c.provider,c.externalId,c.buildingKey,c.sourceUrl,c.attribution,c.fetchedAt,now,now);
  db.prepare("INSERT INTO place_details(place_id,created_by) VALUES (?,?)").run(id,personId);
  return getPlace(db,id);
}
