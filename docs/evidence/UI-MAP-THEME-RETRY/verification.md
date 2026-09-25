# UI-MAP-THEME-RETRY 受入確認

対象: `mattsun/299-theme-retry`（提出 commit と PR は統合時に記録）。2026-09-25、Chromium、Vite `http://127.0.0.1:5178/docs/evidence/UI-MAP-THEME-RETRY/browser.html`。`browser.tsx` は製品の `App` / `PersonalMapScreen` / `MapToolbar` を使い、`getThemes` / `getRecords` の応答順と失敗だけをボタンで制御する確認ページ。地図描画部は「確認用地図代替」と明示し、場所選択・カメラ・表示場所は実 `MapBridge` を操作する。サーバー API と Mapbox タイルはこの確認の対象外。

## 応答順と結果

| 順序 | 画面結果と通信 | 保持・回復 |
| --- | --- | --- |
| `getThemes` 失敗 → `getRecords` 成功 | 「テーマを取得できませんでした。getThemes 制御失敗」が記録成功後も残り、場所 2 件と記録本文を表示。`getThemes: 1 / getRecords: 1`。 | 場所1を選択し、カメラを `139.812,35.712 / zoom 16 / bearing 24 / pitch 35` に設定。エラーの「再試行」で `getThemes: 2 / getRecords: 1` と保留 `getThemes` を確認。成功応答後、テーマ1・2のボタンが復元し、テーマエラーだけ消えた。場所1・記録1・カメラは残った。 |
| `getThemes` 成功 → `getRecords` 失敗 | テーマ1・2のボタンが表示されたまま「体験記録を取得できませんでした。getRecords 制御失敗」を表示。`getThemes: 1 / getRecords: 1`。 | エラーの「再試行」で `getThemes: 1 / getRecords: 2` と保留 `getRecords` を確認。成功応答後、記録エラーが消え、場所1・2が復元した。カメラは維持された。 |

回復後にテーマ2を押すと `getRecords` がテーマ2で再実行され、場所2だけが地図に表示された。場所2を選ぶと「確認記録2」とテーマ2のチップが表示された。選択中だった場所1の詳細は切替直後も保持され、場所2を選ぶまで別場所へ勝手に移動しなかった。カメラ値も変化しなかった。画面: [theme-first-failed.png](theme-first-failed.png)、[record-first-failed.png](record-first-failed.png)、[theme-switch-restored.png](theme-switch-restored.png)。

両方を失敗させると、テーマと記録のエラーが別々に表示された。テーマ側の「再試行」を押すと `getThemes: 2 / getRecords: 1` となり、テーマ成功後はテーマボタンだけが復元され、記録エラーは残った。画面: [theme-only-recovered.png](theme-only-recovered.png)。

## チェック

- `bun install --frozen-lockfile`: 成功。
- `git diff --check`: 成功。
- `bun run typecheck`: 変更したファイルと確認ページの診断なし。既存の `server/core/core.test.ts`、`src/features/exploration/flow.ts`、`src/features/friends/screens.tsx`、`src/features/reflection/DiaryScreen.tsx`、`tools/local/dev.ts` の診断で失敗。
- Browser Console の page error: なし。

未解決: この確認は制御応答と地図代替を使用するため、実サーバー通信と Mapbox タイル上でのポインタ操作は検証対象外。
