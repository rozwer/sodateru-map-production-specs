# 設定の保存前取消と実API往復（#145）

## 実装と対象

基点 `358eb63aa8329fce20b9ce9a48e43bc7be6f36d7`。#330/10d66d7は独立レビュー後に通常merge (`0391e74`)。#191をrelease・受信解除し、公式task:worktreeでCONNECT-SETTINGSを取得した。

既存useSettingsEditor.discardは存在したが、競合のない通常編集画面から操作できなかった。共有EditorSaveに「変更を取り消す」を接続した。未保存の変更がある時だけ表示し、読み込み・保存中は無効。取消は既存savedPerson/savedSettingsへdraftを戻し、APIを呼ばない。サーバーやAPI契約、共通Shellは変更していない。

## 実行環境

- worktree `/Users/roz/Documents/sodateru-settings-145`。
- API: `SODATERU_PORT=3195 mise exec -- node --experimental-transform-types server/app/main.ts`。起動ログのDBは同worktreeの `.local/app.sqlite` / `.local/demo.sqlite`。
- Vite最終起動: `SODATERU_API_ORIGIN=http://127.0.0.1:3195 mise exec -- bunx vite --host 127.0.0.1 --port 5198 --strictPort`。
- 最終ブラウザURL: `http://settings-145.localhost:5198/#/profile-settings`。担当専用ホストで並行セッションのCookie衝突を避ける。検証ホストは製品コードに埋め込まない。
- API再起動前PID76013、再起動後85653。Vite最終PID88302。最初に5198を使ったPID76083のcwdは上記worktreeとlsofで照合済み。
- self / live、本人ID `d150a118-635e-4ea0-a375-41f941e9a76d`。新規隔離DBの試験本人。fixtureレスポンス差替えなし。

## 実ブラウザ結果

1. 正しい5198で名前「設定確認🌸」、紹介「隔離DBで保存と再起動を確認しています。」、文字サイズ「大」、動きを減らすonを保存。画面に「保存しました。保存済みの内容を再取得しました。」。SQLiteのpeopleも同値/version2（live-profile-save.json）。demoのpeopleは自分/空/version1のまま。
2. 自分のAPI PID76013のみ停止。名前「保存しない名前」/文字「特大」で保存すると「通信に失敗しました。」表示、入力は維持。新設の取消で名前「設定確認🌸」/文字「大」に復元し未保存表示と取消ボタンが消える。
3. APIを同じDBで再起動（PID85653）、ブラウザreload。保存済みプロフィール・表示設定を再表示。失敗した編集は保存されていない。
4. 提案設定で「常に受け取る」/「過去3か月」へ編集→取消。保存前の「自分で開いたとき」/「過去1か月」へ戻る。再度編集→保存→reloadで「常に受け取る」/「過去3か月」を再表示。
5. 担当専用settings-145.localhostで新しい本人セッションを開始し、プロフィールの保存済み4値を再表示。名前「これは保存しません」へ編集→取消→reloadで「設定確認🌸」を保持。
6. 正式API3195へ独立Cookie jarでGET /me・GET /me/settingsを再取得。liveはPerson.version2・Settings.version3、demoは各version1の既定値（after-restart-api.json）。ブラウザとAPIの値が一致する。

利用operationは既存getMe/patchMe/getMeSettings/patchMeSettings。名前/紹介変更はPATCH /me、表示・提案条件変更はPATCH /me/settingsで独立versionを使用し、保存後GETで再取得する。今回の証拠は画面状態・DB/API結果の照合であり、ブラウザの全request trace/条件付き呼出回数の検査は未完。

設定コンポーネントのstrict TypeScript検査、git diff --check、公式task:verify成功。取消処理は既存実装へのUI接続であり、追加の業務処理・独自保存はない。

## 誤接続の除外と復旧

初回Viteが5195競合で5198へ移動したログを確認する前に、5195（PID65055、cwd sodateru-grow-215、API3001）で誤ってプロフィール試験保存した。この試験を本受入から除外した。名前/紹介/文字サイズ/reduceMotionの4値だけ変更したことをGROW担当へ報告し、同担当がliveを編集中でないことを確認。GETで4値が試験値のままと確認後、If-Match version2でPATCH /meの2値とPATCH /me/settingsのdisplayの2値のみ復旧した。GET再取得で自分/空/standard/false、各version3を確認（port-mismatch-recovery.json）。DB全体の置換や他担当サーバーの停止はしていない。

対策: --strictPortと専用*.localhostを使用し、起動URL/PID cwd/APIのDBログを照合後に保存する。最初の127.0.0.1検証を複数本人の分離PASSとは扱わない。

## 未完

- 写真の実選択・保存・再選択は未検証。ブラウザfilechooser待機が失敗したため成功に数えない。
- 別本人切替/版競合/遅着/部分保存失敗/応答不明再送と、停止場所・活動の実生成反映は未検証。
- 非健康統計/取得元の生成client不足はCORE対応中。独自API/DTOは追加しない。
- 5画面の参照一致・全viewport・文字200%・実機キーボードは#17/#191の残件。

部分修復・部分受入の証拠であり#145/#17/#191を閉じない。
