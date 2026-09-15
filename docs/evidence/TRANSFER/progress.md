# TRANSFER verification progress

Status: incomplete. Reviewed deliverable candidate: persistent recipe/plan domain, eight-operation contract and CORE HTTP integration. Common AI/INFORMATION and real end-to-end acceptance remain.

## Verified

2026-09-15, Node 22.22.1 via mise, dedicated mattsun/32-transfer worktree.

- Six recipe/planning/service tests passed: real SQLite close/reopen, original order/owner/version, unknown candidate/evidence/missing variant rejection, actual route-duration field plus stay budget, required-condition evidence tied to selected destinations, adoption retry and changed-source rejection.
- One schema test passed: shared schema reference compilation, real SQLite DTO validation, 80-character PlanSet ID boundary matching common AI applied references.
- One CORE Hono HTTP boundary test passed: real session and separate SQLite files, recipe idempotency, conflicting input, pending adoption receipt recovery after final callback failure, receipt/PlanSet transaction rollback, close/reopen GET and replay, mode isolation. External dependencies are explicit test doubles; this is not real provider or OS process-restart evidence.
- Independent strict ESNext/Bundler type checks passed for store/service/planning/HTTP and boundary tests before latest shared merge.

Commands: `mise exec -- node --experimental-transform-types --test server/features/transfer/{recipe,planning,service,contract,http}.test.ts` (tests were run in the necessary affected groups).
Type check: `mise exec -- node node_modules/typescript/bin/tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --strict --noUncheckedIndexedAccess --esModuleInterop server/features/transfer/http.test.ts`.

## Integration

Latest merged develop: 01f38a2. CORE, PLACES, ROUTES, RECORDS and ACTIVITY are present. AI 6275ac1 and INFORMATION d220157 signatures were inspected but their branches are not merged here. Full `bun run typecheck` is blocked by missing AI/INFORMATION imports and two existing THEMES service.test.ts:41 diagnostics; coordinator notified.

Fragment v2 preserves explicit mandatory conditionChecks and assistantAttempt. PlanSet IDs are bounded to the shared AI applied-reference limit. Original source records are never updated.

## Remaining demo acceptance

Start actual application after shared dependencies land; save/get recipe using current authorized source records; generate both plans through common AI and actual place/route providers; adopt an ordered route; restart the OS server process and retrieve the same selection. A owns Q10 UI binding. No original full-scope completion claim is made. The coordinator has authorized splitting unfinished acceptance into a follow-up issue for the demo deadline.

## Scoped delivery

# TRANSFER #32 今回の提供範囲

ユーザー承認のデモ期限向け分割。今回の完了範囲はレシピ/計画/採用の固有永続化、CORE HTTP/再送・競合境界、AI二案の構造・根拠・順序・時間検査、共通adapterと8operation断片の先行統合です。

- PR94、独立レビュー対象19de78a、重大指摘なし。AI PR96を含む最新develop7814fedを通常merge済み。
- 固有6件+契約1件+CORE HTTP1件が成功。HTTPテストの外部依存は明示的テストダブル。
- 実server/app/main.tsの起動と本人セッション成功をstartup.jsonへ保存。
- 実INFORMATION接続、実AI/場所/経路での二案→採用→OS再起動GET、共通生成とUI bindingは後続Issue #109へ移管。元TRANSFER.completeは未達。
- 全体型検査は未統合INFORMATIONと既知の所有外THEMES/DISASTER/PLUGINS診断で未通過。統合済み共通AIへのTRANSFER固有型エラーはありません。
- 検証入口: http-acceptance.mjs。実provider検証を通ったという記録はありません。
