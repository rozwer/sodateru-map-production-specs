# 初回実装単位

- 起点: origin/develop 5760202281c6a73b7f51c58ab90bde28ec826664。worktree /Users/roz/.codex/worktrees/building-growth、Task BUILDING-GROWTH / Issue #222。
- 固定用途辞書/混合色/訪問ID重複排除、明示キー優先・複数含有未対応、実建物高さ維持、薄い下地、style.load復元、建物→施設/根拠記録、既存PlacePatchで対応保存、BridgeMap画像/マスクprops。
- node --experimental-strip-types --test src/map/growth-rules.test.ts: 3 passed（配色・集約/取消・明示キー/曖昧/中庭/場所移動）。
- 全体typecheckは既存server/core/core.test.tsのdisplayName、exploration/flow.ts requestId、records/record-flow.test.ts unknown、reflection/DiaryScreen.tsx version、tools/local/dev.ts childprocessで失敗。地図変更ファイルの診断はなし。
- 実API/実ブラウザ9受入は未完。#228の成功保存通知moduleと#223防災表示store統合を後続で接続する。
- 地理はMapbox Standard公式のbuildings featureset height/min_heightを利用。https://docs.mapbox.com/map-styles/reference/standard/
