# THEMES-INTEGRATION #105 AI命名接続

## 実装

共有デモcheckoutから正規release/reclaimで分離した `/Users/kmattsun/.codex/worktrees/2062/themes-ai-105` だけで実装。共有5173/3001のソース・DB・プロセスは変更していない。固定stash `37dca6e5cc3f169ce367e11a96ce0d4994935c05` の5草稿を元記録SHA256と照合して復元し、stashは保持。

- 共通AIのtheme taskを登録し、本人の記録本文/用途/感想から名前20文字・説明100文字の候補を作る。候補生成ではテーマを保存しない。未知の根拠IDと不正な名前を拒否。
- THEMES契約断片1.1.0に `postThemesThemeIdAdoptName` を追加。既存theme IDに本人の明示操作で名前/説明だけを採用。
- 採用時にrun attempt/version、theme If-Match、現在の所属とsourceRefsの版を検証。本人編集値を優先する。
- テーマ更新・appliedRefs追記・共通idempotency receiptを同一SQLite transactionで処理。成功再送は現在のテーマを返し、元記録が後から変わっても採用を再実行しない。

## 確認

- `node --experimental-transform-types --test server/features/themes/ai.test.ts`: 1件成功。実CORE/Hono/AI engine/SQLiteを使用。候補だけでは未保存、theme/run版とattempt拒否、本人編集値採用、由来変更後の成功再送、異入力の同key拒否、所属/根拠変更拒否、過長候補/未知引用拒否、DB再開後の採用内容/履歴保持。
- この試験のAI providerは明示した決定的なテスト用実装であり、実Luna成功の証拠ではない。未生成のadopt-name操作とSchemaは試験内で断片から合成。
- `node --test server/features/themes/contract.test.mjs`: 3件成功（追加採用契約を含む）。成功済みmanual操作試験は反復していない。
- 全体typecheckではTHEMESのsourceRef型1件を修正。全体には範囲外のCORE FeatureRequestCreate/displayName、探索requestId、RECORDS試験unknown、日記optional version、tools/local/devの型不整合が残り、全体成功とは扱わない。
- AI task/採用route/AI試験と実Luna検証スクリプトは、strict/noUncheckedIndexedAccessを含む対象TypeScript検査に成功。

## 残る接続

正式共有OpenAPI/clientへの1.1.0反映はCORE担当。正式main・別port/別DB・既存認証による実gpt-5.6-luna提案→本人採用→再起動取得を次に確認する。UI担当Aにはbindings.mdの候補表示/本人編集/採用APIと通常入口を接続してもらう。共有デモへの更新は管理側で安全な区切りに行う。
