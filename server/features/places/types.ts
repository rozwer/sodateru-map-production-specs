export type Position = [number, number];
export interface PlaceCandidate {
  candidateId: string; placeId: string | null; name: string; address: string | null;
  coordinates: Position; categories: string[]; provider: string; externalId: string | null;
  buildingKey: string | null; sourceUrl: string | null; attribution: string;
  fetchedAt: number | null; retention: "storable" | "temporary";
}
export interface SearchResult { resultId: string; items: PlaceCandidate[]; expiresAt: number }
export interface Place extends Omit<PlaceCandidate, "candidateId" | "placeId" | "retention"> {
  id: string; version: number; createdAt: number; updatedAt: number;
}
export type PlaceCreate = {id: string; mode: "candidate"; resultId: string; candidateId: string}
  | {id: string; mode: "manual"; name: string; position: {longitude: number; latitude: number}; address: string | null; buildingKey: string | null};
export type CandidateInput = {q: string; limit?: number} | {category: "coffee" | "restaurant" | "bakery" | "park"; longitude: number; latitude: number};
export const normalize = (value: string) => value.normalize("NFKC").trim().toLowerCase();
export function isPosition(value: unknown, latitudeLimit = 90): value is Position {
  return Array.isArray(value) && value.length === 2 && value.every(v => typeof v === "number" && Number.isFinite(v))
    && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= latitudeLimit;
}
