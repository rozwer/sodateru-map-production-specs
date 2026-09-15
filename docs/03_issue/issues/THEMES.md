# THEMES｜テーマと由来付きメモの保存・編集

<!-- task-id: THEMES -->

初期担当枠：D。担当者：mattsun。[GitHub #37](https://github.com/rozwer/sodateru-map-production-specs/issues/37)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **THEMES.manual**：テーマ所属・表示属性・由来付きメモの保存。手動の所属/表示/メモが再取得でき、元記録の由来を保つ。
- **THEMES.ai**：AI命名・提案の採用。本人確認後だけ採用し、根拠が変われば再確認する。

### 接続に必要な提供物

- [AI](AI.md)：`AI.engine`、`AI.refs`。
- [RECORDS](RECORDS.md)：`RECORDS.save`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/themes/`、`server/db/migrations/themes/`、`docs/01_requirements/04_api/fragments/THEMES.json`、`docs/evidence/THEMES/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
