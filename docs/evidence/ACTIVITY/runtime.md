# ACTIVITY first runtime delivery

2026-09-15, Windows / mise Node 22.22.1 / CORE v0.3.0 integrated from `413598b9379be040be6d4ddbe3d802485911a716` (included in the branch merge). Feature entry point: server/features/activity/register.ts. Exact feature revision is the commit containing this evidence and PR #51.

## Passed

`mise exec -- node --experimental-transform-types server/features/activity/acceptance-driver.ts`

The driver starts the actual server/app/main.ts in an OS process, uses actual HTTP session cookies and API input validation, stops it, starts another process against the same SQLite files, and reacquires persisted data. The stored manual place is explicitly a verification fixture, not an external-provider retrieval.

- live and demo independently: POST visit creates candidate; same-key replay retains ID; PATCH confirmed → rejected → confirmed persists; obsolete version returns 412.
- Three observations → select/delete the middle one → two observations remain; the latter has breakBefore=true. Re-uploading the deleted source returns 404.
- Tokyo date yields 2026-09-14T15:00Z through 2026-09-15T15:00Z; New York's 2026-03-08 local day has 23 hours.
- After process restart: the same confirmed visit IDs, two retained observation IDs and deleted observation 404 are preserved in both modes.
- live visit ID: 660e168f-b04c-4254-8d74-840e58f37254; demo visit ID: d4dc608f-091e-45c6-8f8a-9b18baba7d31.
- Local verification DBs: `.local/activity-proof-4c2ea3a7-848a-4e2a-90a5-eaef88830b2c/{live,demo}.sqlite`. Profile secrets and session cookies are not included in this evidence.

`mise exec -- node --experimental-transform-types --test server/features/activity/lifecycle.test.ts`

One focused scenario using CORE's actual migration/SQLite/transaction passed: candidate excluded from growth; confirmed count/current purpose and source versions; purpose correction visible on read; changed visit place clears suggestion completion and increments its version once; visit deletion leaves record body and clears location/time; unknown time excluded from period; person-bound cursor; conflicting observation batch rolls back earlier inserts.

`mise exec -- bun run typecheck` passed.

## Remaining before Issue completion

- INFORMATION #6 and SUGGESTIONS #36 day readers must be integrated and exercised for real RecordViewPage/checkin pagination. Missing/failed readers return a failed section, never a successful empty day. Visits and local-day bounds already work independently.
- CORE must compose ACTIVITY.json into the shared generated schema/client (TrackPoint.breakBefore, GrowthItem.stage and purpose length). Existing operation IDs are unchanged and existing input contracts work.
- UI #8/#10 must connect the shared client to the provided operations and respect segment/breakBefore continuity; this delivery does not claim screenshot/UI acceptance.
- Claim and Issue remain open; do not run finish for this partial delivery.
