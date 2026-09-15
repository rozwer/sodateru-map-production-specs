# BIKE.data: common place candidate connection

Status: implementation prepared against PLACES PR #154 / a7aea34; live connection verification pending its formal integration. This does not complete #90 or #29.

## Contract v1.1.0

`POST /api/v1/bike/place-candidates` with `{searchId}` and the CORE session/mode/request/idempotency headers registers only the caller's persisted real BIKE search observations. No client-supplied provider data is accepted. Active installation, exact settings version/hash and search expiry are checked first.

The response `data` preserves `searchId`, `installId`, `settingsVersion`, `settingsHash`, `settings` and `candidates`. `candidates` contains the common `resultId`, actual returned `expiresAt`, and up to 1000 existing `Candidate` HTTP DTOs (`position`, not internal coordinates). Exceeding 1000 points asks the caller to narrow the search rather than silently dropping points. Original OSM edit times remain in the saved BIKE search; source URL/attribution/fetchedAt pass through common candidate registration. PLACES canonicalizes Overpass OSM object identity to its existing Nominatim identity to prevent duplicate places.

Use `candidates.resultId` and a returned `candidateId` with existing `POST /places` (`mode: candidate`). This operation adopts a point, not a motorcycle-compliant route. BIKE route vehicle unknown/adoption rejection is unchanged.

## Temporary candidate lifecycle

Same request replay revalidates current BIKE settings and resolves candidate IDs through PLACES. After a process restart the PLACES in-memory registry no longer has those IDs: replay rejects with RESULT_EXPIRED. A new Idempotency-Key re-registers the unchanged, still-valid BIKE search snapshot. It does not fetch a new provider result. After expiry or settings changes the user must perform a new real search. Stopping prevents new registration while stored search and already adopted common places remain.

## Verification

Existing five BIKE tests passed after the change. The expanded `live.e2e.ts` is prepared to verify real Overpass → common candidate registration/replay → common place adoption → SQLite/server restart → same saved place/provenance → old candidate replay rejection → new registration and canonical place reuse → stop rejection. Success evidence will replace this pending statement only after that run passes against formally integrated dependencies.
