# 配送の復旧

コマンドはリポジトリルートから `mise exec -- node tools/issue_router.mjs` を使う。

`status` と `doctor` でorigin・専用設定・登録先・配送状態を確認する。origin未設定や設定不一致では配送を停止し、他repoやホーム側の設定で代替しない。状態はGit common directory内の `issue-router/` にある。

同じユーザー・Issueに複数の登録があると宛先は推測されない。実際の担当セッションを確認し、不要な元セッションだけを `unregister --issue <番号> --thread <ID>` で解除する。

通常配送は `tick` で取得し、`pending` → `begin` → Desktop送信 → `sent` の順に進む。配送役が実行する具体的手順は `relay-prompt` で取得する。👀リアクションはDesktopの受付済みを意味し、相手の作業完了を意味しない。

途中停止の `dispatching`、成否不明の `uncertain` は自動再送しない。宛先タスクの履歴から `[codex-issue-router:コメントID]` を探す。

- 届いている場合: `sent --key <KEY> --receipt '履歴で受信を確認'` で記録する。
- 未配送を確認できた場合: `retry --key <KEY>` で再試行可能にする。
- 受信の有無を判定できない場合: 状態を保持し、確認に必要な情報を求める。

実装を調べる場合の入口は `tools/issue_router.mjs` と `tools/vendor/codex-issue-router/src/router.mjs`。過去の実測や検証範囲が必要なときだけ [2026-09-15の記録](../../../../docs/evidence/2026-09-15-issue-router.md) を読む。
