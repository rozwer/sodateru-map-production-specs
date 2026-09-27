# CORE 統合済みfragmentの正式生成 (2026-09-27)

起点: origin/develop `358eb63`。本書を含む提出commitで再現可能。
公式CORE worktree/claimで作業し、固有fragmentは変更していない。

## 変更

- 214操作・313Schemaを公式composer/generatorから再生成。INSIGHTS ActivityStatistics/getReflectionActivityStatistics、THEMES adopt-name、ROUTES v1.3.0、PILGRIMAGE、MAP-CUSTOM、BIKE、AI等の統合済み断片を反映。
- generatorの深いSchema参照（BikeRoutePreviewInput.waypoints）を実Schemaから型へ展開。
- 任意If-Matchを任意versionとして生成し、指定時のみclientから送信。必須操作のversion検査を維持。
- clientが呼出元requestIdをX-Request-Idへ引継ぐ。未指定時だけUUID生成。
- CORE試験fixtureに現契約のdisplayNameを補い、dev起動コードの配列添字による未定義型を実プロセス変数で解消。

## 確認

担当worktree / Node 22.22.1 / Bun 1.3.14 / macOS。コマンドは全てmise exec --経由。

- `bun run contracts:build`: 成功（214操作・313Schema）。
- `bun run contracts:check`: 成功（1179例、8拒否条件、20 Markdown、参照/Schema/catalog一致）。
- `bun run test:core`: 7/7成功。実HTTP、空DB、本人、live/demo分離、再送、再起動、版競合、migration rollback、client requestId、任意If-Matchを確認。
- `node --experimental-transform-types docs/evidence/CORE/catalog-probe.ts`: 通常server/app/main.tsをport 0/一時SQLiteで起動。本人開始後、生成clientのgetReflectionActivityStatisticsとgetMapSettingsが実応答成功。listCompanions/getSharedThemes成功、self-checkin保存→GET一致。
- `bun run typecheck`: 成功。friendsの既存型診断は担当PR #333で修正済みで、origin/develop `36e5bca`を通常merge後に確認。
- `git diff --check`: 成功。

## CORE #3の通過条件との対応

| 条件 | 証拠 |
|---|---|
| 空DB→本人→保存→再起動→再取得をlive/demo別に確認 | core.test.tsの実HTTP試験で両DBへ異なる本文を保存、close/open後に同じcookieで両方の本文を照合 |
| 同一再送・異内容409・If-Match競合412/欠落428 | 同試験で確認。削除後再送404と別本人404も確認 |
| router/migrationの機能側登録 | defineFeature fixtureを実HTTP/DBへ登録、独立register.tsの自動探索試験成功。通常mainは全機能を自動探索して起動 |
| 生成clientから統合された実APIを呼べる | catalog-probeで統計・地図設定・self-checkinを通常main経由で取得/保存 |

これらはCORE自身の通過条件を満たす。固有機能の全製品受入は各Issueの範囲でありCORE終了条件に追加しない。独立レビュー・必要チェック成功と提出commitの通常統合を確認後、正式finishの対象とする。

## 固有機能側の残確認

CORE全体の全機能実接続や各画面受入の完了ではない。THEMES実AI命名採用やROUTES外部provider、PILGRIMAGE製品操作は各担当の受入が必要。#139のtimeZone400やreflection画面は編集していない。稼働APIはOpenAPIを起動時に読むため、統合後は最新clientへの更新とAPI再起動が必要。

独立レビュー・必要チェックと通常統合の完了までは、親Issue #3を閉じない。
