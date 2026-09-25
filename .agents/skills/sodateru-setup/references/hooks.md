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

boardがない間のbootstrapは二段階で扱う。`origin/develop` がない最初だけ `main` の初期準備commitとfast-forward pushを許可する。`origin/develop` 作成後は `main` / `develop` をoriginへの同期専用とし、`origin/develop` から `bootstrap/<説明>` を作成して同名branchへpushし、PRで `develop` に統合する。直接 `develop` へpushしない。board導入後はpreparation Taskの状態が `main` 例外を制御し、bootstrap fallbackは使われない。

既存の未コミット準備を `main` から移す場合もstashやhook無効化は不要である。`git fetch origin develop`、ローカルbranchがなければ `git branch develop origin/develop`、`git switch -m develop`、`git switch -c bootstrap/<説明>` の順で切り替える。`-m` は現在の差分を新しい基準へ三者マージして保持する。衝突する場合はその場で止めて確認し、解消を推測したり差分を破棄したりしない。

## 依存未導入の新worktree

Codexのmise/Task hookはnode_modulesに依存するため、新規linked worktreeでは軽量bootstrap入口が先に読み込まれる。未導入時に許されるシェル操作は対象worktreeルートでの完全一致 `mise exec -- bun install --frozen-lockfile` のみ。連結コマンド、引数追加、他のcheckout、編集は通さない。導入後は従来の両hookが全コマンドを検査する。SessionStartは導入コマンドを案内する。変更後は `mise run hooks:install` と `mise run verify` で確認する。
