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
- 未公開版の更新は404で旧stateを保持。この初回検証時点では実manifestは各1版のみだった。後述の実2版検証でBIKEの更新/版戻し成功を追加した。既存の更新/版戻し/prepare障害/競合の処理証拠は[http-integration.md](http-integration.md)に保持。

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
- C処理の版管理・通常接続が揃った後、表示側受入をA #144へ明示引継ぎし、ユーザーの最新運用に従ってCの正式finishへ進める。UI未達だけをclaim保持条件へ追加しない。この棚卸し時点ではCの実版成功・地図設定通常接続が残っていた。後述の実2版検証後も地図設定の正式生成が未完なのでfinishしない。

## 訂正後の実2版：通常HTTP更新・版戻し

旧証拠commit b9c3f5dはPR #260の候補登録gateを版差にしていたため撤回した。今回のversion-roundtrip.jsonは、BIKE PR #266 / 正式merge `5126fac4dbcee54670769ee8abab3a2886fdbd06` の**旧版候補維持・新版区間評価**の定義で置き換えた結果である。旧結果はGit履歴だけに保持し、受入証拠に使わない。

検証HEAD: `f0a3f8503f5cf5c435d52d63f532408eac7b06cb`。`mise exec -- node docs/evidence/PLUGINS/version-roundtrip.mjs`：**16 HTTP操作PASS**。

通常main/正式生成OpenAPI/全register/実SQLiteを使用し、追加fixture・共通基盤注入・外部provider呼出しなし。

- catalogに実1.0.0/1.1.0。本人地域設定とstarアイコンを指定して旧版導入。
- HTTP更新1.1.0で本人設定/icon/installId/owner/layer:bikeを保持し、`feature:bike:segment-evidence / enabled=true`を追加。撤回済み`feature:bike:place-candidates`宣言は存在しない。
- HTTP版戻し1.0.0で旧manifest/本人設定/icon/layer宣言を完全復元。新規区間評価の宣言のみ除去し、enabled/ownerKeyは保持。
- 別の読み取り専用SQLite接続から履歴revision1/2/3の1.0.0/1.1.0/1.0.0を確認。
- 別OSプロセスで同じDB/profileを再起動し、HTTP設定/stateとSQL履歴の全項目が一致。同一更新/版戻しキーの再送も現在資源を返す。
- demo導入が残る時点でliveの本人sessionを作成し、live stateは空。

### 固有動作証拠との区別

旧1.0.0/rollback後の候補登録・地点採用維持、新版区間評価の保存、新規評価だけunknownへ戻すこと、既存の区間評価GETとSQLite再open保持は、正式#266の [BIKE releases.md](../BIKE/releases.md) / [release-check.json](../BIKE/release-check.json)で確認済み。**その地点・区間入力は明示fixture**であり、今回再実行せず既存の限定証拠を再利用する。

本probeの通常main HTTP証拠は版/設定/適用宣言/履歴/別OS復元の接続差分。通常BIKE実二輪取得や全車種適合の完了を示さない。ROUTES二輪factoryが統合されても通常配線・固有受入はBIKE担当の残件。

### 残件と引継ぎ

Cの通常地図設定接続は/map-settingsの正式生成とowner表示HTTP照合が残る。共通生成はroot保留のため生成・追加依頼・基盤コピーを行わない。C処理が揃えば表示受入をA #144へ明示引継ぎし、UI未達だけをclaim保持条件にせず正式finishへ進める。
