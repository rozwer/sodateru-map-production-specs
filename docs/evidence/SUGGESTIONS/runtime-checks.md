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

14件成功。60分条件の45分採用/75分除外、120分以上で150分保持、未知時間、希望優先、DST期限、独立閲覧時刻、回答訂正版、SQLite再open、本人分離、生成中停止、外部失敗を確認。旧60分回答から現在atLeast120条件への上書きは元snapshotを保ち互換minutesを除去する。serviceテストの外部API/AIは明示的なテストダブルであり、実provider証拠ではない。

`node --experimental-transform-types --test server/features/suggestions/http.test.mjs`

CORE実runtime、実HTTPソケット、実base SQLiteとFKを使用。回答POST/PATCH/GET/DELETE、同一要求再送、異入力再送409、版競合412、If-Matchなし428、live/demo分離、サーバー/DB再起動後の復元と削除後再送404を検査。契約はテスト内のみ固有fragmentを合成している。共通生成成果物はCORE担当が統合する。

## 正式アプリの実接続（#108）

2026-09-15 03:38:44 UTC、develop448a857、正式生成済みOpenAPIと `server/app/main.ts` で `live-smoke.mjs` が成功。契約のテスト内合成は使わない。隔離demo DB・明示的デモ入力で実PLACES検索/採用、実Mapbox経路、共有Luna生成を通した。皇居外苑候補は移動14.4167分＋本人指定滞在30分、理由とSourceRefをSQLiteへ保存した。

表示・詳細閲覧・選択・confirmed訪問で達成・完了後memo更新・ACTIVITY訪問取消によるselected復帰を実HTTPで確認。OSプロセスを停止/再起動し、候補snapshotと順位の一致、SETTINGS停止で新規提示されないことを確認した。結果は `live-smoke.json`。成功後の反復検査は行わない。検証プロセスは終了済みで共有デモURLではない。

再現は正規task:execからNodeに既存主clone.envを読ませ、プロセス内で `MAPBOX_ACCESS_TOKEN ||= VITE_MAPBOX_ACCESS_TOKEN`、`CODEX_AI_MODEL=gpt-5.6-luna` を設定して `node --experimental-transform-types docs/evidence/SUGGESTIONS/live-smoke.mjs` を実行する。秘密値を表示・保存しない。

## 履歴と残件

ユーザーの30分デモ優先判断により、元の全受入の残件は [後続 #108](https://github.com/rozwer/sodateru-map-production-specs/issues/108) に保持する。#36の先行保存/API提供はPR77、develop364f8efで統合済み。

実main.tsでのデモ確認用 `live-smoke.mjs` を追加。develop ca88f2e時点は正式openapi.jsonにv1.2.0が未反映で、timezone/timeBudget付き回答POSTが422（requestId a00748ea-5908-492e-9fba-46ce20c6d272）。共通COREへ正式合成を依頼済み。実providerに未到達であり、スクリプト追加を成功証拠としない。Mapbox設定は既存主cloneのVITE_MAPBOX_ACCESS_TOKENをプロセス内でMAPBOX_ACCESS_TOKENへ対応付け、モデルgpt-5.6-lunaを注入する正規起動方法を確認した。秘密値は保存/出力しない。

develop 522cf7b時点の `bun run typecheck` はPLACESのINFORMATION未統合import、service.ts:108/114のpossibly undefinedで失敗。SUGGESTIONS由来の診断はなし。その後PLACES修正を含むdevelop2332231を通常mergeし、全体 `bun run typecheck` 成功を確認した。

上記の実provider/ACTIVITY取消結合は解消済み。UI画面での実表示/詳細/状態更新の受入はCONNECT-SUGGESTIONS #141と連携する。cycling/transitの実経路、同行者/負担等の未知条件の全受入、根拠訂正・利用取消の画面通しは #108 に残す。
