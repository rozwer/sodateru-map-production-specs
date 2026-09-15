# PLUGINS.connect #120 — 通常mainの接続差分

2026-09-15、正式develop `7ac7f684` 起点。提供commitは本書を含むPRのHEAD。

## 成功した処理側の接続

`mise exec -- node docs/evidence/PLUGINS/main-probe.mjs`

- 既存 `server/app/main.ts` を別OSプロセスで起動。全register.ts自動収集、正式生成済みOpenAPI、実SQLite live/demoファイル、通常本人sessionを使用。機能や契約の注入なし。
- 同一起動でBIKE/DISASTER/PILGRIMAGE実manifest `1.0.0` がカタログに現れ、各iconOptionsに固定6 IDがある。共通clientにもgetPluginState/postPluginTrial/PluginIconIdが正式生成済み。
- 3機能のPOST trialは模擬と明示されたGeoJSON/凡例/出典/時点を返し、本人導入stateは変わらない。
- 試用snapshot.settingsと確認済みstateRevisionをPOSTして導入201、同一キー再送200。各installIdからownerKeyと適用宣言を取得。
- 停止後は設定を残してresolvedDeclarationsが空。OSプロセス終了→同じDB/本人profileで再起動後、state/設定一覧の全項目が一致。
- 削除後は導入一覧から消える。別live DBは空のまま。ただしliveの空確認はdemo削除後なので、この確認だけで非空データのmode間分離を立証したとは扱わない（PR #198独立レビュー補足）。
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

## 実版更新/版戻しに必要な提供物

正式develop `98bece8` の通常mainで、GET /pluginsと各GET /plugins/{id}/versionsを確認した。BIKE/DISASTER/PILGRIMAGEはいずれも実公開版1.0.0のみで、更新先になる実2版はない。

- 再現: `mise exec -- node docs/evidence/PLUGINS/release-inventory.mjs`
- 実応答manifest: [published-releases.json](published-releases.json)。試用/導入/未公開版404の既存成功区間は再実行していない。
- 最小提案はBIKE #29へ一度連絡済み。`server/plugins/bike/release.ts` / `register.ts`で旧1.0.0を保持し、既統合の共通PLACES採用など実変更に対応する次releaseを正式登録する。新旧両版のmanifest/settingsSchema/defaultSettings/declarationsを再現できる状態が必要。
- PLUGINS側の登録口変更や新mock版は不要。実2版の提供後に通常HTTP更新→旧版戻し→設定/表示宣言/履歴/再起動保持を確認する。
- C処理の版管理・通常接続が揃った後、表示側受入をA #144へ明示引継ぎし、ユーザーの最新運用に従ってCの正式finishへ進める。UI未達だけをclaim保持条件へ追加しない。現時点ではCの実版成功・地図設定通常接続が残るためfinishしない。
