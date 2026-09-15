# BIKE.data: common place candidate connection

Status: actual common candidate registration/adoption/restart verification passed, connected to formally integrated PLACES PR #154 / a7aea34 (merge 68c44d1), on develop 977d5bf. This does not complete #90 or #29.

## Contract v1.1.0

`POST /api/v1/bike/place-candidates` with `{searchId}` and the CORE session/mode/request/idempotency headers registers only the caller's persisted real BIKE search observations. No client-supplied provider data is accepted. Active installation, exact settings version/hash and search expiry are checked first.

The response `data` preserves `searchId`, `installId`, `settingsVersion`, `settingsHash`, `settings` and `candidates`. `candidates` contains the common `resultId`, actual returned `expiresAt`, and up to 1000 existing `Candidate` HTTP DTOs (`position`, not internal coordinates). Exceeding 1000 points asks the caller to narrow the search rather than silently dropping points. Original OSM edit times remain in the saved BIKE search; source URL/attribution/fetchedAt pass through common candidate registration. PLACES canonicalizes Overpass OSM object identity to its existing Nominatim identity to prevent duplicate places.

Use `candidates.resultId` and a returned `candidateId` with existing `POST /places` (`mode: candidate`). This operation adopts a point, not a motorcycle-compliant route. BIKE route vehicle unknown/adoption rejection is unchanged.

## Temporary candidate lifecycle

Same request replay revalidates current BIKE settings and resolves candidate IDs through PLACES. After a process restart the PLACES in-memory registry no longer has those IDs: replay rejects with RESULT_EXPIRED. A new Idempotency-Key re-registers the unchanged, still-valid BIKE search snapshot. It does not fetch a new provider result. After expiry or settings changes the user must perform a new real search. Stopping prevents new registration while stored search and already adopted common places remain.

## Verification

Existing five BIKE tests passed after the change. One additional focused test passed using the actual PLACES registry and real SQLite with an explicitly named provider fixture: provenance/canonical identity, setting version, owner rejection, stopped/changed-settings rejection, and registry-restart replay rejection/new registration. Strict registration/live-entrypoint type checking passed against the integrated dependency. The expanded `live.e2e.ts` successfully verified real Overpass → common candidate registration/replay → common place adoption → SQLite/server restart → same saved place/provenance → old candidate replay rejection → new registration and canonical place reuse → stop rejection. Four initial live attempts reached actual CORE/PLUGINS startup/install but failed at Overpass (three provider 504 responses, one public-mirror timeout). The final run used the main Overpass endpoint with exact tag unions instead of equivalent regex filters, and the explicit region `[139.698,35.655,139.718,35.673]`. It returned 10 real places / 51 roads and passed the complete candidate sequence. This does not establish the cause of the earlier external failures. See `live-candidates-attempts.json` and the successful `live-http-sqlite.json`.

The real adopted object is OSM node 885679761, canonical PLACES identity `nominatim/N885679761`. The returned source URL/fetchedAt and original BIKE setting version/hash were verified. After restart the saved common place retained provenance, old candidate replay returned 410, fresh registration succeeded and common adoption reused the same place ID. Stopping rejected new candidate registration while stored search/place data remained. The live vehicle-route result remains unknown and adoption returns 409.

Reproduction (actual credentials remain in ignored environment; no secrets in evidence):

```sh
mise exec -- python server/plugins/bike/compose-live-contract.py
mise exec -- env BIKE_E2E_CONTRACT=.local/bike-e2e-contract/openapi.json 'BIKE_E2E_BOUNDS=[139.698,35.655,139.718,35.673]' node --experimental-transform-types --env-file=/Users/shimurakaiya/3_Workspace/sodateru-map-production-specs/.env server/plugins/bike/live.e2e.ts
```

The shared production contract/client generation, UI acceptance and followup PR #166 review/commit-preserving integration remain. The temporary contract uses the shared composer and actual production features, not mocked service boundaries. Do not close #90 or #29 until their remaining acceptance conditions are satisfied.
