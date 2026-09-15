# RECORDS｜体験・媒体の保存編集・共有変更と削除

<!-- task-id: RECORDS -->

初期担当枠：B。担当者：koshiro。[GitHub #20](https://github.com/rozwer/sodateru-map-production-specs/issues/20)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

本文・媒体・用途・公開範囲を原文のまま保存し、同じ記録を編集・削除して再取得できる。

## 実装範囲

- recordsの作成/単体/更新/削除、媒体追加/順序/Range配信、削除previewと書出しを実装する。
- 日記/メモにも共通保存を提供し、本人の原文とAI提案を分ける。媒体上限とアイコン用共通受付をSETTINGSと調整する。

## 通過条件

- 本文だけ/媒体だけ/場所日時不明を保存し、再起動後に原文と順序が一致する。
- 本文保存後の媒体一部失敗を個別再送でき、応答喪失後も重複しない。
- 共有変更・削除preview・書出し・確定削除が実DBと取得権限へ反映される。

## 参照と契約

[体験を残す](../../01_requirements/03_pages/record-create/README.md)、[体験を編集](../../01_requirements/03_pages/record-edit/README.md)、[記録を削除](../../01_requirements/03_pages/record-delete/README.md)、[共有範囲の確認](../../01_requirements/03_pages/sharing/README.md)、[解釈を訂正](../../01_requirements/03_pages/interpretation-correction/README.md)。

[02_records.json](../../01_requirements/01_DB/02_records.json)、[03_media.json](../../01_requirements/01_DB/03_media.json)、[02_access-media.md](../../01_requirements/02_common/03_information/02_access-media.md)、[02_records.md](../../01_requirements/04_api/endpoints/02_records.md)。

実装する既存operationId：`postRecords`、`getRecordsRecordId`、`patchRecordsRecordId`、`deleteRecordsRecordId`、`getRecordsRecordIdMedia`、`postRecordsRecordIdMedia`、`postRecordsRecordIdMediaReorder`、`getMediaMediaId`、`deleteMediaMediaId`、`getMediaMediaIdContent`。

契約補完の担当：`export`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)、[INFORMATION](INFORMATION.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **RECORDS.save**：記録の作成・単体取得・編集・削除。手入力記録の保存→再取得→訂正を同じIDで確認し、再送で二重作成しない。
- **RECORDS.media**：媒体の追加・配信・部分失敗。本文と成功媒体を保持し、失敗媒体だけ再送できる。
- **RECORDS.lifecycle**：共有変更・削除影響・書出し。共有変更/削除後に読取と根拠状態が変わり、書出し/削除の残る受入も確認する。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`、`CORE.integration`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`、`INFORMATION.sharing`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/records/`、`server/features/media/`、`server/db/migrations/records/`、`docs/01_requirements/04_api/fragments/RECORDS.json`、`docs/evidence/RECORDS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
