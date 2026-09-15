# 初回起動状況

- 確認日：2026-09-15（Asia/Tokyo）
- develop：`26a25329111af5e72ee42c3120c06993adbeae91`
- `package.json`：製品用`dev` scriptなし
- `server/`、`tools/local/dev.ts`：未統合
- `index.html`、`src/`、`vite.config.ts`：未統合
- ブラウザ確認：起動対象がないため未実施

COREの作業中worktreeには`bun run dev`、API既定`127.0.0.1:3001`、live/demo別SQLiteが存在したが、この記録時点ではdevelopへ未統合のため利用可能とは扱っていない。UI-BASEの作業中worktreeも共通部品のみで、画面入口は未統合だった。

再確認入口は`mise exec -- bun qa/manual/run.mjs --check`。`READY`後だけ起動・probe・4本の手動journeyへ進む。

## 環境入口の確認

- `node --check qa/manual/run.mjs`：成功
- `node --check qa/manual/probe.mjs`：成功
- READMEのローカル参照先：全件存在
- `bun qa/manual/run.mjs --check`：終了2。未統合の`dev` script、CORE API入口、UI入口、依存実体を個別に`WAIT`表示

この時点では実アプリの起動・保存・ブラウザ確認は未実施で、完了証拠ではない。
