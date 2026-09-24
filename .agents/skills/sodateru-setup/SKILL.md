---
name: sodateru-setup
description: 育てる地図のclone・worktree環境を構築、修復する。初回導入、hooks更新、Issue配送役の初期設定時に使う。
---

# 環境構築

コマンドは対象cloneまたはworktreeのルートで実行する。通常の編集時にはこのセットアップを繰り返さない。

## cloneの初回導入

```sh
mise trust
mise install
mise exec -- bun install --frozen-lockfile
mise run hooks:bootstrap
mise run hooks:install
mise run verify
```

主worktreeの `.env` に `.env.example` を参考に `CODEX_OWNER` を設定する。有効値は `rozwer` / `mattsun` / `koshiro` / `kaiya`。既存値を保持し、未設定で担当が分からなければ本人に確認する。

`hooks:bootstrap` はcloneごとに一度、`extensions.worktreeConfig=true` とpre-board準備用の `sodateru.bootstrapMode=true` を設定する。最初の `main` 準備後に `origin/develop` が作成されたら、共有branchは同期専用となり、残る準備は `bootstrap/<説明>` branchからPRで `develop` へ統合する。既に構築済みなら不要。

## linked worktree・hooks更新

`mise run task:worktree` が作るworktreeはmiseの信頼とhooks導入を処理する。未導入またはhooks更新時は対象worktreeで `mise run hooks:install` を実行する。依存未導入なら対象worktreeのルートで `mise exec -- bun install --frozen-lockfile` を最初に実行する。Codexの未導入bootstrap hookはこの完全一致コマンドだけを通し、導入後は通常のmise/Task検査へ戻す。別worktreeのnode_modulesを前提にしない。

Codexのhook信頼は内容ごとに記録される。初回・hook更新後は `/hooks` から内容をレビューして信頼する。UI操作が必要で実行できなければ、その操作だけを利用者に依頼する。

hooks自体を変更・診断するときは [hooks.md](references/hooks.md) を読む。製品依存の用途は [技術スタック](../../../docs/01_requirements/00_stacks/README.md) にある。

## GitHubと配送役

GitHubを使う段階で `git remote get-url origin` と `mise exec -- gh auth status` を確認する。未設定の接続先を推測しない。

配送役を導入・再設定するときだけ [issue-relay.md](references/issue-relay.md) を読む。通常の登録・連絡は [sodateru-issue-contact](../sodateru-issue-contact/SKILL.md) を使う。

本番用Task定義・GitHub Task Issueが確定した後のboard導入は [sodateru-task](../sodateru-task/SKILL.md) を使う。
