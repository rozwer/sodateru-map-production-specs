# TRANSFER-INTEGRATION #109: real application acceptance

2026-09-15. Tested on develop448a857 plus the two-line cafe-query correction in this PR. Node22.22.1, actual server/app/main.ts, isolated live/demo SQLite and local session profile.

## Result

PASS: actual RECORDS create → recipe create/get/same-key replay → OS restart/get → original record unchanged → common AI two-plan generation → faithful adoption through common ROUTES → OS restart/get of identical adopted PlanSet and identical saved route. The saved route's stored place IDs exactly match the chosen step order. Three separate server OS processes were started.

- Provider: actual Nominatim places, Mapbox Directions, common Codex SDK with fixed gpt-5.6-luna.
- Source: explicitly created isolated test record describing a park walk followed by cafe reflection. It is not user history and no source data was fabricated as provider output.
- Evidence: recipe-http.json, plans-http.json, latest-plan-attempt.json.
- Settings: enabled record/location AI scopes through the real settings API in the isolated profile.

## Fault and correction

The initial free-text query `cafe in 京都` returned five OSM amenity=pub results. Common AI correctly returned two incomplete plans with the mandatory cafe step absent; adoption did not proceed. The shared Nominatim call with `[amenity=cafe] 京都` returned five actual amenity=cafe results. TRANSFER now supplies that explicit category for cafe semantics. The original park→cafe recipe and its ordering were kept for the successful rerun. No shared provider was copied or modified.

## Reproduction

Run via mise and the authorized primary environment file. Set MAPBOX_ACCESS_TOKEN from VITE_MAPBOX_ACCESS_TOKEN inside the process, and CODEX_AI_MODEL=gpt-5.6-luna. Never print either token. Execute `node docs/evidence/TRANSFER/http-acceptance.mjs --plans`. The script starts real servers, writes isolated fixture records/settings, verifies persisted results, then removes only its temporary databases.

## Scope and remaining UI

The backend happy path and source preservation are now verified with real integrations; this replaces the earlier INFO/contract blocking status. The UI binding has arrived at src/features/transfer/screens.tsx. Actual Q10 screen/render/navigation acceptance belongs to open UI-EXPLORE #10; it is not claimed by these HTTP results. Prior source/version/condition/receipt fault checks remain in the earlier dedicated test evidence and were not rerun without cause.
