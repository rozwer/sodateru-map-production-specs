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

CORE.runtime/integrationは未統合のため共通起動・HTTP・再送・再起動GETは未確認。RECORDS/INFORMATION/AIの実接続、AI命名採用、UI受入、独立レビュー・PR統合は未完了。SQL/契約確認をTHEMES.manual全体またはIssue完了とは扱わない。
