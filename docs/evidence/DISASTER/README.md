# DISASTER #30 実装・検証状況

提供単位: #124 DISASTER.data（先行統合済み）、#125 DISASTER.connect（処理側・正式起動接続済み、UI受入待ち）。親Task/claimを維持する。

## 現在の提供範囲

防災固有のDTO、設定検証、実provider adapter、SQLite cache、PLUGINS v2 release、停止/版変更の照合処理、API断片 v1.0.0を提供する。共通GET/POST登録と実HTTP一連操作を確認済み。通常地図の実画面受入が残るためIssue未完了。

- 起点: develop `6d1b08a`。対象commitは本書を含むPR commitで追跡。
- 本人: `disaster-evidence-person`、dataMode=`live`。固定の試験用本人IDで、外部情報は実取得。
- 再現環境: miseのNode 22.22.1、Node SQLite、既存lockfileの依存。
- 実取得とSQLite切断/再接続: `mise exec -- node --experimental-transform-types docs/evidence/DISASTER/live-provider.ts`。
- 検証対象: 江戸川周辺、bounds `[139.84,35.68,139.92,35.76]`。これは手動選択範囲で、行政区域境界ではない。
- 結果: 3レイヤー・各2画像を実取得、source URL/Last-Modified/取得時刻/解析時刻/画像SHA256を保持。SQLite再接続後に画像を含む完全一致、demo側から不可視。詳細は `live-provider.json`。
- 欠測/範囲外/外部障害/取消、地域検証、欠測Polygonの切出し: provider.test.tsの5検証成功。テスト内のtransport fixtureは明示した模擬応答であり、実取得証拠と区別する。

- 実SQLiteを使う固有state検証: service.test.tsの保存/失敗保持/停止/削除/遅着と並行更新の3検証成功。state/providerは明示fixtureで、共有PLUGINSの実接続証拠とは別。
- 保存済み実PNG6枚のCRC・展開長検証成功。

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

## 共通HTTP接続の確認

`mise exec -- node --experimental-transform-types docs/evidence/DISASTER/http-live.ts` が成功。証拠は `http-live.json`。

- 統合済みPLUGINS `33a5021`（提供HEAD `625ff67`）とPLACES #61/#76、COREを実使用。本人sessionは共通HTTPから作成。
- 実Nominatim検索で取得した江戸川区役所の点から周辺範囲を選び、試用（明示mock）→導入→実防災取得→map.applyを確認。
- HTTP停止とSQLite接続終了後、再起動/GETで設定・画像・地域・時刻が完全一致。
- 同一POST再送で外部再取得なし。demoからlive設定/結果は不可視。
- 意図的な外部障害fixtureはHTTP502、旧画像/時刻保持、stale、lastAttempt.failed、pending receiptなし。同じ成功キーの再送は障害中も成功し現在状態を返す。
- 設定変更で旧地域clear、実再取得で新範囲へ更新。停止/削除でcache保持、対象ownerKeyのみclear。停止中の更新は409、過去成功キー再送でもmapを復活しない。
- 実provider通信を意図的にHTTP停止操作の後まで待たせ、停止後の完了がSOURCE_CHANGED 409となり、直前snapshotも地図表示も復活しないことを確認。
- 固有ソースとevidenceのstrict + noUncheckedIndexedAccess型検査成功。
- 共通生成物は編集せず、COREのcanonical fragment composerを一時領域へ呼び出して結合した契約を実HTTPへ適用。

## 正式起動と別OSプロセス再起動

統合develop `28f3bf6`上で、`mise exec -- node docs/evidence/DISASTER/runtime-smoke.mjs` が成功。証拠は `runtime-smoke.json`。共通生成済みOpenAPIと未変更の `server/app/main.ts` をそのまま使用する。

- 実PLACES検索→PLUGINS導入→洪水想定/地形/降水の実取得が正式HTTP入口で成功。
- 最初のOSプロセスを終了し、別PIDで再起動。同じSQLiteから設定・地域・画像・提供元更新時刻・解析時刻を完全一致で再取得。
- 再起動後の同一POSTキー再送は同じ保存結果を返す。
- 正式HTTPの停止操作で対象ownerだけclear、保存済み結果は保持。
- UI/Mapbox描画の証拠ではない。上記の一時合成契約による検証の制約を、正式起動確認について解消した。

## 未完了条件

- 通常地図・UI実操作の受入はA #18/#8（bounds/clip、凡例/出典/時点/欠測、対象owner停止）。
- 本体PR #67/#129は独立レビュー・commit保持merge済み。追加の正式起動証拠PRのレビュー/統合が残る。
- 全受入後のtask:finish/board/受信/Issue終了。
