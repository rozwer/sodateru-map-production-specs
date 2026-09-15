# AI｜共通AI実行・会話保存・取消と再試行

<!-- task-id: AI -->

## 今回の完了対象（2026-09-15 利用者承認の分割）
共通AI.engineと会話HTTPの先行提供を本Issueの完了範囲とする。元の全要件が完了したとは扱わない。未確認の実用途接続・共通根拠照合・音声実機確認は後続 #103 に移し、依存・受入条件を保持した。

## 提供済み
PR #96を通常マージ。統合commit 0216502b0fcba53a379fff9b7fdf8cc8da24b191。
- 用途登録、保存した入力/出力/model/promptVersion/参照版、会話とRun取得。
- 取消・明示再試行・再起動中断処理、旧attemptの遅着結果の上書き防止。
- CORE transactionと永続Idempotency receiptへの実接続、会話10 API。
- 固定Codex SDK 0.153.4/一時CLI、gpt-5.6-lunaの日本語構造化実応答を両経路で取得。
- SETTINGS/INFORMATION共通helperの接続境界、既存音声確認テキストのAPI境界。

## 証拠と限界
- docs/evidence/AI/live-sdk.json、live-ephemeral.json：実Luna応答。
- server/ai/core-integration.test.ts：controlled providerによる実CORE HTTP/SQLite保存・再起動再取得・永続再送。
- engine.test.ts：取消/再試行/遅着/参照変化/入力保持/Unicode境界。

本番用途による実Luna→会話保存→再起動の通し証拠、実INFORMATIONの権限変化、実マイク確認は現在 #103 で追跡する。未接続をモック成功で代替しない。

## 後続と元要件
後続 #103。元本文は docs/evidence/AI/original-issue-7.md に保存する。
仕様：[AI共通仕様](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/01_requirements/02_common/01_ai/README.md)、[全受入](https://github.com/rozwer/sodateru-map-production-specs/blob/develop/docs/01_requirements/02_common/01_ai/05_acceptance.md)。

## 編集範囲・Task運用
本Issueのclaimはserver/ai/、server/features/conversations/、server/db/migrations/ai/、docs/01_requirements/04_api/fragments/AI.json、docs/evidence/AI/。今回の提供と証拠整理後、正規task:finishで解放する。後続 #103 への暗黙移管はしない。
