---
name: sodateru-task
description: 育てる地図のTaskを取得し、専用worktreeで着手・提出・完了・引継ぎする。担当や取得pathを変更するときにも使う。
---

# Taskの着手と終了

対象Issueの仕様・受入条件と現在のboardを使う。Task IDとGitHub Issue番号を区別する。コマンドは対象cloneまたは担当worktreeのルートで実行する。

## 着手

`mise run task:ready` で現在の担当・依存・取得可能範囲を確認する。実装は次の入口から開始する。

```sh
mise run task:worktree -- <Task-IDまたはIssue番号> <新規worktreeパス> --slug <説明>
```

新Issueがまだboardにないときは、Issueの担当・Task ID・`task` labelを確定したうえで、`task:worktree` に `--definition-json '<JSON>'` を渡せる。JSONには `id`、`issue_number`、`title`、`kind`、`priority`、`lane`、`owner`、`write_paths`、`hard_dependencies`、`connect_after` を明記する。これは既存の`--definition <file>`と同じ定義検査を通し、最初のclaimと同じCASで登録する。事前に定義ファイルを編集できないmanaged worktreeでも利用者のTerminal操作を要しない。事前の任意ファイル編集は許可しない。

主worktreeの `.env` の `CODEX_OWNER` に基づき `担当者/Issue番号-説明` のbranchを作り、claim・最新の統合branchを起点とするworktree作成・hooks導入・検証を行う。結果の `claimReceipt` と取得pathを使う。既存worktreeを再開する場合は `mise run task:verify`、古いローカルsnapshotの更新は `mise run task:refresh` を使う。

Desktopからのclaimは成功判定前に受信先を登録する。競合時の相談や登録警告には [sodateru-issue-contact](../sodateru-issue-contact/SKILL.md) を使う。失敗時に取得できたとみなして編集しない。

環境不足は [sodateru-setup](../sodateru-setup/SKILL.md) を参照する。boardがない初期整備時だけ [board-bootstrap.md](references/board-bootstrap.md) を読む。

## 実装・提出・完了

依頼された範囲の実装、必要な起動・実操作確認、見つかった不具合の修正まで進める。検証は変更と受入条件に合わせ、必要なチェックの成功後は新たな懸念がなければ繰り返さない。機能固有の完了条件はIssueの仕様に置く。

提出・統合後の処理は [completion.md](references/completion.md) を読む。PR作成・マージ・公開の権限は実際の依頼範囲に従い、このSkill自体で追加しない。

取得path追加、担当移管、待機中止でclaimを返す場合は [handoff.md](references/handoff.md) を読む。
