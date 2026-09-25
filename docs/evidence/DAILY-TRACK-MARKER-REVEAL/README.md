# DAILY-TRACK-MARKER-REVEAL (#284)

2026-09-25、`origin/develop` の `ce763c7` から専用 worktree で実装・確認。対象 commit は #284 提出 PR の HEAD。#277 の軌跡表示と通常地図の MapBridge 契約を維持し、今日の軌跡画面内で番号付き滞在地点を選ぶと対応するカードを展開して見える位置へ移す。始終点と重なる滞在地点は前面に置く。

## 実画面確認

- [390px 選択前](before-390.png) → [390px 4番をポインター選択後](after-390-pointer.png): 4番のカードが展開し、フォーカスされ、訪問の確認・訂正ボタンまで下部ナビの上に表示。スクロール位置は `0 → 353`。同じ番号を再度押した場合も `0 → 353`。訪問ボタンは `visitId=capture277-venue-visit` の確認画面へ遷移。
- [1440px 4番をポインター選択後](after-1440-pointer.png): 地図の経路・切れ目・始終点・番号を表示。カードは展開し、既に画面内なのでスクロール位置 `0` のまま。
- 翌日への切替ではカードが閉じ、スクロール位置は `0`。通常地図ボタンから `#/map?date=2026-09-15` に戻ることを確認。
- 滞在マーカーへキーボードフォーカスを移して Enter を押すと、対応するカードが展開し、そのカードのボタンへフォーカスが移ることを確認。
- `bunx vitest run src/features/activity/DailyTrack.test.tsx src/features/activity/track-map.test.ts`: 5件成功。再選択、手動展開・日付変更、画面内のカード、reduced motion を確認。
- `bunx vite build`: 成功。`bun run typecheck` は既存箇所に加えて実装中の型エラーを検出し、今回の変更箇所は修正済み。残存する既存エラーは `server/core/core.test.ts`、`src/features/exploration/flow.ts`、`src/features/friends/screens.tsx`、`src/features/reflection/DiaryScreen.tsx`、`tools/local/dev.ts`。

## データと撮影環境

`capture-server.mjs` でポート 3284 の隔離 API とビルド済みフロントを起動し、`seed-capture.mjs` を demo モードだけで実行。[投入結果](capture-receipt.json) は地点4件・確認済み訪問4件・経路3区間。OMO7 と THE BEACH の座標は #277 の撮影用地点情報、象の鼻カフェと山下公園は既存の場所検索 API の候補から取得。経路座標は既存の経路検索 API の Mapbox Directions 結果を改変せず使用。時刻と本文は撮影用の合成値で、GPS の実測を示さない。共有 DB・本番 DB には書き込んでいない。

ブラウザでは Mapbox の一部タイル取得警告が出たが、経路・地点・操作対象は表示された。これは外部地図タイルの取得状態であり、バックエンド接続の完成を示す証拠ではない。
