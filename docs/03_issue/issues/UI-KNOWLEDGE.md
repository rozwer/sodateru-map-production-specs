# UI-KNOWLEDGE｜地域の知の検索・絞込・詳細と投稿

<!-- task-id: UI-KNOWLEDGE -->

初期担当枠：A。担当者：rozwer。[GitHub #16](https://github.com/rozwer/sodateru-map-production-specs/issues/16)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

地域の声を地図と一覧で探し、出典を読んで、自分の体験も共有できる。

## 実装範囲

- 地図範囲・分類・期間・人物の絞込、場所選択、詳細/動画、しおりを扱う。
- 地域投稿は記録作成と共有確認へ接続し、公開/取消結果を戻して表示する。

## 通過条件

- 同じ検索条件の一覧件数・地図・詳細が一致し、101件目以降の対象も現れる。
- 投稿→公開→他者で再表示→公開取消まで同じ原文で確認する。
- 読めない媒体だけが失敗表示になり、本文と別媒体は残る。

## 参照と契約

[地域の知](../../01_requirements/03_pages/local-knowledge/README.md)、[地域の知を探す](../../01_requirements/03_pages/knowledge-list/README.md)、[地域の知の絞り込み](../../01_requirements/03_pages/knowledge-filter/README.md)、[地域投稿の詳細](../../01_requirements/03_pages/knowledge-detail/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。参照画像との一致を実画面で必ず確認し、独自デザインへ変更しない。全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[COMMUNITY](COMMUNITY.md)、[INFORMATION](INFORMATION.md)、[RECORDS](RECORDS.md)、[PLACES](PLACES.md)。

参照画像・画面状態・入力保持・遷移をrozwerが担当する。koshiroの共通クライアントを使い、各機能の業務判定やDTO変換を画面側へ重複実装しない。通信待ちのテスト応答は明示し、実接続完了と区別する。未確定fieldを画面独自に追加しない。

### 接続に必要な提供物

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。
- [COMMUNITY](COMMUNITY.md)：`COMMUNITY.knowledge`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.sharing`。
- [RECORDS](RECORDS.md)：`RECORDS.save`、`RECORDS.lifecycle`。
- [PLACES](PLACES.md)：`PLACES.search`、`PLACES.detail`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`src/features/knowledge/`、`docs/evidence/UI-KNOWLEDGE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
