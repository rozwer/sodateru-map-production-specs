# AI｜共通AI実行・会話保存・取消と再試行

<!-- task-id: AI -->

初期担当枠：D。担当者：mattsun。[GitHub #7](https://github.com/rozwer/sodateru-map-production-specs/issues/7)。[一覧](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/README.md) · [共通完了条件](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/execution.md#完了の扱い)。

## 完成結果

用途別のAI処理を同じ受付から実行し、会話・状態・結果を保存して取消/再試行できる。

## 実装範囲

- 固定SDKと一時CLI、材料/参照版・出力Schema/意味検証・同時実行制限・片付けを実装する。
- conversations/messagesのHTTP、request/result/applied_refs、再起動復帰、用途登録、音声文字起こしの接続境界を整える。

## 通過条件

- 実AIを一用途で実行し、発言・構造化結果・モデル・参照版を再取得する。
- 取消/再試行/再起動後の遅着で現在のattemptを上書きしない。
- 設定なし/形式不正/参照更新で所定エラーを返し、入力を保って再試行できる。

## 参照と契約

[相談履歴](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/01_requirements/03_pages/conversation-history/README.md)。

[README.md](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/01_requirements/02_common/01_ai/README.md)、[05_acceptance.md](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/01_requirements/02_common/01_ai/05_acceptance.md)。

実装する既存operationId：`getConversations`、`postConversations`、`getConversationsConversationId`、`patchConversationsConversationId`、`deleteConversationsConversationId`、`getConversationsConversationIdMessages`、`postConversationsConversationIdMessages`、`getMessagesMessageId`、`postMessagesMessageIdCancel`、`postMessagesMessageIdRetry`。

契約補完の担当：`voice`。[補完一覧](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/CORE.md)、[INFORMATION](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/INFORMATION.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

先行提供：用途登録・実行/取消/結果取得を先に渡す。SourceRefの解決・現在権限・版照合はkoshiroのINFORMATIONへ一元化し、mattsunは共通処理を呼ぶ境界とAI実行/結果を持つ。用途別プロンプトと結果採用は各機能担当が持つ。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **AI.engine**：用途登録・実行・保存・取消・結果取得。実AIを一用途で実行して結果を保存/再取得し、取消と遅着結果を区別する。材料読取は登録した提供関数を呼ぶ。
- **AI.refs**：共通根拠照合を使う生成・再試行。koshiroの根拠処理で生成前/保存直前/再試行時の権限と参照版を照合し、コピー実装しない。
- **AI.voice**：音声文字起こし・送信確認への接続。音声の実取得/文字起こしと送信対象の確認を契約どおりに受け渡す。

### 接続に必要な提供物

- [CORE](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/CORE.md)：`CORE.runtime`。
- [INFORMATION](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/issues/INFORMATION.md)：`INFORMATION.refs`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/delivery.md)。

## 編集範囲

提案path：`server/ai/`、`server/features/conversations/`、`server/db/migrations/ai/`、`docs/01_requirements/04_api/fragments/AI.json`、`docs/evidence/AI/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/03_issue/execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
