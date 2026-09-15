# 今日の軌跡：ルート全体表示

Issue: https://github.com/rozwer/sodateru-map-production-specs/issues/277

対象は本証拠を含む `mattsun/277-daily-track` の提出commit。比較元は `71279ce6b36606f13d9bef3f9e8f5bd3775d407b`。2026-09-15 15:08 JSTの最終ビルドは `index-J5FYFRFE.js` / `index-fWP8E7xs.css`。

## 変更と確認

- 入力された全軌跡・地点の座標から表示範囲を求め、余白付きで全体表示。遠方座標を削除・移動しない。単一地点・短距離は最大zoom 16。
- 時刻順の立寄り番号、出発・到着、全体を見る操作を追加。日時がない地点も番号なしで表示範囲へ含める。同一座標は先頭番号にまとめ、タップで最初の記録を開く。後続記録はタイムラインから開ける。
- TrackPointの区間・切れ目を保持。未取得の経路を直線で補わない。経路未記録時は地点のみ表示し、その旨を示す。
- 地図マーカーに共有CSSの `position: relative` が当たり、後続ピンが通常フロー分ずれていた問題を、この画面内の `position: absolute` で修正。
- 390×844と1440×900で地図・番号・全経路・タイムラインを実画面確認。双方の文書幅はviewport幅と一致し、横スクロールなし。番号2のタップで対応記録が展開。地図をドラッグ後、全体を見るで復帰。

| 比較 | 証拠 |
| --- | --- |
| 変更前・390px | [before-390.png](before-390.png) |
| 変更後・390px | [after-390.png](after-390.png) |
| 変更後・1440px | [after-1440.png](after-1440.png) |

## 検証結果

- `mise exec -- bunx vitest run src/features/activity/track-map.test.ts`: **4件成功**。日時なし遠方地点の回帰テストは修正前に失敗することを確認。
- `mise exec -- node --env-file-if-exists=.env node_modules/vite/bin/vite.js build`: **成功**。公開Mapboxトークンを設定した環境を使用。既存の大きなchunk警告あり。
- `git diff --check`: 成功。
- `mise exec -- bun run typecheck`: 変更範囲外の既存12エラーで失敗。`server/app/core.test.ts` のdisplayName、exploration/flowのrequestId、friends/screensのentry、reflectionDiaryのversion、tools/local/devのchildが対象。本変更のファイルに診断なし。
- Solによるコードレビュー済み。日時なし地点の除外を修正し、同一地点の先頭記録を開く挙動に案内文を合わせた。

## 撮影用環境とデータ出典

プレビュー: http://127.0.0.1:3277/#/daily-track （self / demo、2026-09-15）。独立APIとこのworktreeのdistを使用。共有API 3001・撮影担当API 18531には変更なし。

撮影データはユーザー承認済みの補完サンプルで、実測GPSではない。4地点・4訪問と本文・時刻を撮影用に作成した。OMO7と会場は既存資料の座標、カフェと公園は地点providerの検索結果。3区間・203点の道路形状はMapbox Directionsの応答を無加工で使用した。移動時刻は合成値。`sourcePointId`、大きなaccuracy値、[capture-receipt.json](capture-receipt.json)に由来を保持。画面の「デモ」バッジはユーザー指定によりこの画面だけ非表示にし、内部dataModeは変更していない。

再現時は専用worktreeで依存と `.env` のMapbox設定を用意し、本番ビルド後、次を実行する。

```sh
mise exec -- node --env-file-if-exists=.env docs/evidence/DAILY-TRACK-ROUTE/capture-server.mjs
# 別ターミナル。3277の独立demoデータだけに投入する。
mise exec -- node docs/evidence/DAILY-TRACK-ROUTE/seed-capture.mjs
```

変更前比較には `baseline.config.ts` をViteの `--config` に渡し、5278を開く。同じ3277のデータを使い、上記比較元commitの画面コードを読み込む。

動画撮影は撮影担当に引継ぎ。機能とPRの提出までが本担当の範囲で、統合・board完了・Issue終了は未完了。
