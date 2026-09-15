# RECORDS｜体験・媒体の保存編集・共有変更と削除

<!-- task-id: RECORDS -->

初期担当枠：B。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/records/`、`server/features/media/`、`server/db/migrations/records/`、`docs/evidence/RECORDS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
