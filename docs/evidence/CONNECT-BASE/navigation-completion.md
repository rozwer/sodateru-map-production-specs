# 共通接続の残条件検証 2026-09-27

基点develop 7f10b80d2002620b3f48caf1be5697d707f7ecf1。PR377の正式handoff後、CONNECT-BASE/navigation-contextを取得。

## 修正

カード表示へ移るとhidden Sheetへのfocusが成立せずbodyに抜け、AppのEscape handlerまでキーイベントが届かない不具合を実IABで再現。表示中dialogがないときはtabIndex=-1のmainへfocusし、カードからEscapeで元menu行へ復帰できるよう修正。hidden画面はfocus対象にしない。

## 実HTTP再送と保存

session-http.test.tsxは製品App/useLocalSession＋実Hono HTTP＋独立live/demo SQLite。最初のPOST /api/v1/sessionは実DB commit/201応答取得後、cookieを受理する前にtransportだけを失敗させる。画面は未開始/errorを維持。再操作は同じIdempotency-Keyを使用し200（CORE replay実装の正式結果）で同じ本人へ復帰。core_sessionsは1行で重複なし。

その後の本人切替、live/demo旧応答abort、閲覧no mutation、server/DB再起動で同person.id復元は既存テストを継続。POST結果はlive201→live200再送→別本人live201→demo201。

## 実ブラウザとDB不変

専用 http://connect137.localhost:3249、独立.local/app.sqlite/demo.sqlite、IAB390×844、実API・production build。

- 地図→共通menu→自分/みんな/拡張機能/設定→Escape往復。各画面実表示、menuの元行へのfocus復元。カード画面のEscapeは上記修正後PASS。
- 閲覧一巡の前後でlive SQLite全65tableの全行digestを比較し changed=[]。この一巡では保存済みDB不変。拡張機能画面が表示する模擬操作告知は維持し、拡張機能自体の実接続成功とは主張しない。
- PR373統合後のMapbox道路/地名実描画を確認、一部取得失敗表示は解消。旧証拠のこの未達を更新。[390px実描画](map-373-390.png)。
- PR377の通常menu4入口、date/timeZone、scroll/focusと設定保存・reload・mode分離の証拠を再利用。

## 検証結果と適用範囲

navigation-entry 5件＋session-http 1件PASS、production build PASS。全体tscは今回変更外src/features/exploration/consent-navigation.test.tsx:19 params union/20 nullable draftの2診断で失敗、探索担当へ修正依頼済み。

navigation/interactions.jsonの全操作api=[]。業務保存競合、共有削除の別本人反映はnavigation自身には存在せず、各業務CONNECTの責任をこの証拠で代替しない。本人開始POST再送は実対象として上記確認。

#137を全件完了とはしない。経路案内の実UI同ID継続はroutes担当の提出証拠待ち。記録中の全端末動作、全checkActions/原本画像/実端末keyboard等はこの限定証拠でPASSにしない。音声相談の非active時端末cancelは#103の未確認音声を送信しない境界であり、保存済記録/案内の終了とは区別する。
