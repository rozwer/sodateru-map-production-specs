# お願い：公開・共感・削除の残り3操作（#144 / #113）

対象コード: `ed225d9c5e7d15e9a4a316d354c9b67863b690e9`（最新developから公式requests-save claim）。
既存#353の実装を変更せず、未確認だった3操作と依頼/ガイド導線だけをChrome通常Appで確認した。
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
依頼フォームを開いただけでは新しい投稿が増えていない。今回作成したテスト投稿を削除した。

## 既存証拠との対応と終了境界

- #353 / `3a83df1c2915ef47182f9dff427f6b9f3d8c6729`（merge `d5245f89af35cf6f6da945f44983a95089e1164e`）:
  private新規保存→一覧/reload、DB同ID、本人編集で同じIDのversion1→2と本文一致。
  3試験・全体型check/build成功は再利用する。今回コード変更がないため再実行しない。
- 本証拠: public切替・共感追加/解除・本人削除reload・依頼/guide導線を追加。3操作のblocking bugはなし。
- #113全体をcloseしない理由: 本文はタグ入力と「デモ必須」も要求するが、現Editorは名前/本文/公開範囲のみでタグ入力がなく、実保存の通し証拠はlive。UI fixtureの模擬デモを正式APIのdemo namespace受入へ読み替えない。
- #144全体はバイク/聖地の実接続等が未完。今回3操作の成功で全体finishしない。
- 最小の次作業は#113のデモAPI投稿1件で一覧を確認し、タグ入力要件を原本・既存契約と照合して既存画面の必要最小限を定めること。新規汎用store/API/schemaは不要。今回は追加しない。
