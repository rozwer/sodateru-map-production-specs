# UI-SUGGESTIONS｜今日の希望から候補選択・行き先へ

<!-- task-id: UI-SUGGESTIONS -->

初期担当枠：A。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

今日の状態と希望を回答し、理由と現在情報を確かめて次の行き先を選べる。

## 実装範囲

- 未回答利用、回答だけ保存、条件変更、候補比較、理由/出典/移動時間の確認を扱う。
- 選択・あとで・見送りと案内への受渡し、提案停止設定を接続する。

## 通過条件

- 同行者・負担・時間・移動条件が構造化して保存され、候補計算に使われる。
- 条件変更と再読込後に古い候補を新しい結果と混ぜない。
- 採用後に本人確認した訪問だけで達成し、訪問取消で状態が戻る。

## 参照と契約

[今日はどう過ごしたい？](../../01_requirements/03_pages/self-checkin/README.md)、[提案候補一覧](../../01_requirements/03_pages/suggestions/README.md)、[提案候補の詳細](../../01_requirements/03_pages/suggestion-detail/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[SUGGESTIONS](SUGGESTIONS.md)、[COMMUNITY](COMMUNITY.md)、[ROUTES](ROUTES.md)、[ACTIVITY](ACTIVITY.md)、[SETTINGS](SETTINGS.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/suggestions/`、`docs/evidence/UI-SUGGESTIONS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
