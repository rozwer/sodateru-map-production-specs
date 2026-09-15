# UI-COMPANION｜相棒の取込・制作・動作確認と選択

<!-- task-id: UI-COMPANION -->

初期担当枠：A。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

手元の相棒を追加するか制作し、動きを確認して地図で使う相棒を選べる。

## 実装範囲

- ZIP取込とエラー、表示サイズ/位置/動き/名前、制作入力と生成先設定を実装する。
- 進捗・下書き再開・指示持出し・候補採用・現在の相棒設定を接続する。

## 通過条件

- 正しいZIPを動作確認して登録・選択し、再読込後の地図にも同じ相棒が出る。
- 50MB制限と壊れた構造を区別し、登録済み相棒を壊さない。
- 生成失敗/未接続でも下書きが残り、生成候補は採用操作まで自動選択しない。

## 参照と契約

[相棒の管理](../../01_requirements/03_pages/companion-settings/README.md)、[相棒をファイルから追加](../../01_requirements/03_pages/companion-import/README.md)、[相棒の制作](../../01_requirements/03_pages/companion-create/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[COMPANION](COMPANION.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/companion/`、`docs/evidence/UI-COMPANION/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
