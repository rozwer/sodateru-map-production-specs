# UI-FRIENDS｜友達との共有・地図・比較とおすすめルート

<!-- task-id: UI-FRIENDS -->

初期担当枠：A。担当者：rozwer。[GitHub #14](https://github.com/rozwer/sodateru-map-production-specs/issues/14)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

相手と公開範囲を選んで共有し、友達の地図・共通点・おすすめを使える。

## 実装範囲

- 友達申請/承認/解除、人物選択、共有内容/範囲の確認を実装する。
- 友達の記録/テーマ/地図、意味比較、共有ルートの確認と自分用再計算を接続する。

## 通過条件

- 二人の本人でprivate/selected/publicを実操作し、共有解除後は本文・媒体・比較引用を読めない。
- 友人解除と指定共有解除を別々に確認する。
- 友達の地点列から自分の起点で経路を取得し、元の共有ルートを変更しない。

## 参照と契約

[みんなを知る](../../01_requirements/03_pages/community-home/README.md)、[友達の地図](../../01_requirements/03_pages/friends-map/README.md)、[友達のプロフィール](../../01_requirements/03_pages/friend-profile/README.md)、[友達との共通点](../../01_requirements/03_pages/friend-compare/README.md)、[友達のおすすめルート](../../01_requirements/03_pages/shared-route/README.md)、[共有範囲の確認](../../01_requirements/03_pages/sharing/README.md)、[共有する友達](../../01_requirements/03_pages/friend-picker/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。参照画像との一致を実画面で必ず確認し、独自デザインへ変更しない。全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[INFORMATION](INFORMATION.md)、[RECORDS](RECORDS.md)、[REFLECTION](REFLECTION.md)、[THEMES](THEMES.md)、[ROUTES](ROUTES.md)、[COMMUNITY](COMMUNITY.md)。

参照画像・画面状態・入力保持・遷移をrozwerが担当する。koshiroの共通クライアントを使い、各機能の業務判定やDTO変換を画面側へ重複実装しない。通信待ちのテスト応答は明示し、実接続完了と区別する。未確定fieldを画面独自に追加しない。

### 接続に必要な提供物

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`、`INFORMATION.sharing`。
- [RECORDS](RECORDS.md)：`RECORDS.lifecycle`。
- [REFLECTION](REFLECTION.md)：`REFLECTION.compare`。
- [THEMES](THEMES.md)：`THEMES.manual`。
- [ROUTES](ROUTES.md)：`ROUTES.basic`。
- [COMMUNITY](COMMUNITY.md)：`COMMUNITY.social`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`src/features/friends/`、`docs/evidence/UI-FRIENDS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
