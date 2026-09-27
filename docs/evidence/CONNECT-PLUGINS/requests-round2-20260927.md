# お願い：公開・共感・削除の残り3操作（#144 / #113）

対象コード: `ed225d9c5e7d15e9a4a316d354c9b67863b690e9`（最新developから公式requests-save claim）。
既存#353の実装で未確認だった3操作と依頼/ガイド導線をChrome通常Appで確認した。
その後#113の不足だったタグ入力だけを既存フォーム/契約へ追加し、正式デモAPIで保存再取得を確認した。
新規private保存・本人編集は#353の結果を再利用し、再実行していない。

## 環境・結果

専用host `http://plugins-requests.localhost:45197/`、strictPort、API43197。
API PID18970/Vite PID19073、cwdは `/Users/roz/Documents/sodateru-requests-round2`。
前周の専用DB `/Users/roz/Documents/sodateru-connect-plugins-144/.local/requests-qa/live.sqlite` を再利用。
mode=live、本人A=`requests-person-a` / B=`requests-person-b`。他セッションのDB/Cookieは使用しない。

対象IDは前周の `086351d8-2f1b-4988-8c97-9ff47bb39cd6`。

|操作|通常画面の実結果|
|---|---|
|公開|Aの既存private投稿を編集し公開→変更を保存。公開一覧へ同じ本文・表示名が移る。|
|共感追加|開始画面からBへ切替。Aの公開投稿に編集/削除はなく、共感0→1。reload後もチェックON/1件。|
|共感解除|Bで取り消す→0件。その後フォームから戻った一覧の再取得でもOFF/0件。|
|人に頼む|既存feature-request-editへ遷移。Bの表示名と元投稿の本文を引継ぎ、private初期値。送信せず戻る。|
|自分で開発|一覧の実リンクをクリックし、GitHubのdevelop/.agents/skills/sodateru-task/SKILL.mdページを新tabで表示。URLはgetFeatureRequestDevelopmentGuideの返却先。|
|本人削除|Aへ戻り同じIDの削除確認→削除。公開一覧が0件となりreload後も空。|

最後にSQLiteをread-only照合: 対象post=null、対象IDの共感count=0、全投稿count=0。
依頼フォームを開いただけでは新しい投稿が増えていない。前周に作成したテスト投稿を削除した。

## タグ入力・正式デモAPIの追加確認

- 既存request-fieldの名前/本文と同じ様式で地域・目的タグを追加。APIのregionTags/purposeTagsへ渡すだけで、新API/schema/storeは作らない。カンマ区切りを配列にし、既存契約の5件/各20文字を送信前に検査する。再送照合にもタグを含める。
- 通常開始画面でデモON→本人A。本文「雨の日も歩きやすい道が知りたい（デモ）」、地域「本山, 東山公園」、目的「雨の日, 散歩」、publicで投稿→一覧に4タグが表示。
- reload→編集で同じ本文/タグと固定表示名を復元。目的を「雨の日, 街歩き」に変更→保存→reloadで新タグを表示。
- demo ID `0f90639b-3cf2-4a11-ae92-f9eb1b66cc51`、version2。SQLite read-onlyでも同じID/本文/public/タグ配列。live側投稿0件を同時確認し、デモを実データへ混入させていない。
- タグ込み同ID/key再送を既存テストへ追記。3試験PASS、全体typecheck PASS、production build PASS。既存UI fixtureの原本照合用画面にはタグ欄を追加せず、通常API画面で提供する。

## 既存証拠との対応と終了境界

- #353 / `3a83df1c2915ef47182f9dff427f6b9f3d8c6729`（merge `d5245f89af35cf6f6da945f44983a95089e1164e`）:
  private新規保存→一覧/reload、DB同ID、本人編集で同じIDのversion1→2と本文一致。
  新規保存/編集の実操作証拠を再利用する。追加タグ差分についてのみ上記チェックを実行した。
- 本証拠: public切替・共感追加/解除・本人削除reload・依頼/guide導線を追加。3操作のblocking bugはなし。
- #113最小受入: 固定名/本文/タグ/privateまたはpublic→投稿→一覧、共感追加解除件数、本人編集/削除reload、依頼フォーム/実GitHubガイド、正式APIデモを上記と#353で確認。独立レビュー/通常統合後に終了可能。#31のbackend先行証拠は再試験しない。
- #144全体はバイク/聖地の実接続等が未完。今回3操作の成功で全体finishしない。
- #144の未完はバイク/聖地導入等であり、今回のお願い接続完了と分離する。別機能をこのPRへ追加しない。
