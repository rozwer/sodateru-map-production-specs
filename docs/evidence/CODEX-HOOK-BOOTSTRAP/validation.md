# CODEX-HOOK-BOOTSTRAP (#304) 検証

## 対象と再現条件

- 起点: `origin/develop` 952b8c44a3c7696d8f0683903528ec81b8a36b75。
- 新規 Codex managed worktree は `node_modules` がなく、`smol-toml` / `shell-quote` のimport失敗でPreToolUseが止まる。実入力は `event.cwd` を持たず、`tool_input.workdir` または `tool_input.cwd` に絶対worktree pathを渡す場合がある。従来の`isExactBootstrap`は`event.cwd`を必須にしていた。
- 新Issueのinline Task登録は既存`--definition <file>`が事前ファイルを要求する。未claimのCodex managed worktreeでは通常ファイル編集がbranch/claim guardで拒否される。

## 修正と境界

- bootstrap wrapperと、保存済みprojectから旧commandで直接呼ばれるmise/Task hookは、依存未導入でもNode標準モジュールだけで起動する。依存の検出後に通常検査を呼ぶ。bootstrap wrapperは絶対`tool_input.workdir` / `tool_input.cwd`を優先し、相対値なら絶対`event.cwd`を基準にする。解決できない場合は許可しない。委譲先hookへ同じ対象worktreeを渡す。
- 依存未導入時だけ完全一致`mise exec -- bun install --frozen-lockfile`を通す。他のコマンド、編集、別checkoutは拒否する。導入後は通常のmise/Task hookへ委譲する。
- `task:worktree --definition-json '<JSON>'`は事前定義ファイルを作らず、既存`register_inline`のTask/Issue/owner/path検証を経て最初のclaimと同じboard CASで登録する。`--definition <file>`も維持する。任意のpre-claim編集例外は追加しない。

## 確認結果

- 依存のないGit fixtureでexec_command/Bashの`event.cwd`欠落・絶対workdir/cwd・異なるcheckout・通常コマンド・編集を検証。bootstrap hookの6テスト成功。
- `mise run verify` 成功。hook 75テスト、Python bootstrap 6テストを含む。
- 本Taskの新規専用worktree `/Users/kmattsun/.codex/worktrees/codex-hook-bootstrap-304` で、依存未導入状態から初期worktreeの正規`mise run task:exec -- <WT> mise exec -- bun install --frozen-lockfile`により導入成功。追加の利用者Terminal操作は不要だった。
- 導入後、`event.cwd`なし・絶対`tool_input.workdir`のpayloadでmise/Task両hookの通常`task:ready`と完全一致install判定がexit 0。`task:ready`と`task:verify`も成功。取得外の`src/features/map/screens.tsx`編集payloadはTask guardがexit 2で拒否。
- 正式inline claimではIssue #304のTask marker/label、owner、取得15 paths、guard、verifyを確認。#297の製品pathや#189/#284のworktreeは変更しない。

## Codex managed worktreeで残る確認

修正commit `a0085c9` から依存未導入の新managed worktree `bootstrap-304-repro` を作成した。この既存Codexタスクからworkdirだけを新WTへ変えた実行は、呼出元 `5a6c` の旧PreToolUse hookが `Use owner/Issue-number-description` と拒否した。新WT自身のhookを読み込む新Codexタスクでの試験結果ではないため、実 managed WTからのinstall成功とは記録しない。別ツールでその拒否を迂回していない。統合後に新Codexタスクを当該commit以降から起動し、完全一致install・通常コマンド拒否を確認する必要がある。

## #298新managed taskの実機フィードバックと修正

PR #305統合後、#298の新managed task `e4da` は完全一致installも `codex-mise-hook.mjs` の静的 `smol-toml` importで拒否した。保存済みprojectのprimary cloneは旧commit `c0d34be`、その `.codex/hooks.json` は `codex-mise-hook.mjs` を直接起動する。新worktreeのgit commitは最新でも、Codex appの登録hook commandはこの旧内容を引き継ぐ場合がある。primary cloneの未追跡ファイルは保持し、checkoutは変更していない。

追加修正では直接呼出先の静的外部依存importを遅延し、依存未導入時は同じ完全一致bootstrap判定に渡す。依存なしfixtureで旧commandのmise/Task直接呼出しは完全一致installのみexit 0、通常コマンドはexit 2、SessionStartは案内を返す。依存導入後の通常hook検査も維持する。#298新taskでの再試験成功までは#304を完了扱いしない。
