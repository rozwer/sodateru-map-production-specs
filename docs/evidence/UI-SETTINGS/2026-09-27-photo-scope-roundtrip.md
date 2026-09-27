# プロフィール写真と設定分離の実操作確認

確認日: 2026-09-27。対象実装: `ed225d9c5e7d15e9a4a316d354c9b67863b690e9`。
Issue #17 の部分検証、#83 の受入判断用。本番コードの変更はなし。#17/#145 全体の完了を意味しない。

## 環境

専用worktree `/Users/roz/Documents/sodateru-settings-photo-17`、API `3217`、Vite `5217` (`--strictPort`)、専用origin `http://settings-photo.localhost:5217`。APIのDBはこのworktreeの `.local/app.sqlite` / `.local/demo.sqlite`。他セッションのAPI/DBは使わない。ローカル本人はselfとother（設定確認B）の2名。通常のSessionRootと共通API clientを使い、fixture画面は使わない。

起動: `SODATERU_PORT=3217 mise exec -- node --experimental-transform-types server/app/main.ts`、`SODATERU_API_ORIGIN=http://127.0.0.1:3217 mise exec -- bunx vite --host 127.0.0.1 --port 5217 --strictPort`。

## 保存設定と分離: 成功

Chromeのプロフィール画面でlive/selfの表示名を「設定確認A」、文字サイズを「大」に変更して保存。「保存しました。保存済みの内容を再取得しました。」を確認した。

開始画面 `#/$start` の本人/デモ切替を操作し、各状態から `#/profile-settings` を開いた。

|順序|本人とモード|表示名|文字サイズ|
|---|---|---|---|
|1|live/self 保存後|設定確認A|大|
|2|live/other|設定確認B|標準|
|3|demo/self|自分|標準|
|4|live/selfへ復帰し再読込|設定確認A|大|

DOMでも最終状態のtextbox「設定確認A」とbutton「大」pressedを確認。保存値の本人別・モード別の混在は観測されなかった。ルート `#/start` は開始画面ではないため使わず、正式な `#/$start` を使用した。

## 既存PNGの選択・保存・再読込: 成功

IABで同じ専用originへ入り、live/selfの「写真を変更」から正式なfilechooserを使って `src/ui/assets/start-background.png` を選択。未保存表示と「プロフィール写真」が現れた後、「保存」を押し成功表示を確認した。ページ再読込後も「プロフィール写真」と「写真を外す」が表示され、画像DOMは `complete=true, naturalWidth=941, naturalHeight=1672`。表示名「設定確認A」と文字サイズ「大」も保持された。HTTP直接uploadによる代用はしていない。

先に試したChromeではfilechooser.setFilesがNot allowed（拡張のAllow access to file URLs未許可）、macOS nativeもnoWindowsAvailableとなった。これは実装不具合ではなく操作環境の制約。権限変更はせず、IABの正式APIで上記操作を完了した。

## HTML書き出し: UIリンク生成と実API本文一致は成功、ブラウザー保存は未確認

通常画面 `#/$data-settings` の「プロフィールと設定を書き出す」を押すと、共通clientの実API応答から「作成した文書をダウンロード」リンクが生成された。ChromeとIABでリンク表示を確認した。実装上のdownload名は `育てる地図-プロフィールと設定.html`。

リンククリック後、Chrome/IABとも自動操作のdownloadイベントはタイムアウトした。端末上の完成ファイルは確認できていない。さらにblobリンクの本文確認はBrowser URL policyに拒否されたため、回避操作は行っていない。リンク生成をファイル保存・本文一致の成功と扱わない。

独立した実API応答確認では、専用API `GET /api/v1/me/settings/export` がHTTP 200、`Content-Type: text/html; charset=utf-8`、`Content-Disposition: attachment; filename="profile-settings.html"` を返した。本文1925 bytesに `<th>表示名</th><td>設定確認A</td>` と `<th>文字サイズ</th><td>大きい</td>` が含まれ、画面で保存した値と一致した。応答本文を [2026-09-27-settings-export.html](2026-09-27-settings-export.html) に記録した。これはブラウザーのblob URLを迂回して開いたものではなく、別のHTTP sessionで取得したサーバー応答の確認であり、ブラウザーのダウンロード完了証拠とは区別する。

## 残りの最小確認

同じ専用originのlive/selfでデータの管理を開き、書き出したHTMLを通常ブラウザーで保存して開く。保存ファイルを確認する。サーバー応答本文の名前・文字サイズ一致は上記で確認済み。#83全体のclose判断は、このHTMLの端末保存・内容確認を含む独立レビュー後に行う。写真の再検証は不要。
