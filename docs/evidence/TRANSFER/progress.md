# TRANSFER verification progress

Status: incomplete. Domain/store tests pass; common runtime, AI and routing adapters are not yet integrated or verified. No mock or partial unit result is accepted as TRANSFER.complete.

## Verified

2026-09-15, Node 22.22.1 through mise, dedicated mattsun/32-transfer worktree:

`mise exec -- node --experimental-strip-types --test server/features/transfer/recipe.test.ts server/features/transfer/planning.test.ts server/features/transfer/service.test.ts`

6 tests passed: SQLite file close/reopen recipe retrieval, exact step order, owner isolation, version conflict, duplicate/unattached source rejection, unprovided place/reordered step/invented evidence/missing variant rejection, road duration plus stay budget, missing required step, unverified mandatory condition, stable route adoption retry after simulated connection loss and changed-source read rejection.

The adoption dependency in the unit test is a test double. Actual common route persistence/restart is still required. Recipe persistence uses a real temporary SQLite file.

`mise exec -- node node_modules/typescript/bin/tsc --noEmit --target es2023 --module nodenext --allowImportingTsExtensions --skipLibCheck server/features/transfer/service.ts server/features/transfer/planning.ts server/features/transfer/schemas.ts server/features/transfer/store.ts`

Passed for independent modules. Node emits its normal experimental SQLite warning.

## Connection status

- CORE: feature/context/error/fragment signature received. Transaction and replay entry awaited.
- AI: registry, startRun/getRun, synchronous assertRunAdoptable/appendAppliedRef accepted. transfer-plan-set applied reference agreed. Integration awaited.
- PLACES: 80cf955, search/resolve/adopt/getPlace signature inspected; not integrated.
- INFORMATION: 865afe6, sourceMaterials uses getRecord/assertSourcesCurrent; not integrated.
- ROUTES: createRoutesService/previewRoute/revalidatePreview/saveRoute and stable save ID agreed; integration awaited.
- UI #10: operation binding sent; Q10 screen based on approved rehearsal reference belongs to A.

Fragment v2 adds explicit conditionChecks for every mandatory condition and assistantAttempt for adoption validation. Source records are never updated by this feature.
