# DEMO-MEDIA 受入確認

確認日: 2026-09-15

Issue: #270

対象: ローカルデモ `http://127.0.0.1:5173`、API `http://127.0.0.1:3002`、`qa-visual-40/.local/demo.sqlite`

## 実装

- `tools/local/demo-media/assets/` に built-in `image_gen` で生成した9枚を格納した。
- `tools/local/demo-media/seed.mjs` はローカルAPIのdemo modeを確認してから、生成画像を実API経由でアップロードする。
- 既知の合成デモ記録だけを対象にし、未知の記録や利用者が追加した写真は変更しない。
- 画像生成であることを各対象記録の本文に明示する。
- 既存の `friends-*-photo` 12件だけを生成画像へ置換し、旧画像以外の既存写真は保持する。
- 保護された媒体URLを直接`img`へ渡していたナビゲーションカードを、媒体APIでBlobとして取得して表示するよう修正した。画面を離れるとobject URLを破棄する。

## seed結果

実行:

```sh
mise exec -- node --experimental-transform-types tools/local/demo-media/seed.mjs \
  --demo-db /Users/roz/.codex/worktrees/qa-visual-40/.local/demo.sqlite \
  --origin http://127.0.0.1:3002
```

初回結果:

- 生成画像を22記録へ追加した。
- 古い友達デモ画像12件を置換した。
- 神社とパン屋の共有記録2件を追加した。
- 22記録へ画像生成の開示文を追記した。
- `untouchedMissing=[]`、`visibleMissingAfter=[]`。

同じコマンドを再実行した結果:

- `added=[]`、`replacedLegacy=[]`、`disclosed=[]`。
- 既存の共有14記録を検出し、`visibleMissingAfter=[]`を維持した。

## 安全条件

- DBファイル名が `demo.sqlite` でなければ終了する。
- API originが `127.0.0.1` または `localhost` でなければ終了する。
- 各API応答の `X-Data-Mode` が `demo` でなければ終了する。
- 一時セッションは処理後に削除する。
- アップロード前に全素材のJPEGシグネチャを確認する。

## 実ブラウザ確認

表示幅390 x 844で確認した。

| 画面 | 結果 |
| --- | --- |
| `#/knowledge-list` | 全範囲をスクロール後、画像39/39を読み込み。生成画像の開示文22件、欠落文言なし。 |
| `#/knowledge-detail?recordId=yokohama-20260915-record-plans` | 海辺公園画像を1280 x 853で読み込み。開示文あり、欠落文言なし。 |
| `#/local-knowledge?placeId=yokohama-20260915-yamashita` | 海辺公園画像を1280 x 853で読み込み。欠落文言なし。 |
| `#/community-home` | 5173の現デモで生成画像2枚を各1280 x 853で読み込み。欠落文言なし。 |
| `#/self-home` | 修正版で生成画像2枚を1280 x 853、1280 x 720で読み込み。欠落文言なし。 |
| `#/friends-map` | 画像25/25を読み込み。共有記録写真3/3と開示文3件を確認し、欠落文言なし。 |
| `#/daily-track` | 画像18/18を読み込み。記録を展開した写真1/1と画像生成の開示文を確認し、欠落文言なし。 |

検出対象の欠落文言は `写真・動画はありません`、`写真はありません`、`写真なし`、`写真がありません`、`画像なし`、`動画なし`、`メディアなし`。確認画面では0件、壊れた画像は0件、console error/warnは0件だった。DBの公開・選択共有・本人の可視記録に写真なしは0件である。下方のリスト画像はブラウザの遅延読込により、表示範囲へ入った時点で取得されるため、各範囲へスクロールして確認した。

媒体以外では、おすすめルート、振り返り質問、振り返り履歴にデータなしの説明が残る。写真・動画の欠落とは別の空状態である。

## 検証コマンド

- `mise exec -- node --check tools/local/demo-media/seed.mjs`: 成功。
- `CODEX_OWNER=rozwer mise run task:verify`: claimと取得pathを確認して成功。
- `mise exec -- bun run typecheck`: 変更外の既存エラーで失敗。`server/core/core.test.ts`、`src/features/exploration/flow.ts`、`src/features/friends/screens.tsx`、`src/features/reflection/DiaryScreen.tsx`、`tools/local/dev.ts` の既存8件。今回変更した2ファイルにはエラーなし。

残る生成画像の欠落は0件。プロンプトと素材ハッシュは [prompts.md](./prompts.md) に記録した。
