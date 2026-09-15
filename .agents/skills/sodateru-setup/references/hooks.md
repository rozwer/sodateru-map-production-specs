# hooksの設定と診断

版は `mise.toml`、Bunの版は `package.json` の `packageManager` にある。文書にバージョン一覧を複製しない。

`hooks:install` は実行中worktreeの `core.hooksPath` を `.githooks/macos` または `.githooks/windows` に設定する。別worktreeのhook pathを上書きしない。

Git hooksは担当・claim・linked worktree・取得path・ルートMarkdown配置、共有branchの保護、push対象のcommitとboard更新を検査する。拒否時はエラーに示された実際の担当・branch・path・boardを確認し、hookを無効化して進めない。

Codex hooksの編集元は `.codex/hooks.macos.json` / `.codex/hooks.windows.json`。`mise run hooks:install` が `.codex/hooks.json` を生成するので、生成物は直接編集しない。

- `SessionStart`: miseのpackage manager・runtime・固定ツールを検出する。
- `PreToolUse`（shell）: 管理外runtimeやnpm/pnpm/yarnの直接実行を拒否する。
- `PreToolUse`（shell/edit）: Task担当、branch、linked worktree、取得pathを検査する。
- `PreToolUse`（subagent）: 起動時のmodel明示を検査する。これは並列作業を常時行う指示ではない。

hooks変更時の検証入口は `mise run verify`。製品の機能受入テストとは別である。

boardがない間のbootstrapは `main` の初期準備commitとfast-forward pushに限る。他branchの作成・push・削除に流用しない。board導入後はpreparation Taskの状態が `main` 例外を制御し、bootstrap fallbackは使われない。
