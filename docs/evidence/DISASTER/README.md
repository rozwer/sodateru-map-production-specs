# DISASTER #30 実装・検証状況

## 現在の提供範囲

防災固有のDTO、設定検証、実provider adapter、SQLite cache、PLUGINS v2 release、停止/版変更の照合処理、API断片 v1.0.0を提供する。現段階は先行提供でIssue未完了。

- 起点: develop `6d1b08a`。対象commitは本書を含むPR commitで追跡。
- 本人: `disaster-evidence-person`、dataMode=`live`。固定の試験用本人IDで、外部情報は実取得。
- 再現環境: miseのNode 22.22.1、Node SQLite、既存lockfileの依存。
- 実取得とSQLite切断/再接続: `mise exec -- node --experimental-transform-types docs/evidence/DISASTER/live-provider.ts`。
- 検証対象: 江戸川周辺、bounds `[139.84,35.68,139.92,35.76]`。これは手動選択範囲で、行政区域境界ではない。
- 結果: 3レイヤー・各2画像を実取得、source URL/Last-Modified/取得時刻/解析時刻/画像SHA256を保持。SQLite再接続後に画像を含む完全一致、demo側から不可視。詳細は `live-provider.json`。
- 欠測/範囲外/外部障害/取消、地域検証、欠測Polygonの切出し: provider.test.tsの4検証成功。テスト内のtransport fixtureは明示した模擬応答であり、実取得証拠と区別する。

## 実出典と意味

- [国土地理院の洪水想定配信](https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html): 洪水浸水想定区域（想定最大規模）。実際の浸水観測ではない。
- [国土地理院タイル](https://maps.gsi.go.jp/development/ichiran.html#hillshademap): 陰影起伏図。標高モデルからの地形表現で、独自の浸水計算は行わない。
- [気象庁の降水情報](https://www.jma.go.jp/bosai/nowc/): basetime=validtimeの降水解析PNG。mm/hを積算雨量mmとして表示しない。
- 気象庁公式画面が参照する [配信定義XML](https://www.jma.go.jp/bosai/nowc/table/nowc.properties__7d6f7d8dc6f16a416574.xml) で、hrpns_ndはPNGではなくGeoJSONと確認。`surf/hrpns_nd/data.geojson`の欠測Polygonを指定boundsへ切り出し、穴を維持する。
- sourceUpdatedAtは配信Last-Modifiedで、ハザード策定日や地形測量日ではない。不明はnull。気象庁issuedAtはbasetime（解析基準時刻）、validAtは解析対象。取得時刻を観測時刻へ流用しない。

## UI接続契約

GET `/disaster` → `{data:DisasterView}`。POST `/disaster/refresh` → 同形。入力は `{}`、If-MatchはPLUGINSの設定version、共通本人/モード/request/idempotency headerを使用。

設定の保存/変更/停止/削除はPLUGINSの入口を使う。`disaster`の設定は `{region:{id,bounds},layerIds}`。地域はUIで選んだ範囲であり、PLACESの点から行政区域境界を捏造しない。

`map.action=apply` の場合に `result.layers` から `map.layerIds` を使用。PNG `imageDataUrl`は取得済み画像。`tile.bounds`が元画像の地理範囲、`map.bounds`/`layer.bounds`が選択範囲で、UIは選択範囲へ表示をclipする。画像座標はboundsから左上/右上/右下/左下を組み立てる。降水の `noDataMask.geojson` は同じ解析時点の欠測範囲で、画像に重ね、凡例を表示する。

`map.action=clear` ではownerKeyだけ消す。導入削除後も旧結果とownerKeyを返せるため、他のプラグイン表示を消さない。応答のpluginRevisionと現在のstateをUI bridgeの寿命制御にも使う。

更新失敗時は前snapshotの画像・地域・時刻を保持し、lastAttemptに失敗/欠測を返す。GETにstaleを明示する。全失敗は成功空配列にしない。試用はmock Polygonで、模擬と明記し保存しない。

## 未完了条件

- PLUGINS #46 v2統合後の実登録/設定/停止と共通HTTP実接続。
- CORE外部取得pending失敗回復helperの回答後、POST登録・再送/失敗回復確認。
- PLACES #61の実HTTP検索から地域選択を接続した証拠。
- 共通生成物への反映はB、通常地図・UI実操作の受入はA #18/#8。
- root手配の独立レビュー、commit保持merge、task:finish/board/受信/Issue終了。
