# CORE｜起動・本人領域・HTTPとSQLiteの共通基盤

<!-- task-id: CORE -->

初期担当枠：B。担当者：koshiro。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

同じ起動手順でUI/APIを開き、本人とlive/demoを分離した保存先へ各機能を接続できる。

## 実装範囲

- Hono/Node起動、Vite proxy/同一origin配信、本人context、エラー/版/再送規約、DB接続とmigration登録を整える。
- 17基本表と既定の追加DDLを一度適用する。各機能の追加列・SQL・APIは各担当が持つ。
- Q01/Q02の起動・本人作成/切替・再送保持契約を先に具体化する。

## 通過条件

- 空DB起動→本人解決→保存→再起動→再取得をlive/demo別に確認する。
- 同一要求再送・別内容衝突・If-Match競合が共通形式で返る。
- 別機能のrouterとmigrationを共通ファイルの大幅編集なしで登録できる。

## 参照と契約

[common.json](../../01_requirements/01_DB/common.json)、[README.md](../../01_requirements/00_stacks/README.md)、[00_protocol.md](../../01_requirements/02_common/00_protocol.md)、[01_http.md](../../01_requirements/04_api/conventions/01_http.md)、[02_mutations.md](../../01_requirements/04_api/conventions/02_mutations.md)。

実装する既存operationId：`getMe`。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：なし。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

先行提供：最初に起動コマンド・DB/context・router/migration登録境界を統合する。基盤変更のロックを保ったまま機能追加へ進まない。

## 編集範囲

提案path：`server/app/`、`server/core/`、`server/db/connection.ts`、`server/db/migrate.ts`、`server/db/migrations/000-base.sql`、`tools/local/`、`package.json`、`bun.lock`、`tsconfig.json`、`docs/evidence/CORE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
