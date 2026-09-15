import type { DatabaseSync } from "node:sqlite";
export type OpeningHours={rawText:string;timezone:string|null;sourceUrl:string|null;fetchedAt:number|null;verificationStatus:"unverified"|"confirmed"};
export type Entrance={id:string;coordinates:[number,number];label:string|null;accessibility:"unknown"|"accessible"|"restricted";sourceUrl:string|null;fetchedAt:number|null;verificationStatus:"unverified"|"confirmed"};
export type PlaceDescription={text:string;sourceUrl:string|null;fetchedAt:number;verificationStatus:"unverified"};
export type PlacePhoto={url:string;sourceUrl:string;attribution:string|null;fetchedAt:number;verificationStatus:"unverified"};
export function getPlaceMetadata(db:DatabaseSync,placeId:string) {
  const row=db.prepare("SELECT opening_hours_json,entrances_json,corrections_json,description_json,photos_json FROM place_details WHERE place_id=?").get(placeId) as any;
  const corrections=JSON.parse(row?.corrections_json??"{}");
  return {description:JSON.parse(row?.description_json??"null") as PlaceDescription|null,photos:JSON.parse(row?.photos_json??"[]") as PlacePhoto[],openingHours:JSON.parse(row?.opening_hours_json??"null") as OpeningHours|null,entrances:JSON.parse(row?.entrances_json??"[]") as Entrance[],
    correctedFields:Object.keys(corrections).sort()};
}
