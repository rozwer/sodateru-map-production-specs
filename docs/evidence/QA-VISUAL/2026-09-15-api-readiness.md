# API readiness before Vite

- Base integration HEAD: `9d3455661b31ae4f0c61c7a2c12ecc8f89f283b3`
- QA UI: `http://127.0.0.1:5173/#/map`
- QA API: `http://127.0.0.1:3002/`
- Live/demo databases and the existing browser storage were preserved.

## Reproduction before the fix

`tools/local/dev.ts` started the API and Vite together. Vite accepted browser requests before port 3002 was ready, and logged proxy `ECONNREFUSED` for `/api/v1/session` and `/api/v1/bootstrap`. The same Chrome tab displayed `通信に失敗しました。` until `再試行` was activated.

## Fix and bounded behavior

The local runner now checks the configured API host and port every 50 ms, for at most 10 seconds, and starts Vite only after the API accepts a TCP connection. An API child exit or timeout stops the runner as a failure; the change does not add an unbounded wait or change application retry behavior.

## Verification

- `node --experimental-transform-types --check tools/local/dev.ts`: pass
- Isolated TypeScript check for `tools/local/dev.ts`: pass
- One real restart with `SODATERU_PORT=3002` and `SODATERU_API_ORIGIN=http://127.0.0.1:3002`: API `ready` was logged before Vite `ready`.
- No proxy error appeared during the fixed startup.
- The same Chrome tab stayed on the real Mapbox map without the connection error or a retry action.
- `qa/manual/probe.mjs`: UI 200; live and demo session-profile entry points 200.

This evidence covers only startup ordering and recovery of the existing QA entry. It does not claim image-comparison completion, live data persistence acceptance, device camera behavior, or completion of unrelated UI/API gaps.
