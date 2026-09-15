# NAV-CARDS

## Scope and source

- Issue #225; branch `rozwer/225-nav-cards`; base `98bece8`.
- User image: `codex-clipboard-f53aa691-f723-4efe-b131-b31b9131be04.png`, opened visually. Screen-only proportions: heading above map; bottom ~80%-width cards with the next card visible, two photos, pagination and existing 3-button navigation. No OS/device chrome.
- Requirements: `docs/01_requirements/03_pages/{self-home,community-home}/requirements.md`. All existing destinations retained: daily-track, type-diagnosis, personal-map, local-knowledge, friends-map.
- Rehearsal inspected: `src/features/self/entry.tsx` and `src/features/social/entry.tsx` in `/Users/roz/Desktop/sodateru-map-rehearsal`. Its static reference artwork and old getHistory/getSelfPeriodProfile contracts are not imported. Production reads getReflectionDaysDate/getRecords/getRecordsRecordIdMedia/getSharedRecords through the existing client.
- Existing demo entry passes `dataMode` to the shell. Only in demo mode, an empty/error preview can show clearly marked display examples (existing coffee/park assets). No sample is written to API/DB. Read failures remain visible and retryable. Live empty records stay empty.

## Checks before integration

- `bunx vite build`: pass.
- Targeted Vitest: 3 pass (card destinations, keyboard and restore, live/demo separation; map instance retention; photo picker -> real record capture handoff).
- `bun run typecheck`: changed src/app files have no errors. Existing failures remain in server/core/core.test.ts (FeatureRequestCreate.displayName), exploration/flow.ts, records/record-flow.test.ts, reflection/DiaryScreen.tsx and tools/local/dev.ts. No claim of clean whole-repo typecheck.
- Before image: `before-self-390.png`, shared 5173 at 390x844; old menu is a vertical sheet.
- Isolated pre-merge UI on 5185 proxies existing API 3002; no operations on shared 5173/3002. API initially unavailable, subsequently reachable. Isolated checkout has no Mapbox configuration; final map proof must use shared runtime after integration.

## Remaining at initial submission

Shared-runtime reflected commit, 390px live map screenshot, all destination clicks/back, horizontal scrolling and desktop keyboard checks. Not complete until these checks are recorded.
