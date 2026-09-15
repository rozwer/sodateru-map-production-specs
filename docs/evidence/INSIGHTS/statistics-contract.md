# 活動統計HTTP

GET /api/v1/reflection/activity-statistics?from=<UTC ms>&to=<UTC ms>&timeZone=<IANA>
operationId: getReflectionActivityStatistics
fragment: INSIGHTS.json / insights-statistics-1
返却: {data:ActivityStatistics}。保存しない現在値。権限は本人、live/demoの共通session境界。

## 表示対応
- 確認した訪問回数: confirmedVisits.value / unit=visits。visitIdsが根拠。
- 訪問した場所数: confirmedPlaces.value / unit=places。placeIdsが根拠。回数と場所数を混同しない。
- 新しい場所: newPlaces.value。全確定履歴の最初の開始日が対象期間内の場所。日時不明履歴のある場所はunknownPlaceIdsに分離。
- 保存されたGPS観測線距離: gpsDistanceMeters.value、単位m。未取得/有効線分なしはnull。同位置の有効2点は0。実移動距離や歩数への推定はしない。
- 活動内訳: activities[].name/count/recordIds。本人が保存したactivitiesの記載を使う。
- 日別: daily[].date/confirmedVisits/recordIds。IANA日付、from以上to未満に開始する訪問と実効日時が範囲内の記録。
- 取得元: sources[].id/label/itemCount/firstObservedAt/lastObservedAt/lastUpdatedAt/status/description。
- 全体最終更新: lastUpdatedAt。根拠記録/訪問/GPSの更新日時の最大。返却時刻ではない。
- 日時不明: undatedVisits/undatedRecordsは本人の全履歴のうち対象日へ割り当てられない件数。期間内件数に足さない。
- 保存済み記録/訪問/場所の参照: sourceRefs。GPSはgpsDistanceMeters.sourcePointIdsから追跡する。SourceRefに存在しないtrack型を追加しない。

## 実装
ACTIVITY listVisits/listPointsを100件ずつ最後まで読み、INFORMATION ownMaterials/getOwnRecord/assertSourcesCurrentを使う。単一同期transactionで現在値を返す。共有サーバや既存利用者データの変更なし。
GPSはsegmentId/breakBefore/時刻順で線を分断し、ページ境界では切らない。欠測部分の補間なし。accuracyMは観測精度として返し、独自の品質基準や歩行判定は追加しない。

## 証拠
statistics-http.test.ts と statistics-http.json。
隔離実SQLiteのCORE/ACTIVITY/RECORDS/INFORMATION/INSIGHTSをlocalhost HTTPで接続。102訪問、101 GPS点の複数ページ、初回全履歴、日時不明、削除点による線の分断、同入力一致、GPS欠測null/同位置0、live/demo境界、不正期間400を確認。
共有正式契約生成・UI controllerへの結線は別担当。UIが計算を複製する必要はない。
