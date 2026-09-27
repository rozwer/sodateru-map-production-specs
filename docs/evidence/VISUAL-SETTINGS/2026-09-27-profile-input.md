# プロフィール入力の修復（#191 / #17）

基点: `30128adf3cfdfab1db7b438da2ec1eea21b5cdab`。公式task:worktreeでVISUAL-SETTINGSをclaimし、取得したsettings配下のみ修正。

## 修正

- 表示名20文字・紹介200文字の上限を保存時と同じUnicodeコードポイント単位に統一。従来のHTML maxlengthはUTF-16単位のため、絵文字だけの名前は10文字で止まり、カウンターと一致しなかった。
- 写真選択時にinputの値を空に戻す。選択したFileはdraftに保持し、取消後やファイルエラー後も同じファイルを選び直すとchangeが発生する。
- レイアウト・参照画像・API契約・共有ファイルは変更しない。

## 確認

Vite 7.1.5、`http://127.0.0.1:5193/docs/evidence/VISUAL-SETTINGS/preview/index.html#/profile-settings`、Codex内ブラウザ。画面には「UI検査用のテスト応答・実API未接続」を常時表示。

1. 名前へ😀を21文字入力 → 入力値20文字、カウンター20/20。
2. 紹介へ🌸を201文字入力 → 入力値200文字、カウンター200/200。
3. 保存 → 「保存しました。保存済みの内容を再取得しました。」表示。
4. ブラウザreload → 名前20文字・紹介200文字を再表示。
5. settings/screens.tsxからのstrict TypeScript検査成功（tsc --noEmit、jsx react-jsx、module esnext、target es2022、moduleResolution bundler、allowImportingTsExtensions、skipLibCheck、types node,vite/client）。

これはfixture/sessionStorageでのUI確認であり、実API/DB/再起動の成功ではない。写真の実ファイル選択・同一ファイル再選択の実機確認は未完。名前・紹介のコードポイント上限は既存保存処理とサーバJSON Schemaに合わせたもので、書記素数への仕様変更ではない。

## 5画面の今回の範囲と残件

|画面|今回の確認・修正|残件|
|---|---|---|
|settings|既存成果保持|参照差分・全状態・指定幅の再照合|
|profile-settings|上記入力境界と保存再表示のfixture実操作|実写真/live再起動、IME、320/390/1440・200%・実機キーボード|
|suggestion-settings|既存成果保持|実API停止解除と写真seed、参照再照合|
|activity-stats|共有生成clientの提供状態を再確認|正式operation/DTO、本番登録、実集計・参照再照合|
|data-sources|共有生成clientの提供状態を再確認|正式operation/DTO、本番登録、日付別原記録への遷移|

#101/#145のコメントは統計HTTPの提供を報告している。しかし基点の`packages/api-client/`には`getReflectionActivityStatistics`と`ActivityStatistics`が存在しない（rg検索0件）。#191本文の「generated clientに必要operationがない場合は、フロント側で独自型/APIを作らず具体的な不足として記録」に従い、独自API/DTOを追加していない。親調整セッションへ不足を連絡済み。COREによる生成client提供後、#145の正式取得で接続する。

本PRは部分修復。#17/#145/#191は閉じず、健康3画面は#146の未実施として維持する。
