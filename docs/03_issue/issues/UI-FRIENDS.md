# UI-FRIENDS｜友達との共有・地図・比較とおすすめルート

<!-- task-id: UI-FRIENDS -->

初期担当枠：A。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[INFORMATION](INFORMATION.md)、[RECORDS](RECORDS.md)、[REFLECTION](REFLECTION.md)、[THEMES](THEMES.md)、[ROUTES](ROUTES.md)、[COMMUNITY](COMMUNITY.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/friends/`、`docs/evidence/UI-FRIENDS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
