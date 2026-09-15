# MAP-CUSTOM evidence

## 2026-09-15: manual contract v1

Base: `26a25329111af5e72ee42c3120c06993adbeae91`. Task: #27 / `kaiya/27-map-custom`.

- Added the feature-owned fragment `docs/01_requirements/04_api/fragments/MAP-CUSTOM.json` for B to compose into the shared OpenAPI/client. Seven manual operations cover object CRUD and settings GET/PATCH.
- Executed Ajv validation with the locked repository dependency using `mise exec -- node --input-type=module`. Valid object/style accepted; invalid palette, 21-character name, longitude 181, building height, body personId, incomplete four colors, and empty PATCH rejected.
- Persisted shape: style uses the existing common AI mapstyle proposal; layers preserve display wishes. `effectiveLayers`, `pluginSnapshot`, and `pluginDisplays` are server-derived.
- Six color IDs were aligned with A’s confirmed reference image 08_18_05: teal/pink/orange/yellow/green/blue. Swatches: #2aa5a5/#fac3cd/#ffc79f/#ffe48a/#c1dfa2/#a9cdf7. These replace the preliminary palette before integration.

## Not yet accepted

CORE.runtime/integration, PLUGINS.state, and AI.engine have announced signatures but no integrated delivery was available at this checkpoint. Feature SQL/services are in progress. No real HTTP/save/restart/retrieval or AI execution is claimed by the contract validation. UI/Mapbox/Three.js is owned by A. Issue #27 remains open.

## Solid feature behavior checked independently

`mise exec -- node --experimental-strip-types --test server/features/map-custom/effective.test.ts`: 2 passed. Disable/remove/unresolved conflict all suppress effective plugin/bike display while retaining user wishes. Explicit plugin hide wins over bike visibility. These tests do not claim PLUGINS/CORE HTTP integration.

Feature TypeScript syntax transpilation passed. Full type checking awaits the actual CORE/AI dependency modules.
