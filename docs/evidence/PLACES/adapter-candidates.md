# Server adapter candidates

BIKE #29 requested a candidate registration boundary. `placesService.registerCandidates(context, {items: PlaceCandidate[], expiresAt}) -> SearchResult` is synchronous, server-only, and performs no DB writes. Use the returned resultId/candidateId with the existing resolver and adoption transaction.

- Accepts at most 1000 external candidates with unique candidateId, null placeId, valid position, acquisition time and source/attribution.
- `openstreetmap` + `node/123` (also way/relation) is normalized to existing PLACES identity `nominatim` + `N123` (W/R), preventing duplicate adoption across Overpass and Nominatim. Source URL, attribution, fetchedAt and candidateId are retained.
- Existing canonical Nominatim candidates are accepted. Mapbox must remain temporary. No manual/provider-unknown candidates.
- Returned expiresAt is the earlier of caller expiry and 15 minutes from registration. Caller must use that returned expiry. Owner/mode binding, defensive copies and timed memory deletion match search candidates.
- Caller must supply trusted provider output, never unchecked browser input. Registration is not exposed as an HTTP operation.

## Validation

On develop base ca88f2e, Node 22 real SQLite business fixture: `mise exec -- node --experimental-transform-types --test --test-name-pattern='server adapter candidates' server/features/places/service.test.ts` passed. Checked DB unchanged until adopt, exact source expiry, defensive copies, owner/mode rejection, duplicate candidate IDs, Mapbox storable rejection, canonical OSM adoption, expired resolver, same adoption retry, different input conflict and deletion NOT_FOUND.

This is a boundary test, not BIKE provider/UI E2E. The earlier real Nominatim/Mapbox HTTP evidence remains in live-search.json. Full typecheck currently reports unrelated THEMES/DISASTER errors and missing sharp/PLUGINS dependencies after fresh develop; no PLACES diagnostic was reported. INFORMATION PR48 and generated extended PlacePatch remain pending.
