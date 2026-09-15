# UI-REFLECTION｜日記・振り返り回答・体験比較とメモ

<!-- task-id: UI-REFLECTION -->

初期担当枠：A。担当者：rozwer。[GitHub #12](https://github.com/rozwer/sodateru-map-production-specs/issues/12)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

対象ページの全要件・受入IDを引き受ける。参照画像との一致を実画面で必ず確認し、独自デザインへ変更しない。全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[REFLECTION](REFLECTION.md)、[THEMES](THEMES.md)、[INFORMATION](INFORMATION.md)、[RECORDS](RECORDS.md)、[SETTINGS](SETTINGS.md)、[CORE](CORE.md)。

参照画像・画面状態・入力保持・遷移をrozwerが担当する。koshiroの共通クライアントを使い、各機能の業務判定やDTO変換を画面側へ重複実装しない。通信待ちのテスト応答は明示し、実接続完了と区別する。未確定fieldを画面独自に追加しない。

### 接続に必要な提供物

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。
- [REFLECTION](REFLECTION.md)：`REFLECTION.record`、`REFLECTION.compare`。
- [THEMES](THEMES.md)：`THEMES.manual`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`。
- [RECORDS](RECORDS.md)：`RECORDS.save`。
- [SETTINGS](SETTINGS.md)：`SETTINGS.preferences`。
- [CORE](CORE.md)：`CORE.runtime`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`src/features/reflection/`、`docs/evidence/UI-REFLECTION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
