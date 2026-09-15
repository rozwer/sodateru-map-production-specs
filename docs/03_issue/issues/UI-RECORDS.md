# UI-RECORDS｜体験記録・訪問確認・訂正と地図の成長

<!-- task-id: UI-RECORDS -->

初期担当枠：A。担当者：rozwer。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

写真・本文・訪問を確認して残し、訂正や削除後の軌跡と地図を見返せる。

## 実装範囲

- 媒体/本文だけの記録、場所と日時の未指定、確認、部分失敗、訪問確認を扱う。
- 本文・用途・媒体の訂正、影響確認と書出し付き削除、日別軌跡、成長結果を接続する。

## 通過条件

- 実画面で記録→再読込→編集→日別軌跡と地図の更新まで同じIDで確認する。
- 写真一件の失敗時に本文と他媒体を保持し、再送で二重作成しない。
- 訪問取消・用途訂正・記録削除が定義どおり成長と根拠へ反映される。

## 参照と契約

[体験を残す](../../01_requirements/03_pages/record-create/README.md)、[体験を編集](../../01_requirements/03_pages/record-edit/README.md)、[訪問の確認](../../01_requirements/03_pages/visit-confirm/README.md)、[解釈を訂正](../../01_requirements/03_pages/interpretation-correction/README.md)、[記録を削除](../../01_requirements/03_pages/record-delete/README.md)、[体験で地図が育った](../../01_requirements/03_pages/growth-result/README.md)、[今日の軌跡](../../01_requirements/03_pages/daily-track/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[RECORDS](RECORDS.md)、[ACTIVITY](ACTIVITY.md)、[INFORMATION](INFORMATION.md)、[PLACES](PLACES.md)、[REFLECTION](REFLECTION.md)、[INSIGHTS](INSIGHTS.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/records/`、`src/features/activity/`、`docs/evidence/UI-RECORDS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
