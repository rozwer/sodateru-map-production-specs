# 育てる地図

- コンペ期限内に要求どおり動くことが最優先。完成を遅らせる過剰設計・過度なセキュリティ対策は避ける。
- Issueの仕様・受入条件を満たし、機能・主張を縮退させない。モックは画面・出力で明示し、完成扱いしない。
- UIは指定画像を再現する。入出力契約は全体に波及するため厳守し、変更は関係担当とIssueコメントで調整する。
- テストは必要な動作確認に絞り、成功後は変更・不具合・具体的懸念がなければ追加・再実行しない。
- 1台のオーケストレーターは調整・現状把握のみ（実装・レビュー禁止）。複数台の独立セッションで実装し、担当間はIssueコメントで連絡する。
- サブエージェントはAstraは禁止、Solは使用可能。

## 作業手順

該当するSkillを使う：[環境構築・修復](.agents/skills/sodateru-setup/SKILL.md)／[Task着手・完了・引継ぎ](.agents/skills/sodateru-task/SKILL.md)／[Issue連絡・配送](.agents/skills/sodateru-issue-contact/SKILL.md)。

- コマンドは `mise exec --` / `mise run`。board導入前の準備は `origin/develop` 起点の `bootstrap/<説明>` branchからPRで `develop` へ統合し、実装は `origin/develop` 起点の専用worktree・取得範囲内で行う。
- `main` / `develop` への直接push、他担当のロック解除、既存変更の破棄は禁止。
- 仕様・証拠は `docs/`、手順は `.agents/skills/`。ルートのMarkdownは本書と `README.md` のみ。
