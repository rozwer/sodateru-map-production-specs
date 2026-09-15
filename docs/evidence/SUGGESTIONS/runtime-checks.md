# SUGGESTIONS 実装・接続証拠

対象 #36。UI受入、実外部provider接続、独立レビュー、統合は未完了。

## 固有契約 1.2.0

- 新時点回答は POST `/self-checkins` の新ID。同ID訂正は PATCH + If-Match。`checkin:null` は未回答で過去回答を補わない。
- `timeBudget:{kind:"atLeast",minutes:120}` に有限上限はない。`exact` のみ実移動秒/60 + 根拠付き滞在で除外する。
- POST `/suggestion-batches` は Idempotency-Key と入力IDで実行を予約する。外部実行中は BUSY、失敗はその原因、再起動時は INTERRUPTED。失敗を0件成功にしない。
- GET `/suggestions?batchId=...` は保存順位と条件、期限、emptyReasonを返す。
- PATCH `/suggestions/:id` は If-Match が必須。実際のカード表示は `{presented:true}`、詳細閲覧は `{viewed:true}`、選択は `{status:"selected"}`。それぞれ初回時刻を別保存し、再送で時刻を上書きしない。GETに副作用はない。
- 完了は `{status:"completed",completedVisitId:"..."}`。本人・場所・confirmed訪問を検査する。ACTIVITY #21の訪問取消・削除・場所変更と達成解除の同一transactionを使用する（固有triggerなし）。
- `listSelfCheckins(db, context, {date?,cursor?,limit?})` をACTIVITY向けに公開。cursorは本人/dataMode/date/orderのqueryHashと時刻・IDのkeyset。offsetではない。

## 実行済みの検証

2026-09-15、Node 22.22.1、専用worktree、通常task:exec経由。

`node --test server/features/suggestions/domain.test.mjs server/features/suggestions/repository.test.mjs server/features/suggestions/generation.test.mjs server/features/suggestions/service.test.mjs`

13件成功。60分条件の45分採用/75分除外、120分以上で150分保持、未知時間、希望優先、DST期限、独立閲覧時刻、回答訂正版、SQLite再open、本人分離、生成中停止、外部失敗を確認。serviceテストの外部API/AIは明示的なテストダブルであり、実provider証拠ではない。

`node --experimental-transform-types --test server/features/suggestions/http.test.mjs`

CORE実runtime、実HTTPソケット、実base SQLiteとFKを使用。回答POST/PATCH/GET/DELETE、同一要求再送、異入力再送409、版競合412、If-Matchなし428、live/demo分離、サーバー/DB再起動後の復元と削除後再送404を検査。契約はテスト内のみ固有fragmentを合成している。共通生成成果物はCORE担当が統合する。

## 未完了

develop 522cf7b取り込み後の `bun run typecheck` はPLACESのINFORMATION未統合import、service.ts:108/114のpossibly undefinedで失敗。SUGGESTIONS由来の診断はないが、全体typecheck成功とは扱わない。

AI/ROUTES/INFORMATION/SETTINGS/ACTIVITYの公開口をadapterで接続済みだが、develop統合と実外部通信の結合確認待ち。cycling/transitの実経路はROUTES提供状況に依存。UI #15の実表示/詳細/状態更新受入と、ACTIVITY訪問取消の結合確認が残る。
