# UI-RECORDS #11 同日再読込の失敗表示（2026-09-25）

## 範囲と結果

今回の変更は `src/features/activity/` の今日の軌跡だけ。同じ日を再表示する通信中・失敗時、取得済みの記録・訪問・位置・本文・場所を保持する。取得失敗を明示し、再試行できる。別日に切り替えた場合は前日のデータを消し、通信失敗を空記録・未記録・0か所として断定しない。選択カードも同日の再表示では保持する。

## 実画面

- `dist/assets/index-DpFg3ewI.js` を同梱の isolated API/静的サーバーで `http://127.0.0.1:3284/#/daily-track?date=2026-09-15` として表示。390×844のChromium、demo APIに4地点・4訪問・3経路区間をseed。Mapboxは既存のsource `.env` の実tokenをプロセスで使用し、値を記録していない。
- 4地点と地図番号を表示し、象の鼻カフェのカードを展開。通常地図へ移動して戻っても、4件・選択カードを保持することを確認。
- ブラウザー上の画面とAPIを保持したまま isolated serverを停止し、同じ操作で再表示。記録/訪問/位置の `Failed to fetch` と前回内容の表示・再試行ボタンが現れ、4件・展開中の本文/操作が残ることを確認。[エラー画面](2026-09-25-reload-error-mobile.png)、[保存済みカード](2026-09-25-reload-error-preserved-card.png)。これは制御した通信断のUI検証であり、live APIの障害検証ではない。
- 通信断のまま9月14日へ切替。9月15日の4件・地図番号は消え、エラーと再試行を表示。空記録メッセージと「移動経路は未記録」は表示しない。最終差分で0か所表示も抑制した（この微修正はtargeted UI testとbuildで確認）。
- スクリーンショットの地図上部にはMapboxタイルの部分取得警告が別に表示される。今回の記録API通信断とは別の既知の環境状態。

## 検証

- `bunx vitest run src/features/activity/DailyTrack.test.tsx src/features/activity/track-map.test.ts`: 2 files / 6 tests PASS。通信失敗を空記録・未記録・0か所と誤表示しない回帰テストを追加。
- `vite build`（source `.env` を読込）PASS、出力 `index-DpFg3ewI.js`。`git diff --check` PASS。
- `bun run typecheck` は失敗。今回のactivity変更には新たな診断なし。既存の `server/core/core.test.ts`、`src/features/exploration/flow.ts`、`src/features/friends/screens.tsx`、`src/features/reflection/DiaryScreen.tsx`、`tools/local/dev.ts` の診断が残る。

## #11全体の判定

これは同日再表示・失敗状態の一部分のみ。元の7画面の全受入、実保存データ2組・媒体失敗・端末許可・成長・削除preview/export・insight理由などは [受入棚卸し](acceptance-inventory.md) のまま未達/未確認。#11を完了またはcloseしない。今回の編集はactivityとこの証拠のみ。claimは `src/features/records/` も含め3 pathだったがrecordsは変更していない。#189への引継ぎはclaim release後とする。
