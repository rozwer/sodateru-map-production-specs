# THEMES #37 提供状況

## 契約断片 1.0.0（実APIは未接続）

`docs/01_requirements/04_api/fragments/THEMES.json` にTheme/ThemeCreate/ThemePatchの表示属性とRecordCreate/RecordPatch/RecordViewの省略可能なmemoを補完。

- colorKey: teal / pink / orange / yellow / green / blue / purple。作成省略時teal。
- coverMediaId: 本人のready写真IDまたはnull。既存媒体への参照で、元媒体削除時nullへ更新。
- memo: name、originRefs、keywordsを構造化。body/useForSuggestionsはrecordsの既存field。
- presentation付きメモの本文だけ200文字。通常のメモ・回答原文は既存20000文字契約を保持。
- 新規operationなし。既存5つのthemes operationIdを維持。

## 確認済み

- Node SQLiteで固有migrationを適用し、元記録削除によるテーマ所属・写真参照・版の更新、メモの由来のみ削除、独立本文/キーワード保持を確認（migration.test.mjs 1件成功）。
- AjvでThemeCreate/Patchの7色・名前上限・写真解除、および通常memo本文維持/presentation付き本文上限を確認（contract.test.mjs 2件成功）。

## 未達

RECORDS/INFORMATION/AIの実接続、AI命名採用、UI受入は未完了。SQL/契約確認をTHEMES.manual全体またはIssue完了とは扱わない。

## CORE接続（PR #53統合後）

- `service.ts`：テーマCRUD/所属/表示属性、所有者/版/記録/媒体確認、構造化メモread/write helper。
- `register.ts`：CORE自動収集、固有migration、既存5operation。POSTは共通idempotentMutationで現在資源を再取得。
- service DBテスト2件成功：同名別ID、所属、写真/色、版競合、別人拒否、再起動再取得、由来の版変更/除去と本文保持。
- CORE HTTP/SQLite統合テスト1件成功：作成201/再送200/異入力409、版欠落428/競合412、本人・live/demo分離、DB再起動再取得、削除後再送404/記録保持。
- `service.ts`と`register.ts`のstrict型検査成功。

HTTPテストはCOREのcreateApp/共通検証/本人セッション/DBをそのまま使い、取得済みTHEMES断片をメモリ上で合成。fixture記録はテスト用SQLで投入。共通生成物への反映・実main起動とRECORDS保存経由の連結は後続で確認する。

## 30分デモ範囲への切り分け

利用者の方針変更により、今回を手動テーマ/由来付きメモの保存・再表示に限定し、AI命名採用と残る全体受入は後続Issueへ移す。全要件の完成とは記載しない。

RECORDS #58統合後、registerRecordExtensionの同期write/readへ接続。通常memoの長い回答は保持し、presentation付きメモのbodyだけ200文字を検査する。登録・adapter・連結テストを含む全体typecheckは成功。連結テストの現時点の失敗は共通OpenAPIのmemo未反映（VALIDATION_FAILED/additional properties）で、CORE担当へ依頼済み。契約検証を迂回せず、生成反映後に実保存確認を行う。
