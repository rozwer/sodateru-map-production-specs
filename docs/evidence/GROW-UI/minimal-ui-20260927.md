# #215 今回の最小UI確認（2026-09-27）

対象: `src/features/plugins/screens.tsx`。既存の UI-PLUGINS fixture を Chrome で開き、地図→メニュー→アプリを育てるの通常入口から操作した。fixture は画面に「模擬操作（未保存）」と表示され、API/DB の保存結果ではない。

- ストア→バイク詳細→試用で地域「東山公園」・車種「普通二輪」を選び、プレビュー→確認→取消で入力が保持された。確認後の模擬保存は管理に戻り、版更新と解除取消も操作できた。
- ストア→お願い一覧→新規入力→下書き保存で模擬下書きが一覧に表示された。修正前は一覧から「戻る」で保存済み編集画面が再表示された。保存・削除完了時に既存の `back()` を使い、修正後は一覧の「戻る」でストアへ戻ることを確認した。
- ストア→防災詳細→専用画面で、レイヤー、地域選択、出典タブ、地図へ戻る導線を確認した。fixture にはセッション/API がなく防災情報は「未取得」と表示された。実データ・導入保存の確認ではない。
- 390×844 の試用と防災、1536×1024 のストアを目視確認。両幅で `document.documentElement.scrollWidth === innerWidth`。地図接続設定なしの表示があり、地図描画一致の証拠にはしない。

Vite production build 成功（228 modules）、`git diff --check` 成功。全体 TypeScript 検査は変更外の `server/features/companion/package.ts`（`sharp` 解決）と `src/features/companion/screens.test.tsx`（未定義可能性）で失敗し、変更ファイルの診断はない。実AI、バックエンド、実通信、端末権限は今回扱わない。
