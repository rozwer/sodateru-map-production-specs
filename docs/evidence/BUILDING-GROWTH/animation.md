# 軌跡再生と周辺建物の着色

- 個人地図の保存記録を `effectiveStartedAt` 順に並べ、場所座標を軌跡として地図へ渡す。
- 「軌跡を再生」でカメラが座標を順に追い、通過地点周辺の建物を多色で段階表示する。
- confirmed建物は成長色・根拠バッジを維持し、未訪問の周辺建物は永続化しないambient色として描画する。
- 軌跡なし、再生中、再実行、reduced-motionの状態を用意した。

## 検証

- `mise exec -- bun test src/map/growth-rules.test.ts`: 3 pass
- `mise exec -- bunx vite build`: 成功（既存のchunk size warningのみ）
- 全体 `tsc --noEmit` は既存のserver/exploration/friends/reflection/toolsエラーを残すが、今回変更した `src/map` / `src/features/map` の新規エラーはなし。
