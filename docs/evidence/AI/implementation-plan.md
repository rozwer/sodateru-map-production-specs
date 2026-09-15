# AI #7 実装計画

最新GitHub #7を正本とする。起点26a2532。取得範囲のみ編集。

1. AI.engine v1: registerAiTask、材料/出力schema、SQLite messages/conversationsとapplied refs、start/get/cancel/retry。同期SQL transactionで受付/状態遷移し、attempt+runningで遅着を排除する。
2. 固定Codex SDK 0.153.4 + 一時CLI adapter。認証/モデル/サイズ/期限/Abortを扱い、作業dirをfinally削除。実AIのmapstyle用途で保存/再読込まで確認。
3. CORE.runtimeのdefineFeature/context/DB/CommonErrorへ統合、既存operationIdとDTO変換を保つ。変更範囲の実HTTP受入を確認。
4. INFORMATION.refsへ接続して生成前/保存直前/再試行/取得時を検証。提供元未統合なら未達を明記。
5. voice契約断片と実文字起こし接続。画面録音/送信確認はAへ契約連絡。
6. 証拠にcommit/設定/要求ID/attempt/未達を記録し、司令塔に独立実装役レビュー調整を依頼。提供単位を通常mergeし、全受入達成後のみtask:finish。

必要検証: SQLiteの再読込、同一要求再送・BUSY・取消後遅着・再試行後遅着・再起動INTERRUPTED・形式不正・権限/参照変更。実行器adapterはテスト差替え可能だがmockを実AI証拠に数えない。
