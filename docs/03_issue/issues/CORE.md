# CORE｜起動・本人領域・HTTPとSQLiteの共通基盤

<!-- task-id: CORE -->

初期担当枠：B。担当者：koshiro。[GitHub #3](https://github.com/rozwer/sodateru-map-production-specs/issues/3)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

同じ起動手順でUI/APIを開き、本人とlive/demoを分離した保存先へ各機能を接続できる。

## 実装範囲

- Hono/Node起動、Vite proxy/同一origin配信、本人context、エラー/版/再送規約、DB接続とmigration登録を整える。
- 17基本表と既定の追加DDLを一度適用する。各機能の追加列・SQL・APIは各担当が持つ。
- Q01/Q02のうち起動・本人context・再送保持の共通契約を最初に具体化する。健康・交通・相棒など固有契約の補完は待たない。
- koshiroが共通Schema・API生成器の反映担当となり、型付き共通クライアントと機能ごとのrouter/migration/契約断片の登録入口を一度整える。C/Dの業務処理やDTO変換を引き取らない。

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

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

先行提供：まず起動・本人context・DB・再送/版を実APIで確認し、続いて機能登録入口と型付き共通クライアントを統合する。統合commit・契約版・保存/再取得の証拠をUI-BASE、PLACES、AIへ渡す。全機能のAPI不足を解消するまで、この提供を待たせない。共有変更の反映担当はkoshiroに固定するが、変更単位の統合後は共有pathを返し、固有機能へ進む。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **CORE.runtime**：同一origin起動・本人context・DB・再送/版。空DB起動→本人解決→保存→再起動→再取得を同じDBで確認。
- **CORE.integration**：機能登録入口・契約生成・型付き共通クライアント。別担当の機能router/migrationを各機能の登録ファイルだけで追加し、生成した同じ型と共通通信処理で実APIを呼べる。

## 編集範囲

提案path：`server/app/`、`server/core/`、`server/db/connection.ts`、`server/db/migrate.ts`、`server/db/migrations/000-base.sql`、`tools/local/`、`package.json`、`bun.lock`、`tsconfig.json`、`docs/01_requirements/04_api/fragments/CORE.json`、`packages/api-client/`、`docs/01_requirements/04_api/tools/`、`docs/01_requirements/04_api/fragments/common.json`、`docs/01_requirements/04_api/openapi.json`、`docs/01_requirements/04_api/schemas/`、`docs/01_requirements/04_api/endpoints/`、`docs/01_requirements/04_api/conventions/`、`docs/01_requirements/04_api/README.md`、`docs/01_requirements/04_api/coverage.md`、`docs/01_requirements/04_api/examples.md`、`docs/evidence/CORE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
