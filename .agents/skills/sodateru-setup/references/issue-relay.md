# Issue配送役の初期設定

このcloneを使う各PCに配送役を一つ設定する。対象はこのcloneのGitHub originのみ。origin未設定・専用設定不一致なら該当配送を停止し、別repoへ接続しない。

リポジトリルートで実行する。

```sh
mise exec -- gh auth status
mise exec -- node tools/issue_router.mjs init --reaction
mise exec -- node tools/issue_router.mjs doctor
mise exec -- node tools/issue_router.mjs relay-prompt
```

初期化で取得したcollaboratorを送信者として受理する。取得に失敗した場合、許可対象を確認せず送信者を広げない。

`relay-prompt` の出力を配送役の手順にする。Desktopのautomationツールで既存の対象clone用定期タスクを調べ、あれば更新し、なければ1分ごとの配送を設定する。配送役用の新規Desktopタスク作成は明示的に依頼された場合だけ行う。設定や定期配送の導入依頼はその範囲で実行し、この文書を読んだだけでは定期タスクを作らない。

配送はDesktop標準の `send_message_to_thread` を使う。変化のない回は通知を出さず、配送障害や必要な利用者操作を知らせる。空の確認にもCodex利用量が発生する。スリープ・アプリ停止・利用量制限中の即時配送は保証されない。

状態はGit common directory内の `issue-router/` に保存し、同じcloneのlinked worktree間で共有する。ホーム側のグローバル登録、`ISSUE_ROUTER_HOME`、`--root` 上書きは使わない。

設定後は `mise exec -- node tools/issue_router.mjs status` で対象と登録を確認する。初期化成功、スケジューラの実発火、実受信はそれぞれ別に確認する。試験コメントの投稿は、通信試験として許可された範囲で行う。
