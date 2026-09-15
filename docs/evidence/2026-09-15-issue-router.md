# Issue Router 検証記録（2026-09-15）

旧運用文書から移した当時の記録。以下の成功件数・停止状態・未検証範囲は記録時点のもので、現在状態はwrapperのstatusと実行結果で確認する。


```sh
mise exec -- node tools/issue_router.mjs status
mise exec -- node --test tools/vendor/codex-issue-router/test/*.test.mjs
```

[リハーサル #604](https://github.com/rozwer/sodateru-map-rehearsal/issues/604) で、1台の既存Desktop実行中セッションへの受信、Issueへの返信、二重配送抑止を確認。

2026-09-15の対象限定後: 定期タスクは停止中。このリポジトリのoriginが未設定のため、監視対象を他repoで代替しない。リハーサル#604は過去の配送方式の検証記録のみで、現在の運用対象ではない。このリポジトリのGitHub接続先・初期設定が整ってから再開する。初回のスケジューラ発火と他3台の受信は未検証。

リポジトリ限定の追加4テストが成功。別repo指定・root上書き・混在設定を拒否し、グローバル保存先を使わず専用保存先へ登録することを確認。

`mise run verify` はrouterの14件、claim連携の5件、既存hooksの72件が成功。claim連携は、実CLIによるローカル登録後にロックでclaimが失敗しても登録が残り、board変更・pushが行われず、相手Issueが返ることをテスト用boardで検証した。本番のGitHubリポジトリとboardはまだ作成されていないため、本番への実claimテストではない。

詳細・配送不明時の復旧は [同梱README](../../tools/vendor/codex-issue-router/README.md) と [検証記録](../../tools/vendor/codex-issue-router/docs/verification.md) を参照する。

## 登録性能と由来

独立リポジトリ [rozwer/codex-issue-router](https://github.com/rozwer/codex-issue-router) のcommit `3c8832e` を `tools/vendor/codex-issue-router/` に取り込んでいる。Node.jsと既存のgh認証を使い、DB・Slack・共有サーバーは追加しない。

担当登録はローカル処理のみで、GitHub・AI・DB呼出しや配送役のロック待ちはない。同じ登録の再実行では書き込まない。汎用CLI単体の実測はNode起動込み中央値約41ms、1,000件の別Issue登録があっても約41ms。このリポジトリ用wrapperではローカルGit設定確認2回が加わる。詳細は同梱の検証記録を参照する。Codexがコマンドを起動するtool callと定期配送の利用量は別であり、全体がゼロ負荷という意味ではない。
