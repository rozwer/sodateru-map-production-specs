# DISASTER-DATA #214

## Scope and delivered interface

- Base: `55a6ff215ceaf15e48729b06a08562c099e01324` (origin/develop at standard claim).
- Owner `rozwer`, task `DISASTER-DATA`, branch `rozwer/214-disaster-data`; claim/guard passed. Only `src/features/disaster/data/` and this evidence directory are owned.
- Generated `DisasterView/Layer/Tile/Snapshot/Settings` are imported directly from `packages/api-client`; no server or shared contract edits.
- `data/index.ts`: `useDisasterData(scopeKey)` returns `view,busy,error,load,refresh,saveSettings,setEnabled`; uses the existing app API session/mode. Abort on scope change; no old-person result adoption.
- `toDisasterMapData(view)` returns original DTO metadata, rasters and masks. `map.action=clear` provides no drawing material. Available data tiles only; original tile coordinates are retained. `clipDisasterRaster` crops PNGs in Web Mercator space to their intersection with selected bounds. Render the returned coordinates, not the original image stretched over the selected region.
- `createDisasterDataAdapter(api)` exposes generated GET/refresh with fixed caller-supplied idempotency key. Provider failure/conflict rereads the server, returns the error alongside old saved result/failed-attempt diagnostics. Read failure stays an error. Abort never becomes a successful response.
- `createDisasterDemo()` returns `PluginTrialPreview` with `dataKind=mock`, explicit fictional label and no fetched/observed/issued/valid timestamps. This separate return type cannot be passed as a live snapshot. It is display-only and does not write the DB.

## Reference comparison and contract limits

Read production `server/plugins/disaster/{catalog,provider,service,store,types,release,register}.ts`, `DISASTER.json` fragment and generated client. Relevant original page requirements: `plugin-trial-F02` requires an explicit mock before/after map; `plugin-manage-F01/F02/F03` requires enable, settings and map access.

Rehearsal reference: `/Users/roz/Desktop/sodateru-map-rehearsal/src/features/extensions/disaster-map.ts`, `watershed-atlas.ts`, `DisasterApp.tsx`. Its tile geography and separate static/observation meaning informed the adapter; no code or geography was copied as live information. The demo polygon is newly authored fictional geometry for the production default 江戸川 region, consistent with production `release.ts` trial semantics.

Current production operations provide flood-hazard PNG (maximum-scale assumption), hillshade PNG, and rainfall analysis PNG + no-data GeoJSON. Source URL, attribution, legend, layer meaning, `fetchedAt`, `sourceUpdatedAt` (including null), `sourceUpdatedAtMeaning`, `issuedAt`, `validAt`, region, tile errors and unknowns stay in the DTO. Last-Modified is not relabeled as a measurement/hazard-planning date. No missing/transparent pixels become zero or safe.

Rehearsal operations without a corresponding current DISASTER DTO/operation: watershed atlas selection/upstream/downstream persistence; tsunami layer; time-series radar playback; alert/shelter listing and opening status; saved household preparedness notes; terrain-rain simulation. These are remaining product capabilities, not satisfied by this adapter or fictional demo. `postDisasterRefresh` accepts only `{}` and reads region/layer settings saved through `patchPluginSettingsPluginId`; arbitrary new layers/notes cannot be appended to that contract.

## Verification (2026-09-15)

- `mise exec -- bunx vitest run src/features/disaster/data/adapter.test.ts`: 3 tests pass. Checks original tile vs selected bounds, mask and timestamp preservation, disabled/settingsChanged/noResult clear, missing tiles excluded, HTTP 502 with GET recovery and original error, exact If-Match/idempotency/empty body, Mercator crop coordinates, explicit mock/null source times.
- Targeted strict `tsc` of `src/features/disaster/data/index.ts` and imports: pass.
- Repository `bun run typecheck`: fails on pre-existing files outside this claim: `server/core/core.test.ts` FeatureRequestCreate.displayName; exploration requestId; records unknown test values; reflection optional version; tools/local/dev ChildProcess types. No errors reported in this adapter.
- This is adapter-level verification with deterministic fixtures, not live provider or browser acceptance. No shared 5173/3002 process, database, or mode was modified.

## UI handoff and remaining acceptance

Interface agreed with DISASTER-UI #219, succeeded by #223; shared scene renderer belongs to BUILDING-GROWTH #222. UI must display the demo label/warnings whenever showing mock; use actual DTO metadata for live panels; attach masks; clear only the response owner; suppress stale asynchronous image work after scope/owner/result change. Do not apply a cached result if the response says clear.

Actual same-width reference comparison, map visual result, browser PNG clipping, saved settings redisplay, provider failure display and stop/restart journeys remain with #223/#217 and parent integration #144. This evidence does not claim those journeys complete.
