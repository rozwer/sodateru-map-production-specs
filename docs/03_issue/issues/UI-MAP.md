# UI-MAP｜場所検索・自分の地図・表示と装飾の編集

<!-- task-id: UI-MAP -->

初期担当枠：A。担当者：rozwer。[GitHub #8](https://github.com/rozwer/sodateru-map-production-specs/issues/8)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

場所を検索・保存し、自分の体験を地図で見返し、表示や自分の飾りを変更できる。

## 実装範囲

- Mapboxの実地図、2D/3D・レンズ・時間・カメラの独立状態、場所/建物の選択と詳細を実装する。
- テーマ絞込、レイヤー、手動装飾の編集/配置、AI地図設定の提案・採用を同じ地図へ接続する。

## 通過条件

- 検索→候補詳細→保存→再読込で同じplaceIdを開き、候補閲覧では訪問が増えない。
- 用途で育つ建物と本人の飾りを区別し、飾りの編集・取消・削除が成長材料を変えない。
- テーマ/表示変更後も次元・カメラ・選択を保持し、停止したプラグインだけ非表示になる。

## 参照と契約

[地図](../../01_requirements/03_pages/map/README.md)、[わたしの地図](../../01_requirements/03_pages/personal-map/README.md)、[地図の表示設定](../../01_requirements/03_pages/map-layers/README.md)、[地図オブジェクトを編集](../../01_requirements/03_pages/object-edit/README.md)、[地図に配置](../../01_requirements/03_pages/object-place/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。参照画像との一致を実画面で必ず確認し、独自デザインへ変更しない。全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[PLACES](PLACES.md)、[ACTIVITY](ACTIVITY.md)、[THEMES](THEMES.md)、[MAP-CUSTOM](MAP-CUSTOM.md)、[PLUGINS](PLUGINS.md)、[COMMUNITY](COMMUNITY.md)。

参照画像・画面状態・入力保持・遷移をrozwerが担当する。koshiroの共通クライアントを使い、各機能の業務判定やDTO変換を画面側へ重複実装しない。通信待ちのテスト応答は明示し、実接続完了と区別する。未確定fieldを画面独自に追加しない。

### 接続に必要な提供物

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。
- [PLACES](PLACES.md)：`PLACES.search`、`PLACES.detail`。
- [ACTIVITY](ACTIVITY.md)：`ACTIVITY.growth`。
- [THEMES](THEMES.md)：`THEMES.manual`。
- [MAP-CUSTOM](MAP-CUSTOM.md)：`MAP-CUSTOM.manual`、`MAP-CUSTOM.adopt`。
- [PLUGINS](PLUGINS.md)：`PLUGINS.state`。
- [COMMUNITY](COMMUNITY.md)：`COMMUNITY.knowledge`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

### 先に通す画面操作

- 検索→場所採用→再読込：`UI-BASE.shell`、`PLACES.search`を使う。共有/訪問/テーマ/装飾/しおりは各提供後に接続し、UI-MAP全体の受入に残す。
- 手動表示/装飾の保存→再表示→AI案の採用：`MAP-CUSTOM.manual`、`MAP-CUSTOM.adopt`、`PLUGINS.state`を使う。再読込/別本人・モード/プラグイン停止と版競合まで確認する。

## 編集範囲

提案path：`src/features/map/`、`src/map/`、`docs/evidence/UI-MAP/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
