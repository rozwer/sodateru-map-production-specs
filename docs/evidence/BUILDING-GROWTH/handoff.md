# 最終引継ぎ（2026-09-15 13:48 JST）

## 統合・所有
Issue #222 / BUILDING-GROWTH。worktree `/Users/roz/.codex/worktrees/building-growth`、branch `rozwer/222-building-growth`。
PR #239（fa78030）、#251（f6d6d15）通常merge。最終PR #253は#228通知・#250防災hydrate・canvas CSS・訪問入口をまとめる。src/map/、src/features/map/、この証拠ディレクトリを取得して実装。他担当のserver/shared/App.tsxは編集していない。

## 実証したこと
共有QA runtime本人による18cd9dと後続反映、5173/3002・既存demo本人さやかで確認。地理は実Mapbox Standard、mock建物ではない。
- 実タイルの薄灰色建物、道路白、公園淡緑、水面淡青、3D、クリック→安定キー付き建物詳細。クリックだけでは訪問を保存しない。
- `postPlaces`で実クリック由来keyを保存し、`postVisits` candidate後のgetMapGrowthは対象なし。
- `patchVisitsVisitId` confirmed version2成功→getMapGrowth対象1回/stage1/sourceRefs。同じ訪問に食事recordをPOSTしても1回のまま。
- 実ブラウザ再読込後、同じ建物keyに対応した「確認済み訪問1回、食事」ボタンを表示。confirmed-building.png。
- 確認取消 candidate version3成功→getMapGrowthの対象消去。実ブラウザ再読込後、成長ボタン0件・本文は施設詳細に残る。cancelled-building.png / api-cancelled.json。

**実建物面の色が画像上で十分に判別できていないため、着色の視覚受入は未確認。バッジだけで実建物着色成功とは扱わない。fill-extrusionとStandard建物の同じ高さによる遮蔽/深度競合を最初に確認すること。推測であり原因確定はしていない。**

## 9受入の残り（Issue #222を閉じない）
|受入|状態|
|未訪問灰色|実ブラウザ確認|
|検索・候補だけ非着色|candidate実API/growth空を確認。検索APIは共有環境にMapbox検索設定なし|
|本人確認→実API→建物着色|API/安定key解決/1回用途表示まで確認。建物面の色は未確認|
|reload/restart同一根拠|reloadは同key/根拠。server restart後は未確認|
|用途訂正で色更新・本文保持|#228 API監査に別IDの証拠。実建物面とUIの通しは未確認|
|取消で段階低下/0灰色|対象growthとバッジ消去・本文保持確認。2→1/3→2の実ブラウザ段階低下は未確認|
|場所訂正で旧建物色消去|純粋関数テストのみ。2実建物を使うブラウザ確認は未実施|
|map操作/style再読込で同じ対応|明示key永続/再読込解決確認。style操作と複数施設・タイル境界の通しは未確認|
|保存失敗を成功表示しない|#228の実API競合監査・別UI証拠。地図面との通しは未確認|

## 再開用ID・操作
- mode demo / profile self、place `e4d76d9b-e299-496a-b710-ecd9e0eb3d4a`
- visit `631db5ae-b3e2-49ec-9d6e-68b522fdcacd` は現在candidate version3
- record `7d232803-704f-4851-81cd-ae0b62402dc8`（本文「実建物着色の確認用記録。本文保持を確認する。」、用途食事）
- key `mapbox:basemap:buildings:building-A:5398410314769255`
- map `#/map?placeId=e4d76d9b-e299-496a-b710-ecd9e0eb3d4a`、visit-confirmは上記visitId、zoom16 pitch52。本人選択を求められたらStartデモON→自分→地図をのぞく。
- 既存の「地図の表示を読み直す」でmap.setStyle、カメラとmapインスタンスを保持する実装。#228保存通知はMapToolbarで同scopeの最新growth全ページ再取得。#250 hydrateは常駐MapRendererだけtrue。

## 検証
境界3テストPASS、対象strict TypeScript（noUncheckedIndexedAccess/vite client含む）PASS。Vite buildはPR #251時点PASS。全体typecheckには範囲外既存診断が残る（status.md）。原本853×1844/390幅の最終確認は未実施。

ユーザーの「早く閉じる」指示により追加探索・修正を止め、コード統合後claim/受信を解除してこの担当を終了する。未達受入の所有先は最終統合QA/root、再開は#222の通常claimから。完了扱い/数合わせcloseはしない。


## 中心機能の限定修復（再開指示）
rootの追加指示で実建物面だけ再開。再claim generation3、他範囲の追加探索なし。catalogが同じ形状の後続3D featureの高さを更新せず初期2D height=0を保持しうるため、形状cacheと独立して地理データ由来の高さを更新する。Standard本体との同一平面競合を避ける描画用0.06mを元実装から復元（保存/集計の高さは地理データ値で、訪問で変えない）。バッジに地理高さ/計算色のDOM診断属性を付けて、実面の一往復を確認する。


## 最終期限の初期カメラ修復
初回のbridge保存によってlocalStorageキーが先に存在し、MapRendererの初期zoom16設定が飛ばされる。保存キー有無ではなく、起動時カメラの国全体相当zoom<7または非数値を判定し、横浜139.6368/35.4548、zoom16/pitch55へ変更。有効な街区カメラは維持する。位置追跡・共有runtime設定の変更なし。
実面の着色は#261後も視認未確認。追加のtheme/slot実験は差分を戻した。自分の確認用訪問はUIで候補版5へ戻し、確認済み0回を確認。全9受入完了とは扱わない。

ユーザー追加指示「地図の色が変」に対し、画面全体へ適用していたfadedテーマをdefaultへ統一。未訪問建物の指定色と経験色ルールは維持。
