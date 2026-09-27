# 設定の競合・部分失敗と接続引継ぎ

公式UI-SETTINGS claim。専用worktree `sodateru-settings-final-17`、API3317/PID79309、Vite5317/PID79549 (`--strictPort`)、origin `settings-states.localhost`。起動ログでこのworktreeのlive/demo SQLiteを確認。実操作は通常SessionRoot/共通clientで行った。

## 修正と実API確認

版競合時、旧実装は「現在の表示名」に競合前の値を表示した。別HTTP sessionがIf-Match付きPATCH /meで表示名を更新した後、ブラウザーで古い版を保存して再現した。409/412では自動再取得を行い、既存reconcileで下書きを保持するよう修正。保存応答後もabort済みなら画面stateへ反映しない。

1. ブラウザーの名前「残す下書き」を保持したまま、別HTTP sessionで「最新の保存名」version3へ更新。
2. 保存→実API版競合→自動再取得。競合カードは最新の保存名、入力欄は残す下書きのまま。「入力内容で保存」で成功。
3. MIME=image/pngだがPNG内容でない専用検査ファイルをfilechooserで選び、名前「名前だけ保存済み」も編集して保存。PATCH /me成功後、アイコンAPIが形式エラーを返し、「名前と紹介は保存済みです。媒体の内容とMIMEが一致しないか、未対応の形式です。」表示。写真失敗を全プロフィール失敗と混同しない。
4. 取消で未保存写真が消え、保存済みの名前は維持。同じファイルを選び直すと再び写真下書き/未保存表示が現れた。実画像保存成功自体は#365の既存証拠を再利用。
5. #377統合を含む7f10b80へ同期し、通常画面で特大・動きを減らすを保存。root font-size=24px、data-reduce-motion=trueへ実反映した。共有担当の再読込/mode reset証拠はdocs/evidence/UI-BASE/completion-entries-display.mdを再利用。
6. 通知を毎日時刻指定に切り替え、18:30を入力→保存成功/再取得後も18:30を表示。これは設定保存であり実通知配送の成功ではない。

## 制御可能なUI状態

既存previewのscenario=slowは2500ms遅延、scenario=unavailableは遅延後503を返す。常時「UI検査用のテスト応答・実API未接続」を表示し、製品からimportしない。

- unavailable：読み込み中→「検査用：設定を取得できません。」と再取得ボタン。利用不能を空/0件成功として表示しない。
- slow：プロフィール読み込み中を確認した同じ操作呼出内で設定へ移動。遅延時間後も設定画面のままで概要を表示。旧プロフィールへ戻らない。fixtureはabortを尊重し、実通信の遅着成功証拠とは区別する。
- slowで名前を編集して保存すると、読み込み・保存中を表示し、名前/紹介/写真/選択肢/保存/取消がdisabledになった。二重保存をUIから起こせない。
- 編集、競合、媒体部分失敗、取消は上記の実API画面で確認。

## 引継ぎ

connect-handoff.jsonは統合済み7f10b80の既存UI証拠・OpenAPI本文SHA256を参照。profile-settings/main--saveと正式patchMeを対応付け、settings/health feature pathを接続単位として渡す。契約を複製・変更しない。UI全体doneをCONNECT着手条件へ追加しない。

#191の5画面照合/狭幅/文字200%、#330の入力長、#340の取消/実再起動、#352の統計・取得元、#357の通常入口、#365の写真/本人mode分離は再試験しない。

残る境界：実機ソフトキーボードはこのデスクトップ環境で未確認。#145には実通信の呼出回数・応答不明再送・遅着、停止の実生成/保存/現在候補反映、データ操作の全受入を残す。#114の通知配送/期限処理の未定義は親調整中。健康#146/#148/#23はこの非健康完了とは別枠。

strict tsc（設定+preview）とgit diff --check成功。既存成功試験を繰り返さず、今回の競合修正は上記実API再現と修正後確認で検査した。
