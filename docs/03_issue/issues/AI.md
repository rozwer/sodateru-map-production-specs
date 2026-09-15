# AI｜共通AI実行・会話保存・取消と再試行

<!-- task-id: AI -->

初期担当枠：D。担当者：mattsun。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

[相談履歴](../../01_requirements/03_pages/conversation-history/README.md)。

[README.md](../../01_requirements/02_common/01_ai/README.md)、[05_acceptance.md](../../01_requirements/02_common/01_ai/05_acceptance.md)。

実装する既存operationId：`getConversations`、`postConversations`、`getConversationsConversationId`、`patchConversationsConversationId`、`deleteConversationsConversationId`、`getConversationsConversationIdMessages`、`postConversationsConversationIdMessages`、`getMessagesMessageId`、`postMessagesMessageIdCancel`、`postMessagesMessageIdRetry`。

契約補完の担当：`voice`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

先行提供：用途登録・SourceRef解決・実行/取消/結果取得の署名を共有する。用途別プロンプトと保存適用は各機能が持つ。

## 編集範囲

提案path：`server/ai/`、`server/features/conversations/`、`server/db/migrations/ai/`、`docs/evidence/AI/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
