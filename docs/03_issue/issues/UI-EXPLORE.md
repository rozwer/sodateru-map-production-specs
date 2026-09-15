# UI-EXPLORE｜街歩き相談・履歴・音声と探索候補

<!-- task-id: UI-EXPLORE -->

初期担当枠：A。担当者：rozwer。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

希望を相談して候補を選び、履歴から再開し、道順または探索コンパスへ進める。

## 実装範囲

- 文章/音声確認・AI送信内容の確認・処理中/取消/再試行・会話履歴を共通チャットへ接続する。
- もや候補・しおり・発見カードと反応・方向/精度・経路への受渡しを実装する。
- 共通要件にある別都市への体験移転の入口・二案比較・採用も担当する。画面契約の追加をTRANSFERと揃える。

## 通過条件

- 「近くのカフェ」→「2番目まで歩く」で起点・候補ID・地図・会話が一致する。
- 録音停止後に編集した文字だけが送られ、同意取消では送信しない。
- 履歴再開、候補期限切れ、取消後の遅着、方位許可拒否を区別して操作できる。

## 参照と契約

[Codexと探索](../../01_requirements/03_pages/ai-explore/README.md)、[音声で相談](../../01_requirements/03_pages/voice-consultation/README.md)、[AIへ送る内容の確認](../../01_requirements/03_pages/ai-consent/README.md)、[相談履歴](../../01_requirements/03_pages/conversation-history/README.md)、[もやの探索候補](../../01_requirements/03_pages/mist-detail/README.md)、[探索コンパス](../../01_requirements/03_pages/quest-compass/README.md)。

[common.json](../../01_requirements/03_pages/common.json)、[README.md](../../01_requirements/00_stacks/README.md)。

対象ページの全要件・受入IDを引き受ける。指定画像、全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：[UI-BASE](UI-BASE.md)。
- 実接続・完了前：[AI](AI.md)、[EXPLORATION](EXPLORATION.md)、[ROUTES](ROUTES.md)、[COMMUNITY](COMMUNITY.md)、[SETTINGS](SETTINGS.md)、[TRANSFER](TRANSFER.md)。

参照画像の構成・状態・入力保持・遷移・共通部品への接続を進める。通信待ちは契約どおりの明示したテスト応答で確認し、実接続の完了条件を残す。未確定fieldを画面独自に追加しない。

## 編集範囲

提案path：`src/features/exploration/`、`src/features/transfer/`、`docs/evidence/UI-EXPLORE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
