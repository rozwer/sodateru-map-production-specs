# UI-RECORDS｜体験記録・訪問確認・訂正と地図の成長

<!-- task-id: UI-RECORDS -->

初期担当枠：A。担当者：rozwer。[GitHub #11](https://github.com/rozwer/sodateru-map-production-specs/issues/11)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

対象ページの全要件・受入IDを引き受ける。参照画像との一致を実画面で必ず確認し、独自デザインへ変更しない。全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[RECORDS](RECORDS.md)、[ACTIVITY](ACTIVITY.md)、[INFORMATION](INFORMATION.md)、[PLACES](PLACES.md)、[REFLECTION](REFLECTION.md)、[INSIGHTS](INSIGHTS.md)。

参照画像・画面状態・入力保持・遷移をrozwerが担当する。koshiroの共通クライアントを使い、各機能の業務判定やDTO変換を画面側へ重複実装しない。通信待ちのテスト応答は明示し、実接続完了と区別する。未確定fieldを画面独自に追加しない。

### 接続に必要な提供物

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。
- [RECORDS](RECORDS.md)：`RECORDS.save`、`RECORDS.media`、`RECORDS.lifecycle`。
- [ACTIVITY](ACTIVITY.md)：`ACTIVITY.growth`、`ACTIVITY.track`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`。
- [PLACES](PLACES.md)：`PLACES.search`、`PLACES.detail`。
- [REFLECTION](REFLECTION.md)：`REFLECTION.record`。
- [INSIGHTS](INSIGHTS.md)：`INSIGHTS.evidence`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

### 先に通す画面操作

- 手入力記録→保存→再取得/編集：`UI-BASE.shell`、`RECORDS.save`、`INFORMATION.read`、`PLACES.search`を使う。媒体/訪問/軌跡/AI整理/根拠訂正は続けて接続する。
- 訪問確認/取消・訂正→成長と軌跡の再表示：`RECORDS.save`、`ACTIVITY.growth`、`ACTIVITY.track`を使う。AI整理と媒体の残る受入を省略しない。

## 編集範囲

提案path：`src/features/records/`、`src/features/activity/`、`docs/evidence/UI-RECORDS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
