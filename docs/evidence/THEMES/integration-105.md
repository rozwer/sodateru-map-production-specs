# THEMES-INTEGRATION #105 実接続確認

2026-09-15、`origin/develop` の正式生成を含む `448a857` で確認。元 #37 の保存コード・PR #104/df5e507をそのまま使用し、共有生成物やUIは編集していない。

## 起動

worktree: `/Users/kmattsun/.codex/worktrees/2062/themes-integration-105`

`mise exec -- bun install --frozen-lockfile` 後、`mise exec -- bun run dev`。UI `http://127.0.0.1:5173/`、API `http://127.0.0.1:3001`。live/demoは別SQLite、ブラウザーはdemo/自分。

主要確認後、司令塔の指示で最新develop `537a15cc275b41ec98c1d25b9558ef9845fdcb07` を通常fetch/mergeし、同じ1組/URL/DBを保持して再起動した。親PID14007、API14008、実行session79627。主cloneの既存 `.env` をNode `--env-file` でプロセスに読み、`MAPBOX_ACCESS_TOKEN ||= VITE_MAPBOX_ACCESS_TOKEN`、`CODEX_AI_MODEL=gpt-5.6-luna` を子main/Viteへ継承。秘密値はファイルに複製していない。地図接続設定なし表示が解消しMapbox表示開始、保存済みメモ保持を確認。司令塔とINSIGHTS/D2へ共有し、継続稼働中。

## 成功した操作

- 正式共有OpenAPIを使う `node --experimental-transform-types --test server/features/themes/memo-integration.test.ts`: 1件成功。実RECORDS create/patch/delete、SQLite transaction、構造化メモ/通常長文、由来元削除と独立本文維持。旧977d5bfでのadditional properties(memo)失敗は正式生成の取り込みで解消。
- ブラウザー `#/themes` → テーマ作成 → 名前「デモ・まち歩き」、説明「手動保存と再表示の確認」、青色 → 保存 → 一覧 → ページreload → 編集で名前/説明/青色保持。ID `7452a5ae-dc69-4899-9323-74d8c650b003`。
- ブラウザー `#/memo-edit` → 名前「デモの気づき」、本文「静かな場所を歩くと新しい発見がある。」、キーワード「静かな場所」、候補探しON → 保存成功と保存先再読込表示。
- メモID `ec571577-9374-465a-ba9b-64331d5fdd5a` を指定して `#/memo-edit?recordId=...` を開き直し、名前/本文/キーワード/ON保持を確認。
- `node docs/evidence/THEMES/demo-audit.mjs`: ブラウザーとは別の本人demo sessionを発行し、実HTTPでテーマ・メモ詳細の永続化を確認。結果は `demo-audit.json`。SQL fixture投入やメモリ合成契約ではない。

## 具体的な残件

- テーマ管理は登録routeへ直接到達。共通メニュー→自分を知る→わたしの地図から管理入口を発見できなかった。UI #13/#98へ通常入口の確認/最小接続を依頼。
- 新規メモ保存後のURLはrecordIdなしのまま。保存は成功するがreload後の同ID再開のため、UI #12へcanonical routeの接続を依頼。
- GET /records一覧ではmemo補助項目が欠けるが、詳細GETは正常。`demo-audit.json` のlistMemoPresent=falseを確認。INFORMATION #6へreadMemoPresentationの本人一覧DTO接続を依頼。
- 相棒は表示用モックと明示。テーマ/メモの主要保存はそれに依存せず成功。地図の接続設定は上記の既存環境変数継承で解消したが、地図操作全体の受入は行っていない。
- 今回の画面確認はテーマ所属/写真upload、メモの由来選択/削除UI、AI命名/採用、友人公開を含まない。これらは #105 に残る。
