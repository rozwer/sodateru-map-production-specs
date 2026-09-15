import type { SearchResult } from "./types.ts";
// HTTP Candidate uses Position, internal CommonMapPlaceCandidate uses coordinates.
export function candidateResultDto(result:SearchResult) {
  return {...result,items:result.items.map(({coordinates,...item})=>({...item,position:{longitude:coordinates[0],latitude:coordinates[1]}}))};
}
