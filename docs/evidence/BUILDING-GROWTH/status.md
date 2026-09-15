# 初回実装単位

- 起点: origin/develop 5760202281c6a73b7f51c58ab90bde28ec826664。worktree /Users/roz/.codex/worktrees/building-growth、Task BUILDING-GROWTH / Issue #222。
- 固定用途辞書/混合色/訪問ID重複排除、明示キー優先・複数含有未対応、実建物高さ維持、薄い下地、style.load復元、建物→施設/根拠記録、既存PlacePatchで対応保存、BridgeMap画像/マスクprops。
- node --experimental-strip-types --test src/map/growth-rules.test.ts: 3 passed（配色・集約/取消・明示キー/曖昧/中庭/場所移動）。
- 全体typecheckは既存server/core/core.test.tsのdisplayName、exploration/flow.ts requestId、records/record-flow.test.ts unknown、reflection/DiaryScreen.tsx version、tools/local/dev.ts childprocessで失敗。地図変更ファイルの診断はなし。
- 実API/実ブラウザ9受入は未完。#228の成功保存通知moduleと#223防災表示store統合を後続で接続する。
- 地理はMapbox Standard公式のbuildings featureset height/min_heightを利用。https://docs.mapbox.com/map-styles/reference/standard/

## 実タイル・候補保存（13:39 JST）
- PR #239通常merge（fa78030保持）。共有runtime edf48a0→18cd9dの反映を担当本人から受領。iap 1280×720、demo本人さやか。
- 実Mapbox建物薄灰色/道路白/公園淡緑/水面淡青を確認。3D切替・街区ズーム・建物クリック成功。安定キー `mapbox:basemap:buildings:building-A:5398410314769255` がrouteへ出る。クリックで成長色は付かない。console error/warn 0。unvisited-building.png。
- 同じキーの場所とcandidate訪問を既存APIでdemoに保存。api-candidate.jsonの成長応答は空。本文や本人IDをリクエストから信用する実装は追加していない。
- 初回API/ブラウザ往復中に共有配信切替を挟み、セッション再開始を要した。再読込受入は固定commitで未確認。
- 次差分: 建物選択→名前入力→場所保存、施設ピンから詳細へ遷移、安定ID取得不能/成長取得失敗の明示、同一mapでstyle再読込、#223表示storeのPNG/欠測接続。
- 対象strict TypeScript検査PASS（MapRenderer/MapScene/map screensと依存、vite/client,node）。Vite build PASS。

## 最終接続と収束
PR #251に場所登録/施設ピン詳細/取得失敗区別/同一map style再読込/防災storeを統合。#228通知を同scopeで購読し、最新growth全ページへ差し替える。#250防災hydrateは常駐MapRendererだけtrueで呼ぶ。施設詳細にcandidate/confirmed/rejected訪問の確認入口を追加し、記録画面から戻っても同じ場所ならcameraをfocusし直さない。共通canvas CSS詳細度の競合を修復。
ユーザーの収束指示により追加探索を終了し、未実施9受入は未達として最終QAへ渡す。全体型検査既存エラーは残り、完了扱いにはしない。
