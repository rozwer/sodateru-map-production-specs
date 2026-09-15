# 本番boardの初期導入

この手順は本番用Task定義とGitHub Task Issueを整備・導入するときだけ使う。通常の実装開始で新しいboardを作らない。

このcloneのorigin、本番用 `TASK_GRAPH.json`、GitHub Task Issueの対応、担当、取得path、依存関係、統合branchを確定してから `mise run task:init` を実行する。旧リハーサルのTask・Issue・進捗ref・受信先を引き継がない。origin未設定なら別repoへ代替接続しない。

board導入前の `sodateru.bootstrapMode=true` は `main` の初期準備に限る。board導入後はpreparation Taskの状態で例外を制御する。`mise run task:phase` で段階を確認し、通常実装は `origin/develop` 起点の専用linked worktreeを使う。

定義形式や登録処理を変更する場合は `tools/taskctl.py` の `init` と `tools/owner_policy.py` を確認する。設定不足を回避するために旧台帳をコピーしない。
