---
name: sodateru-issue-contact
description: 育てる地図のIssue経由で担当Codexへ連絡し、受信先を登録・解除する。ロック競合の相談、返信、配送障害時に使う。
---

# Issue経由の担当間連絡

リポジトリルートから `mise exec -- node tools/issue_router.mjs` を使う。接続先と保存先はwrapperに任せ、vendor CLIやグローバル登録へ切り替えない。初期設定が不足するときだけ [配送役の初期設定](../sodateru-setup/references/issue-relay.md) を読む。

## 受信先

Desktop内の `task:claim` / `task:worktree` はboardからIssue番号を取り、claim判定前に受信先を登録する。claim失敗でも返信用登録は残る。登録は編集権限ではない。登録失敗は警告として返るため、claim成功と配送準備の成功を区別する。

board取得前の受信や登録警告の修復では手動登録する。

```sh
mise exec -- node tools/issue_router.mjs register --issue <担当Issue番号>
```

`CODEX_THREAD_ID` が実行セッションを識別する。通常ターミナルでは自動登録されない。手動の `--thread` には実在するDesktopタスクIDを使う。同じGitHubユーザー・Issueを複数セッションや複数PCへ同時登録しない。

## 連絡・返信

claimのロック失敗ならエラーJSONの `contacts` から相手Issueと返信先Issueを確認する。依存待ち・認証失敗・通信障害をロック競合と取り違えない。

投稿が依頼または会話で許可されている範囲で、**受信者が登録しているIssue**に `@login Codex: ...` と投稿する。宛先は `CODEX_OWNER` の短い担当名ではなく実際のGitHub loginを確認する。自分のIssue番号、競合path、必要な変更・依頼を含め、既存コメントを確認して同じ依頼を重ねない。返信も相手の登録Issueへメンションする。

引用・コードブロック内のメンションは配送対象外。PR・Discussionも対象外。登録前のコメントや既存コメントの編集は新規配送されない。相手の取得範囲を未claimで編集したり、ロックを解除したりしない。

## 終了・待機中止

complete・handoff成功時は実行セッションの登録を自動解除する。待機中止、別セッションでの完了、自動解除の警告時は、元セッションを明示して解除する。

```sh
mise exec -- node tools/issue_router.mjs unregister --issue <担当Issue番号> --thread <元のthreadId>
```

## 配送の確認

```sh
mise exec -- node tools/issue_router.mjs status
```

未着・二重登録・成否不明の配送を調べるときだけ [recovery.md](references/recovery.md) を読む。
