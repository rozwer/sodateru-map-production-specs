# UI-ROUTES｜経路条件・候補比較・徒歩案内

<!-- task-id: UI-ROUTES -->

初期担当枠：A。担当者：rozwer。[GitHub #9](https://github.com/rozwer/sodateru-map-production-specs/issues/9)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

場所と移動条件から経路を選び、保存した道順で案内を開始・終了できる。

## 実装範囲

- 地点順、出発/帰着時刻、移動手段、階段/屋根の条件、複数候補を扱う。
- ターン案内、残り時間、全体表示、案内終了、定期券条件への共通入口を接続する。

## 通過条件

- 同じ条件が検索・候補・採用ルートに残り、保存後の再読込で道路形状と地点順が一致する。
- 条件の未対応/未確認と経路0件を区別し、一部区間失敗を全行程成功にしない。
- 歩行中の現在地・進行方向・終了操作を確認し、終了だけで訪問を確定しない。

## 参照と契約

[経路の条件](../../01_requirements/03_pages/route-conditions/README.md)、[経路の候補](../../01_requirements/03_pages/route-results/README.md)、[徒歩ナビゲーション](../../01_requirements/03_pages/route-navigation/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。参照画像との一致を実画面で必ず確認し、独自デザインへ変更しない。全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[PLACES](PLACES.md)、[ROUTES](ROUTES.md)。

参照画像・画面状態・入力保持・遷移をrozwerが担当する。koshiroの共通クライアントを使い、各機能の業務判定やDTO変換を画面側へ重複実装しない。通信待ちのテスト応答は明示し、実接続完了と区別する。未確定fieldを画面独自に追加しない。

### 接続に必要な提供物

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。
- [PLACES](PLACES.md)：`PLACES.search`、`PLACES.detail`。
- [ROUTES](ROUTES.md)：`ROUTES.basic`、`ROUTES.navigation`、`ROUTES.conditions`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

### 先に通す画面操作

- 基本経路の検索→保存→再表示：`UI-BASE.shell`、`PLACES.search`、`ROUTES.basic`を使う。案内/交通/定期券/追加条件の受入はROUTESとUI-ROUTESに残す。

## 編集範囲

提案path：`src/features/routes/`、`docs/evidence/UI-ROUTES/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
