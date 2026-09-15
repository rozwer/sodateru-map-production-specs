# 試用表示の契約 v2

`postPluginTrial` の `data.preview` は、各機能が `registerPlugin` へ渡す同期 `trial(settings)` の結果を検証して返す。試用は取得・導入を保存しない。実データはBIKE/DISASTER/PILGRIMAGEそれぞれのAPIから取得し、試用配列へ混在させない。

- `dataKind: "mock"`, `label`, `generatedAt`, `warnings[]`, `declarations[]`。
- `features: TrialFeature[]` はGeoJSON Feature。geometryはPoint/LineString/Polygon/MultiPolygon、座標は `[longitude,latitude]`。Polygonの輪は閉じる。
- properties: `{kind,label,legendId,sourceIds,status,value,unit}`。kindはplace/route/hazard/observation/forecast/terrain/pilgrimage。statusはsimulated/unknown。未確認をverified/走行可能/安全へ変換しない。
- `legends[]`: `{id,label,color,meaning}`。colorは6桁hex。UIは各featureのlegendIdから意味と色を読む。レイヤー種別を色だけから推測しない。
- `sources[]`: `{id,title,url,attribution,dataKind:"mock",fetchedAt,sourceUpdatedAt,observedAt,issuedAt,validAt}`。URLと各時刻は不明/非該当ならnull。generatedAtはプレビュー生成時刻で、取得/更新/観測/発表/対象時刻に代用しない。
- 空間描画はUI-MAPの共通bridgeへ変換する。模擬表示のbefore/afterは同じcameraで行い、選んだ地域/条件はsnapshot.settingsから導入確認へ渡す。

## 各機能の登録

`import { registerPlugin } from '../plugins/index.ts'`。本人state読取は同moduleの `getPluginState(db,context)`。

`registerPlugin({manifest,declarations(settings),trial(settings),prepare?})`。

manifestは `id,name,description,category,author,pluginVersion,updatedAt,changeLog,icon,usageInfo,sources,settingsSchema,defaultSettings,trialConditions,order?`。settingsSchemaはJSON Schema 2020-12、title/enumでUIに設定名と選択肢を示す。defaultSettingsを含め登録時にSchema検証する。idは `bike` / `disaster` / `pilgrimage` に固定する。

標準宣言は `{targetKey:"layer:bike",property:"visibility",value:true}`（各機能名へ置換）。色等の追加宣言は別property。通常地図側はPLUGINSのenabled/解決済み宣言と固有APIの実取得結果を組み合わせる。固有APIが導入状態を書き換えない。

版更新時に `prepare` が失敗した場合、導入済み版と本人設定を保持する。prepareは取得/準備のみで本人保存を書かない。停止/削除はPLUGINSが適用を除去し、各機能の保存結果や本人の体験/場所は消さない。

## 確認

v2でSQLite lifecycleと本文/cursor/preview契約の10テスト成功、固有strict型検査成功。CORE実HTTP接続前であることはREADME参照。

## アイコン（PLUGINS fragment v3）

iconは固定ID。GET /pluginsの各item.iconOptionsに `{id,label,symbol}` の6件を返す。選択UIと地図マーカーは同じsymbolを使い、設定へidを保存する。

|id|label|symbol|
|---|---|---|
|pin|ピン|📍|
|motorcycle|バイク|🏍️|
|shield|防災|🛡️|
|book|作品|📖|
|star|星|⭐|
|map|地図|🗺️|

任意URLや絵文字本文はidとして受け付けない。BIKE既定motorcycle、DISASTER既定shield、PILGRIMAGE既定bookを推奨する。試用GeoJSONのv2形は変更しない。

PLUGINS全TSファイルを本番のstrict + noUncheckedIndexedAccessで確認して成功。アイコン追加後の本文/cursor/preview契約3件成功。
