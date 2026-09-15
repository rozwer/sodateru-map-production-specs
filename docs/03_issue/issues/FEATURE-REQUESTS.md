# FEATURE-REQUESTS｜機能要望の投稿・共感・公開と編集

<!-- task-id: FEATURE-REQUESTS -->

初期担当枠：B。担当者：koshiro。[GitHub #31](https://github.com/rozwer/sodateru-map-production-specs/issues/31)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

本人のお願いをアプリ内へ投稿し、公開範囲・共感・編集/削除を保存できる。

## 実装範囲

- 固定表示名・本文・title生成規則・タグ・共感、既存2値の公開範囲と画面を対応させる。
- 「人に頼む」を同じアプリ内フォームへ接続し、開発ガイドの接続先を本番remoteから設定する。

## 通過条件

- 投稿後に固定表示名/本文/公開範囲が再取得され、再送で二重投稿しない。
- 共感の追加/解除・本人の編集/削除が再起動後も一致する。
- 未設定の開発URLは利用可能と表示せず、実在する本番ガイドへ接続してから導線完了とする。

## 参照と契約

[みんなの欲しい機能](../../01_requirements/03_pages/feature-requests/README.md)、[お願いを書く](../../01_requirements/03_pages/feature-request-edit/README.md)。

[08_feature_requests.json](../../01_requirements/01_DB/08_feature_requests.json)、[questions.json](../../01_requirements/03_pages/questions.json)。

実装する既存operationId：`getFeatureRequests`、`postFeatureRequests`、`getFeatureRequestsRequestId`、`patchFeatureRequestsRequestId`、`deleteFeatureRequestsRequestId`。

契約補完の担当：`feature-request`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **FEATURE-REQUESTS.complete**：機能要望・共感・公開範囲・編集。投稿/共感/編集/削除を同じ本人領域に保存して再取得する。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`、`CORE.integration`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/feature-requests/`、`server/db/migrations/feature-requests/`、`docs/01_requirements/04_api/fragments/FEATURE-REQUESTS.json`、`docs/evidence/FEATURE-REQUESTS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
