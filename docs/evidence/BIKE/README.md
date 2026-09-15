# BIKE #29 — implementation and evidence

Status: **partial delivery; BIKE.complete is not satisfied**. Do not close #29 or run task:finish on this evidence.

## Implementation

- Contract `BIKE.json` v1.0.0: `getBikeState`, `postBikeSearch`, `getBikeResult`, `postBikeRouteAssessment`, `postBikeAdoption`.
- Settings belong to PLUGINS (`bike@1.0.0`); region bounds, vehicle class/optional displacement, highway policy are validated. Electric vehicles never receive an invented displacement.
- PLUGINS v2 trial (v3 motorcycle glyph) is explicitly mock, with a simulated GeoJSON point and legend. Real Overpass results are served separately and saved with `dataKind: real`.
- OpenStreetMap places and roads retain object URL, fetchedAt and the actual element edit timestamp (null if unavailable). Unknown tags are not permission. Tag assessment concerns the individual OSM object only.
- Route assessment binds common ROUTES driving preview geometry hash, settings hash/version, installation, source search and times. Nearby OSM roads are **not** used to certify a different Mapbox route. Unknown/ineligible cannot reach common route adoption.
- Search, assessment and adoption snapshots are stored in owner/mode-scoped SQLite tables. Search acceptance uses CORE idempotentMutation; BIKE jobs handle completion/failure/interruption without writing common request tables directly.
- Every state read resolves current PLUGINS state. Stop/uninstall returns an empty BIKE FeatureCollection and its `clearOwnerKeys`; stored results remain. Owner keys use `plugin:{installId}` and the declaration `layer:bike/visibility=true`.

## Verification completed so far

2026-09-15, Node 22.22.1, dedicated branch `kaiya/29-bike`, CORE base `6d1b08a`.

```
mise exec -- node --experimental-transform-types --test server/plugins/bike/bike.test.ts
```

5 tests passed, including the same-preview motorway evidence check and fixture-only verified adoption rollback/replay checks. The HTTP test uses a real local TCP server and real live/demo SQLite files, closes/reopens the databases and server, and compares persisted snapshots. It checks search replay without a duplicate provider call, isolation, changed settings rejection, unknown route adoption rejection, and stop/display clearing with saved results retained.

**Boundary limitation:** those 5 tests use explicitly named provider/PLUGINS/ROUTES fixtures. They are not evidence of full live integration. Strict type checking also passed against the integrated PLUGINS/ROUTES public registration and live test entrypoints (repository ESNext/Bundler options).

### Actual shared HTTP + SQLite restart

`live-http-sqlite.json` records the successful 2026-09-15 real integration run on develop base `b2db4a0` plus this BIKE branch. All discovered production features, actual CORE session/validation/SQLite, actual PLUGINS state, actual Overpass and actual Mapbox ROUTES were used. No provider or service boundary was replaced with a fixture. The first Overpass request returned 504 and failed as an upstream error; an explicit fresh run succeeded with 35 places / 243 roads.

Verified: mock trial is labeled separately; real search and idempotent replay return the same saved snapshot; actual common driving preview has motorway-avoidance evidence; vehicle eligibility remains unknown and adoption returns 409; stopping clears only the BIKE owner; search and assessment snapshots and settings survive server/SQLite restart; reenable restores the saved map display.

**Contract limitation:** the shared generated OpenAPI still lacks the newly integrated fragments. The test uses an ignored temporary copy composed with the existing shared `merge_fragments` function from current BIKE/PLUGINS/ROUTES/PLACES fragments. `live-server.ts` only supplies that contract to the actual shared `createApp` and production feature discovery. Production contract/client generation is still assigned to CORE #3; this run does not claim it is delivered. The normal test defaults to the production server when `BIKE_E2E_CONTRACT` is absent.

```sh
mise exec -- python server/plugins/bike/compose-live-contract.py
mise exec -- env BIKE_E2E_CONTRACT=.local/bike-e2e-contract/openapi.json node --experimental-transform-types --env-file=/Users/shimurakaiya/3_Workspace/sodateru-map-production-specs/.env server/plugins/bike/live.e2e.ts
```

Only configured provider credentials are inherited; evidence contains no secrets. Test databases live under ignored `.local/bike-e2e/`.

## Live source evidence

`live-overpass.json` records an actual Overpass query on 2026-09-15: 35 places and 243 roads, with source timestamp, object edit timestamps and representative road geometries. With motorway avoidance selected, 242 queried road objects were ineligible and 1 unknown; none were verified. The query deliberately selects roads with restrictions, so these counts are not a regional road census. This is adapter evidence; it does not establish that those roads match a particular Mapbox route.

## Remaining acceptance conditions

1. CORE #3 must generate the production API/client with BIKE v1.0.0, PLUGINS and ROUTES fragments. The actual services are integrated and the temporary-contract live HTTP run above passed.
2. Connect actual BIKE points to common PLACES candidates. `toPlaceCandidate` preserves external object identity and provenance; a server-owned candidate registration boundary is requested on #5. It is not connected yet.
3. Supply actual vehicle restrictions evidence for every segment of the selected geometry and selected vehicle (#91). The present Mapbox adapter leaves this unknown; positive adoption has not been demonstrated live. The bounded source investigation and precise missing coverage/retention capabilities are in `source-gaps.md`; no specific paid provider is asserted necessary.
4. UI acceptance by A (#18): real query, settings round trip, common-map display, stop removing only BIKE ownership. UI/Mapbox files are outside this claim.
5. Short independent review of the followup changes and commit-preserving merge of PR #65. Close child #90 only after its data/candidate/UI/merge conditions; keep #91 and parent #29 open until full route acceptance. Run task:finish only after all parent requirements pass.

## Sources checked

- [OSM motorcycle tag definition](https://wiki.openstreetmap.org/wiki/Key:motorcycle): explicit mode access and conditional tags; a missing tag does not establish bike verification.
- [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL): bounded queries, metadata, geometry.
- [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/): driving and motorway exclusion; not a motorcycle legal-access guarantee.
- [NEXCO highway entry guidance](https://www.c-nexco.co.jp/safety/safety_drive/pdf/safety_drive01.pdf): Japan motorway exclusion for mopeds/125cc-or-less. This narrows an OSM-object assessment; it does not certify a Mapbox route.

OSM geometry and tags retain OpenStreetMap contributor attribution and ODbL source links. Provider keys and profile credentials are never stored in evidence.
