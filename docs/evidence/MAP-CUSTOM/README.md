# MAP-CUSTOM evidence

## 2026-09-15: manual contract v1

Base: `26a25329111af5e72ee42c3120c06993adbeae91`. Task: #27 / `kaiya/27-map-custom`.

- Added the feature-owned fragment `docs/01_requirements/04_api/fragments/MAP-CUSTOM.json` for B to compose into the shared OpenAPI/client. Seven manual operations cover object CRUD and settings GET/PATCH.
- Executed Ajv validation with the locked repository dependency using `mise exec -- node --input-type=module`. Valid object/style accepted; invalid palette, 21-character name, longitude 181, building height, body personId, incomplete four colors, and empty PATCH rejected.
- Persisted shape: style uses the existing common AI mapstyle proposal; layers preserve display wishes. `effectiveLayers`, `pluginSnapshot`, and `pluginDisplays` are server-derived.
- Six color IDs are semantic palette IDs; matching image swatches is the UI owner's responsibility and was coordinated in #8.

## Not yet accepted

CORE.runtime/integration, PLUGINS.state, and AI.engine have announced signatures but no integrated delivery was available at this checkpoint. Feature SQL/services are in progress. No real HTTP/save/restart/retrieval or AI execution is claimed by the contract validation. UI/Mapbox/Three.js is owned by A. Issue #27 remains open.
