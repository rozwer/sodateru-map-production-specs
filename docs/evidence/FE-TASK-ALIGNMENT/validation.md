# FE-TASK-ALIGNMENT (#301) 検証

- Issue #72 の UI/CONNECT 13 組の原要件・受入IDを保持し、接続開始を操作単位の引継ぎ証拠で判定する。統合済み UI 証拠、同一内容の現行 OpenAPI、操作/API 対応、取得範囲を検証し、有効単位の path のみ claim できる。
- 旧 VISUAL-PLUGINS #186、DISASTER-UI #219 は backlog のまま後継へ supersede。GROW-UI #215、DISASTER-UI-SCREEN #223、BUILDING-GROWTH #222 を公開定義へ統合し、元ページと受入を後継へ写像する。
- #300/#297/#298/#299 を個別実装 Task とし、親 #4/#8 は製品受入の完了条件として維持する。
- 健康3面は主要UI後の枠へ移す。原受入は未実施のまま維持し、他機能の必須依存にしない。
- 新規 worktree で依存が欠ける時、Codex hook は厳密な bun install のみ許して復旧し、その後は既存 hook に委譲する。

## 実行結果

- `mise run verify`: 成功。
- `mise run task:alignment:test`: 8 tests 成功。欠落/不正/未統合引継ぎ、範囲外 path、旧 Task 状態の保持を確認。
- `mise run task:graph-sync`: dry-run 成功、65 tasks、board revision 315。
- `git diff --check`: 成功。

`docs/03_issue/verify.mjs` は既存の OpenAPI と index の operation coverage 不一致で失敗する。今回の UI/CONNECT 移行より前にある契約差分であり、この Task では BE 契約や元受入を改変しない。
