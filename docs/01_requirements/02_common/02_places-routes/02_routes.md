# 経路取得と保存

相談の「ここまで歩く」、今日の提案、別都市での体験、拡張機能の地点列から呼ぶ。
入力の地点順で道路経路を取得し、距離・時間・線を返す。

## 入出力

previewRoute(context, RouteRequest)はRoutePreviewを返す。
保存はsaveRoute(context, {id,previewId,title})。
HTTP接続は[接続表](../references/http-bindings.md)を使う。

| RouteRequest | 内容 |
|---|---|
| waypoints | 2〜10地点。配列順が通る順序 |
| mode | walking / cycling / driving / transit |
| title | 0〜100文字 |

地点は次のどれか。
storedは{kind:"stored",placeId}、candidateは{kind:"candidate",resultId,candidateId}、pointは{kind:"point",coordinates,label}。
storedはplacesを読み、candidateは本人・期限付き結果を読む。
pointは利用者が選んだ地点として扱い、AIから任意座標を受ける入口には使わない。

RoutePreviewはpreviewId、waypoints（解決済み座標・名前・placeId）、mode、legs、geometry、distanceM、durationSec、provider、fetchedAt、expiresAt、retention。
legsはfromIndex、toIndex、geometry、distanceM、durationSec。
区間は地点数−1件。途中の一部だけを成功として返さない。

## 取得の順序

1. 全地点を同じ本人・モードで解決し、座標とSourceRefを固定する。
2. walkingはwalking、drivingはdrivingのMapbox profileを選ぶ。
3. cyclingとtransitはMODE_UNSUPPORTED。バイクの呼出し元はdrivingを指定し、車種の通行条件を別途評価する。
4. 隣り合う地点を順番にDirectionsへ送る。
5. 区間ごとに応答を検査し、形状・距離・時間をそろえる。
6. 場所のversionと候補の期限を再確認する。
7. 全区間を結合し、一時previewIdを発行して返す。

隣り合う座標が完全一致する場合はINVALID_INPUT。
最初と最後が同じ周回は、途中に別地点があれば許可する。
全体期限は60秒、各通信は20秒。取消はすべての通信へ伝える。

## Directionsの送信内容

URL：https://api.mapbox.com/directions/v5/mapbox/{profile}/{lng1},{lat1};{lng2},{lat2}

| query | 値 |
|---|---|
| access_token | MAPBOX_ACCESS_TOKEN |
| alternatives | false |
| geometries | geojson |
| overview | full |
| steps | false |
| language | ja |

HTTP成功、code=Ok、routesの先頭に経路があることを確認する。
NoRouteはROUTE_NOT_FOUND、429はRATE_LIMITED、その他の失敗はPROVIDER_UNAVAILABLE。
geometry.type=LineString、座標2点以上、全座標が有限かつ範囲内、distance＞0、duration＞0を必須にする。
形式不正はOUTPUT_INVALID。

区間geometryはproviderの点列を保つ。
全体geometryは区間順に連結し、前の末尾と次の先頭が完全一致する境界点を一つにする。
区間境界が一致しない場合はOUTPUT_INVALIDとし、連続しない線を一本のLineStringへ変換しない。
区間端点に出発地・施設の座標を足して直線でつなぐ処理はしない。
入口から道路への接続が表示上必要なら、道路経路と別の補助表示にする。

## 距離・時間・グラフ変換

全体distanceMは区間distanceMの和。
各区間durationSecはproviderの秒を最後に四捨五入し、全体は丸めた区間の和にする。
表示用の分はmax(1,round(durationSec/60))。
計算途中の距離は丸めず、m表示で四捨五入する。

道路グラフへ変換する利用側には、各geometry点をnode、隣接点をedgeとして返す。
各辺の距離重みは地球半径6,371,000mのhaversineで求める。
APIの距離・時間を辺の距離比で配分し、最後の辺で残差を調整する。
重み総和0の形状はOUTPUT_INVALID。
このグラフは取得した経路の表現に使う。

stairsとcoveredはNULL。
vehicleClassesはwalkingならpedestrian、drivingならその呼出し元の車種情報へ対応させる。
リハーサルで固定されていたpedestrianを、drivingへそのまま適用しない。

## プレビューと保存

previewは本人・モードごとに15分保持する。
一地点でもtemporary候補を含む場合はretention=temporary、それ以外はstorable。
saveは最初に[作成受付記録](../00_protocol.md#採用作成の応答を再取得する)を照合する。未保存ならstorableのみ受け付け、本人・期限・場所のversionを確認する。
temporaryはREQUEST_CONFLICTで再選択を案内する。

保存済みidへの同じ入力は既存ルートを返す。
違うpreview・titleならREQUEST_CONFLICT。
placesへの採用が必要な地点は、先に場所登録を完了してからルートを保存する。

| RoutePreview | saved_routes |
|---|---|
| 保存要求のtitle | title |
| 解決済みの地点列 | waypoints_json |
| legs、geometry、mode | route_json |
| distanceM、durationSec | distance_m、duration_sec |
| provider、fetchedAt | provider、fetched_at |
| https://www.mapbox.com/about/maps/ | source_url |

新規はstatus=saved、current_leg=0、visibility=private、shared_with_json=[]、version=1。
waypoints_jsonの各地点は{lng,lat,placeId?}へ変換する。
route_jsonは{geometry,legs}。各legは{mode,from,to,distanceM,durationSec}へ変換し、from/toも同じ地点形式にする。
APIの区間geometryを再表示に使えるよう、route_json.legsの各項目にgeometryを追加する。
[DBの地点列](../../01_DB/06_saved_routes.json)をこの対応で保存する。
providerはmapbox-directions。
案内開始はnavigating、終了はfinished。変更はexpectedVersionで照合する。

再表示は保存した経路を読み、fetched_atを表示する。
更新はupdateRoute(context, id, RouteUpdate)を呼び、expectedVersion一致で経路を置き換える。取得はgetSavedRoute(context, id)。作成・更新・取得のdataはSavedRoute。SavedRouteのwaypoints・legsは保存JSONからAPI形式へ逆変換する。
steps=falseの本経路を使う画面は線・距離・時間を表示する。
曲がり角の指示は案内機能の別の取得項目として扱う。
