# #105 写真・メモ一覧と共有境界

対象: rozwer/105-acceptance（base 86769d1）。専用worktree、main API 127.0.0.1:64318、Vite themes105.localhost:5189 strictPort、合成専用 live/demo DB。地図token未設定で地図表示は未検証。利用者データは使用しない。

## 修正

- 共用InsightPhotoが保護media URLをimgへ直接設定し、X-Request-Id不足400で写真を表示できなかった。既存api.requestのcontent操作でBlobを取得し、変更/unmount時にabort/revokeする。未保存のlocal blob写真はそのまま表示。
- INFORMATION ownRecordsPageがeditableRecordViewだけ返し、詳細にはあるmemo補助項目が一覧に欠落していた。既存recordExtensionsのreadを本人一覧に適用。詳細と同じ名前/由来version/keywordsを返す。

## 実ブラウザ

IAB公式file chooserで既存合成画像 docs/evidence/INSIGHTS/generated-media/park.png を選択。選択前media=0、選択後media=0、cancel後media=0（readonly SQL）。再選択し公園記録を保存先に指定、保存でmedia=1 ready、record_id一致、テーマcover_media_id一致。写真未選択先では保存disabled。修正後のreloadで代表写真img.complete=true / naturalWidth=1448。

元テーマ c38a30c4-33d8-43fa-8796-df47414bfadd を残し、同名「場所なしテーマの採用確認」、紫、公園記録、既存写真で別ID 7a5a20e2-5e33-40ef-a4fe-81e402faff98 を画面作成。画面で所属を公園から書店へ変更→保存→reload→編集で公園unchecked/書店checked/紫/写真保持。元テーマは2件のまま。既存写真選択ではupload増加なし。

## 実HTTP

`THEMES_AUDIT_ORIGIN=http://127.0.0.1:64318 THEMES_AUDIT_THEME=c38a30c4-33d8-43fa-8796-df47414bfadd mise exec -- node docs/evidence/THEMES/acceptance-http-20260927.mjs`

結果 acceptance-http-20260927.json。本人/承認済み友人/非友人3 session、private/selected/publicを切替。privateは本人だけ、selectedは指定友人だけ、公開テーマでも非公開record/photoを非表示。recipient IDs非開示、friend audience一致、共有record許可時だけcover公開、privateへ復帰。メモ新規作成→本人一覧で名前/由来version/keywords一致も確認。

## 検証

- whole typecheck pass（テストcontext.signal不足を修正後）
- memo-integration test pass（本人一覧memo回帰assert追加）
- photo/screen focused UI tests: 2件pass

## 完了範囲

写真再表示とメモ一覧の不具合修正および今回記載の受入確認。既存AI採用/手動メモ永続化の証拠は live-naming.json / naming-ui-20260927.md / place-less-entry-20260927.md / integration-105.md。テーマ削除とメモ由来削除の画面実操作は今回未実施。Issue全体のclose判定には残項目の確認が必要。
