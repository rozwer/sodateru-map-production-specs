# UI-MAP-CARD #297 — 個人地図の詳細カード

2026-09-25、`mattsun/297-map-card-layout` で実 Chromium を `agent-browser` から操作した。`mise exec -- bun run dev` でローカル API と Vite を起動し、[確認ページ](browser.html)から本人プロフィール「自分」を選択した。API と DB はこの worktree の `.local/app.sqlite`、地図は `.env.example` の公開 Mapbox token を `.env` に設定して表示した。共有 DB と本番データは変更していない。

## サンプルと写真の出所

確認ページの「サンプルを保存」は、実 API に4場所・4記録・1テーマを作る。地名・住所・本文はレイアウト検証のために今回作成した架空の文章で、実在する場所の住所・本人の記録を示すものではない。テーマ `29720000-0000-4000-8000-000000000001` の `recordIds` は4記録の ID を保持し、各記録の `placeId` は対応する場所の ID に固定した。詳細カードは製品の `PersonalMapScreen` をそのまま使い、確認ページのボタンで対象 `placeId` を選択した。

写真ありの2記録には、リポジトリ内の [`src/features/feature-requests/assets/coffee.jpg`](../../../src/features/feature-requests/assets/coffee.jpg) をローカル API へ添付した。これは各場所を撮影した写真ではない。媒体は API で `ready` になったが、媒体 content URL を通常の `<img>` で取得すると共通 `X-Request-Id` ヘッダーを送れず 400 となる（既報 #174）。写真ありの配置確認に限り、[確認ページのコード](browser.tsx)が `getPlacesPlaceId` 応答中の該当写真 URL を同じ画像 asset URL に差し替える。場所・記録・テーマの応答、製品コード、ローカル DB の媒体 URL は変更しない。この画像による写真表示は実媒体接続の受入証拠ではない。

## 実ブラウザ画像

| 状態 | 320px | 390px | 426px | PC 1440px |
| --- | --- | --- | --- | --- |
| 写真なし・長い地名/住所・複数行本文 | [320](no-photo-long-320.png) | [390](no-photo-long-390.png) | [426](no-photo-long-426.png) | [PC](no-photo-long-1440.png) |
| 写真あり・長い地名/住所・複数行本文 | [320](photo-long-320.png) | [390](photo-long-390.png) | [426](photo-long-426.png) | [PC](photo-long-1440.png) |
| 短い地名/住所・本文なしまたは短文 | — | [写真なし](no-photo-short-390.png) / [写真あり](photo-short-390.png) | — | — |

写真なしでは代替枠がなく、場所名→住所→感想→本文の順で全幅を使う。写真ありでは 320px の狭いカードで写真を上に積み、390px 以上では小さい写真と場所名・住所を並べ、感想・本文を全幅で表示した。元画像の意図である写真と場所情報の近接を維持した。長文と改行は省略せず読める。モバイルの Sheet は高さが限られるため、下部の本文と操作は Sheet 内スクロールで確認した。

## 文字 200% と操作

Chromium のページに一時的な QA スタイルを挿入し、カードの地名を `20→40px`、住所を `13→26px`、本文を `15→30px`、操作ラベルなどを約2倍にした。製品 CSS は変更していない。[320px 写真なし](no-photo-long-320-text-200.png)、[320px 写真あり](photo-long-320-text-200.png)、[390px 写真あり](photo-long-390-text-200.png)を撮影し、[320px 操作位置](photo-long-320-text-200-actions.png)と[390px 操作位置](photo-long-390-text-200-actions.png)もスクロール後に撮影した。これはカード文字の 200% 模擬であり、ブラウザ全体のズーム操作ではない。

| 幅 | 文字 200% のカード `clientWidth / scrollWidth` | Sheet 本文 `clientWidth / scrollWidth` |
| --- | --- | --- |
| 320px | 307 / 307 | 307 / 307 |
| 390px | 377 / 377 | 377 / 377 |
| 426px | 413 / 413 | 413 / 413 |
| 1440px | 417 / 417 | 417 / 417 |

文字 200% で横スクロールは発生せず、Sheet 内を縦スクロールして両操作ボタンに到達した。実ブラウザで `元の記録を見る` を 320/390/426/1440px から押し、選択中の記録 ID `29710000-0000-4000-8000-000000000002` または `...0004` が `#/record-detail?recordId=...` に渡ることを確認した。`テーマを編集` も各幅で押し、`#/theme-edit?themeId=29720000-0000-4000-8000-000000000001` に到達し、テーマ編集画面には4件の対応記録が選択済みで表示された。現在の統合 shell には `record-detail` 画面の実装がなく、遷移先は未接続表示となる。今回のカードから正しい ID を渡す操作までを確認した。

## 検証と境界

- `mise exec -- bunx vite build` は成功。`git diff --check` は成功。
- `mise exec -- bun run typecheck` は既存の他領域のエラーで失敗した。`server/core/core.test.ts`、`exploration/flow.ts`、`friends/screens.tsx`、`reflection/DiaryScreen.tsx`、`tools/local/dev.ts`。今回変更した地図ファイルの型エラーは出ていない。
- #174 の実媒体 URL 接続と未接続の `record-detail`、Mapbox の一部タイル取得エラーは本 Issue の完成範囲に含めない。下部ナビと Sheet の共通配置は #300 の統合済み変更を使用した。
