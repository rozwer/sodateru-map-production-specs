# UI-MAP｜場所検索・自分の地図・表示と装飾の編集

<!-- task-id: UI-MAP -->

初期担当枠：A。担当者：rozwer。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[PLACES](PLACES.md)、[ACTIVITY](ACTIVITY.md)、[THEMES](THEMES.md)、[MAP-CUSTOM](MAP-CUSTOM.md)、[PLUGINS](PLUGINS.md)、[COMMUNITY](COMMUNITY.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/map/`、`src/map/`、`docs/evidence/UI-MAP/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
