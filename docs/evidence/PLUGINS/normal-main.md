# PLUGINS.connect #120 — 通常mainの接続差分

2026-09-15、正式develop `7ac7f684` 起点。提供commitは本書を含むPRのHEAD。

## 成功した処理側の接続

`mise exec -- node docs/evidence/PLUGINS/main-probe.mjs`

- 既存 `server/app/main.ts` を別OSプロセスで起動。全register.ts自動収集、正式生成済みOpenAPI、実SQLite live/demoファイル、通常本人sessionを使用。機能や契約の注入なし。
- 同一起動でBIKE/DISASTER/PILGRIMAGE実manifest `1.0.0` がカタログに現れ、各iconOptionsに固定6 IDがある。共通clientにもgetPluginState/postPluginTrial/PluginIconIdが正式生成済み。
- 3機能のPOST trialは模擬と明示されたGeoJSON/凡例/出典/時点を返し、本人導入stateは変わらない。
- 試用snapshot.settingsと確認済みstateRevisionをPOSTして導入201、同一キー再送200。各installIdからownerKeyと適用宣言を取得。
- 停止後は設定を残してresolvedDeclarationsが空。OSプロセス終了→同じDB/本人profileで再起動後、state/設定一覧の全項目が一致。
- 削除後は導入一覧から消える。別live DBは空のまま。
- 未公開版の更新は404で旧stateを保持。実manifestは各1版のみのため、実版更新/版戻し成功は今回の証拠に含めない。既存の更新/版戻し/prepare障害/競合の処理証拠は[http-integration.md](http-integration.md)に保持。

結果JSON: [main-result.json](main-result.json)。37 HTTP操作、`passed:true` は上記PLUGINS処理単位だけを意味する。`blockers`の地図受入は未達。

## 地図接続で判明した残件

同起動のGET `/api/v1/map-settings` は404「API契約が見つかりません」。mainにはmap-custom実装が登録されているが、当該baseの正式生成OpenAPIに/map-settingsがない。#3へ一点だけ反映依頼済み。スクリプトは正式経路が生成されれば表示希望→owner表示→停止→再起動→削除後の希望保持まで検証する。未生成なら404を記録してその区間を保留し、基盤コピーで代替しない。

#120の通常UIによる試用比較/導入/更新・版戻し/停止・削除はAの#18/#8/#172で受入が必要。APIのmock試用を実地点・経路・災害データとして表示しない。

## UI/demoへの既存成果の渡し方

#172へ所在と手順を一度共有済み。共通HTTPヘッダーはX-Request-Id（UUID）、X-Data-Mode:demo、POSTのIdempotency-Key、変更時If-Match。本人はPOST /api/v1/session のprofileKey:selfで開始しcookieを維持する。

- アプリ一覧: GET /api/v1/plugins。main-result.jsonのsnapshots.catalogは通常APIから取得した実manifest。
- 試用: POST /api/v1/plugins/{id}/trial。カタログpluginVersion/defaultSettingsを送り、snapshots.trialsに実応答JSONを保存。
- 導入: POST /api/v1/plugin-settingsへ{id,pluginVersion,settings:trial.snapshot.settings,enabled:true,confirmed:true,stateRevision:trial.stateRevision}。確認後だけ保存し、stateRevisionを固定fixtureにしない。
- 導入状態: GET /api/v1/plugin-state。snapshots.installed/stopped/removedに実JSON。ownerKeyはその本人DBから返るinstallIdで計算済み。
- 地図設定/装飾: [MAP-CUSTOM証拠](../MAP-CUSTOM/README.md)、settings-plugin-http.jsonとobject-http.json。生成後はその正式APIを利用。

demo投入のために既存UIへ新mock基盤は加えない。本probeは隔離した一時DBを使い、利用中DBを変更しない。実操作側のdemo DBには同じHTTP手順で本人が確認して導入する。

## 既存の実取得・保存証拠（今回再実行なし）

- [BIKE](../BIKE/README.md): live-overpass.json / live-route-scope.json、実OSMと通行根拠の範囲。未確認を通行可にしない。
- [DISASTER](../DISASTER/README.md): http-live.json、実GSI/JMA・時点・cache再取得・停止。
- [PILGRIMAGE](../PILGRIMAGE/README.md): live-http-result.json、実公式出典/道路/計画保存。試用は実作品対応を示さない。

親 #28・子 #120はこの処理単位だけでcloseしない。claim/branch/worktreeを維持。
