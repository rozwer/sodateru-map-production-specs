# UI-REFLECTION｜日記・振り返り回答・体験比較とメモ

<!-- task-id: UI-REFLECTION -->

初期担当枠：A。担当者：rozwer。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

自分の記録から日記や振り返りを始め、回答・比較・メモを保存して読み直せる。

## 実装範囲

- 自分を知る入口、日記の生成提案と本人編集、質問への回答/あとで/スキップを扱う。
- 二体験の比較と根拠、メモの名前・由来・キーワード・提案利用を接続する。

## 通過条件

- 日記生成中の本人追記が保持され、採用後の明示保存で再表示できる。
- 未回答/回答済み/あとでの一覧と回答原文が再起動後も一致する。
- 比較の判断とメモの由来が元記録の訂正/削除後も状態を説明する。

## 参照と契約

[自分を知る](../../01_requirements/03_pages/self-home/README.md)、[日記](../../01_requirements/03_pages/diary/README.md)、[振り返りの質問](../../01_requirements/03_pages/reflection-question/README.md)、[振り返りの記録](../../01_requirements/03_pages/reflection-history/README.md)、[二つの体験を比較](../../01_requirements/03_pages/experience-compare/README.md)、[メモを編集](../../01_requirements/03_pages/memo-edit/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[REFLECTION](REFLECTION.md)、[THEMES](THEMES.md)、[INFORMATION](INFORMATION.md)、[RECORDS](RECORDS.md)、[SETTINGS](SETTINGS.md)、[CORE](CORE.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/reflection/`、`docs/evidence/UI-REFLECTION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
