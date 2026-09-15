# BIKE #29 — implementation and evidence

Status: **partial delivery; BIKE.complete is not satisfied**. Do not close #29 or run task:finish on this evidence.

## Implementation

- Contract `BIKE.json` v1.0.0: `getBikeState`, `postBikeSearch`, `getBikeResult`, `postBikeRouteAssessment`, `postBikeAdoption`.
- Settings belong to PLUGINS (`bike@1.0.0`); region bounds, vehicle class/optional displacement, highway policy are validated. Electric vehicles never receive an invented displacement.
- PLUGINS v2 trial is explicitly mock, with a simulated GeoJSON point and legend. Real Overpass results are served separately and saved with `dataKind: real`.
- OpenStreetMap places and roads retain object URL, fetchedAt and the actual element edit timestamp (null if unavailable). Unknown tags are not permission. Tag assessment concerns the individual OSM object only.
- Route assessment binds common ROUTES driving preview geometry hash, settings hash/version, installation, source search and times. Nearby OSM roads are **not** used to certify a different Mapbox route. Unknown/ineligible cannot reach common route adoption.
- Search, assessment and adoption snapshots are stored in owner/mode-scoped SQLite tables. Search acceptance uses CORE idempotentMutation; BIKE jobs handle completion/failure/interruption without writing common request tables directly.
- Every state read resolves current PLUGINS state. Stop/uninstall returns an empty BIKE FeatureCollection and its `clearOwnerKeys`; stored results remain. Owner keys use `plugin:{installId}` and the declaration `layer:bike/visibility=true`.

## Verification completed so far

2026-09-15, Node 22.22.1, dedicated branch `kaiya/29-bike`, CORE base `6d1b08a`.

```
mise exec -- node --experimental-transform-types --test server/plugins/bike/bike.test.ts
```

3 tests passed. The HTTP test uses a real local TCP server and real live/demo SQLite files, closes/reopens the databases and server, and compares persisted snapshots. It checks search replay without a duplicate provider call, isolation, changed settings rejection, unknown route adoption rejection, and stop/display clearing with saved results retained.

**Boundary limitation:** those tests use explicitly named provider/PLUGINS/ROUTES fixtures. They are not evidence of full live integration. Feature/domain strict type checking passed. Full registration type checking awaits the dependencies below.

## Live source evidence

`live-overpass.json` records an actual Overpass query on 2026-09-15: 35 places and 243 roads, with source timestamp, object edit timestamps and representative road geometries. With motorway avoidance selected, 242 queried road objects were ineligible and 1 unknown; none were verified. The query deliberately selects roads with restrictions, so these counts are not a regional road census. This is adapter evidence; it does not establish that those roads match a particular Mapbox route.

## Remaining acceptance conditions

1. Integrate PLUGINS #28 / PR #46 and ROUTES #25 on develop, then exercise their actual public imports and HTTP operations with the same CORE app/databases/context.
2. Verify real Overpass results through HTTP and SQLite restart with those integrated dependencies.
3. Connect ROUTES highway avoidance with same-geometry condition evidence. Request posted to #25.
4. Supply an actual motorcycle restrictions provider with evidence for every segment of the selected geometry and the selected vehicle. The present Mapbox-only adapter deliberately leaves this unknown; the positive adoption path has not been demonstrated live. NAVITIME availability and retention terms are a root/consultant decision already raised on #29. Do not describe unknown-only output as complete.
5. UI acceptance by A: real query, settings round trip, common-map display, stop removing only BIKE ownership. API material is provided to #18; UI/Mapbox files are outside this claim.
6. Short independent review arranged by root, commit-preserving merge, task:finish/board/receiver/Issue closure only after the above pass.

## Sources checked

- [OSM motorcycle tag definition](https://wiki.openstreetmap.org/wiki/Key:motorcycle): explicit mode access and conditional tags; a missing tag does not establish bike verification.
- [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL): bounded queries, metadata, geometry.
- [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/): driving and motorway exclusion; not a motorcycle legal-access guarantee.
- [NEXCO highway entry guidance](https://www.c-nexco.co.jp/safety/safety_drive/pdf/safety_drive01.pdf): Japan motorway exclusion for mopeds/125cc-or-less. This narrows an OSM-object assessment; it does not certify a Mapbox route.

OSM geometry and tags retain OpenStreetMap contributor attribution and ODbL source links. Provider keys and profile credentials are never stored in evidence.
