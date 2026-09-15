# UI-EXPLORE｜街歩き相談・履歴・音声と探索候補

<!-- task-id: UI-EXPLORE -->

初期担当枠：A。担当者：rozwer。[GitHub #10](https://github.com/rozwer/sodateru-map-production-specs/issues/10)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

対象ページの全要件・受入IDを引き受ける。参照画像との一致を実画面で必ず確認し、独自デザインへ変更しない。全表示状態、共通のレイアウト/失敗条件を含む。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[AI](AI.md)、[EXPLORATION](EXPLORATION.md)、[ROUTES](ROUTES.md)、[COMMUNITY](COMMUNITY.md)、[SETTINGS](SETTINGS.md)、[TRANSFER](TRANSFER.md)。

参照画像・画面状態・入力保持・遷移をrozwerが担当する。koshiroの共通クライアントを使い、各機能の業務判定やDTO変換を画面側へ重複実装しない。通信待ちのテスト応答は明示し、実接続完了と区別する。未確定fieldを画面独自に追加しない。

### 接続に必要な提供物

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。
- [AI](AI.md)：`AI.engine`、`AI.refs`、`AI.voice`。
- [EXPLORATION](EXPLORATION.md)：`EXPLORATION.dialogue`、`EXPLORATION.discovery`。
- [ROUTES](ROUTES.md)：`ROUTES.basic`。
- [COMMUNITY](COMMUNITY.md)：`COMMUNITY.knowledge`。
- [SETTINGS](SETTINGS.md)：`SETTINGS.preferences`。
- [TRANSFER](TRANSFER.md)：`TRANSFER.complete`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

### 先に通す画面操作

- 相談→候補選択→経路→履歴復帰：`AI.refs`、`EXPLORATION.dialogue`、`PLACES.detail`、`ROUTES.basic`、`SETTINGS.preferences`を使う。音声/発見/地域しおり/体験移転も同じIssueで完了させる。

## 編集範囲

提案path：`src/features/exploration/`、`src/features/transfer/`、`docs/evidence/UI-EXPLORE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
