# THEMES｜テーマと由来付きメモの保存・編集

<!-- task-id: THEMES -->

初期担当枠：D。担当者：mattsun。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

体験をテーマへまとめ、色/写真/所属とメモの由来を保存して地図や提案へ渡せる。

## 実装範囲

- themes CRUD、色/写真/所属、メモの名前/由来/キーワード/提案利用fieldを追加する。
- AI命名の材料/提案/本人採用と、友人に公開可能なテーマ読取を情報基盤へ提供する。

## 通過条件

- 名前が同じ別テーマをIDで区別し、所属変更と削除を再取得へ反映する。
- 命名提案が本人編集を上書きせず、採用後にだけ保存される。
- メモの元記録・キーワード・提案利用可否がJSON文字列への詰込なしで再取得できる。

## 参照と契約

[自分のテーマ](../../01_requirements/03_pages/themes/README.md)、[テーマを編集](../../01_requirements/03_pages/theme-edit/README.md)、[メモを編集](../../01_requirements/03_pages/memo-edit/README.md)、[わたしの地図](../../01_requirements/03_pages/personal-map/README.md)。

[13_themes.json](../../01_requirements/01_DB/13_themes.json)、[02_records.json](../../01_requirements/01_DB/02_records.json)。

実装する既存operationId：`getThemes`、`postThemes`、`getThemesThemeId`、`patchThemesThemeId`、`deleteThemesThemeId`。

契約補完の担当：`presentation`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[AI](AI.md)、[RECORDS](RECORDS.md)、[INFORMATION](INFORMATION.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/themes/`、`server/db/migrations/themes/`、`docs/evidence/THEMES/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
