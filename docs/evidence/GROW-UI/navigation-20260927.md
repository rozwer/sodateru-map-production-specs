# #215 検索・試用の画面復帰修復（2026-09-27）

この文書を含む提出commitが対象。公式 `task:worktree` で取得した
`rozwer/215-grow-ui-repair`。変更は `src/features/plugins/screens.tsx` のみ。

## 再現と修正

通常のAppは非表示になったInspectionScreenの子をunmountするため、
ストアで「バイク」「移動」を選んで詳細→戻ると、検索が空・分類がすべてに戻った。
Chromeの実クリックで修正前の消失を再現した。

検索・カテゴリ・プレビュー表示済み状態を、既存の `useScreenState` にまとめた。
本人/データモード/routeごとの共通保持機構を使い、共通Shellは変更していない。
確認から試用へ戻るとプレビューは導入前から自動比較を再開する。
条件変更時は従来どおりプレビューを消し、再確認を必要とする。

## 実操作

専用worktreeのVite 127.0.0.1:5195、専用worktree内のAPI/SQLite（3001）、
Chrome、デモON。通常の本人選択→地図から開始。共有5173/3002は操作していない。

|画面|操作・結果|未確認|
|---|---|---|
|plugin-store|バイク検索＋移動→詳細→戻るで検索・分類・1件表示を保持|全原本画像との最終照合|
|plugin-detail|バイク詳細→試してみる→車種条件へ遷移|地図背景は接続設定なし|
|plugin-trial|東山公園＋普通二輪→プレビュー→確認→戻るで入力・試用プレビュー・確認ボタン保持|実交通条件の適用|
|plugin-install|確認の地域・車種が選択と一致。390×844でも大型二輪で往復後に保持|API導入保存は今回対象外|
|plugin-trial（変更）|復帰後に大型二輪へ変更するとプレビューが消えて「プレビューを表示」に戻る。再表示後の往復も成功|なし（当該操作）|

390×844の試用で `innerWidth=scrollWidth=390`。スクリーンショットを実見し、
選択カード・プレビュー・確認ボタンが横にはみ出さないことを確認した。
地図設定不足を表示しており、地図描画合格・原本との一致の証拠にはしない。

## チェック・残件

- Vite production build成功（219 modules）。diff --check成功。
- 全体typecheckは失敗。診断は server/core/core.test.ts のdisplayName不足、
  exploration/flow.ts、friends/screens.tsx、reflection/DiaryScreen.tsx、tools/local/dev.ts。
  今回変更したpluginsファイルの診断はない。
- バイク・聖地・お願いは未保存fixtureの表示を維持。DB永続化・再読込復帰を実装したとは扱わない。
- 固定の模擬道路は本山から東山をまたぐ提供済データ。地理座標や提供元のreference-data/assetsは変更していない。
- #215の全9画面最終画像照合、3車種glyph等の既存見た目差分は残る。
- #18の画面群全受入、#144のAPI/DB実接続は未完。本PRはIssueを閉じない。
- 全体チェックと独立レビューが未充足のため、マージせず提出commitを保持して引き継ぐ。
