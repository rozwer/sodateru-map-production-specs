# ROUTES → BIKE 二輪profile・同一shape属性

親#25 / BIKE #29,#91の先行実装。公開口は`server/features/routes/index.ts`の`createMotorbikeRoutesService(db,{profile:'motorcycle'|'motor_scooter',useHighways?:number,topSpeed?:number})`。既存`createRoutesService(db)`のwalking/driving Mapboxとcyclingは保持。

## 呼び出し

- `await service.previewRoute(context,{mode:'driving',title,waypoints,conditions:{departAt,timeZone,avoidMotorways?,returnBy?}})`。本人候補/保存地点/順序は既存PLACES境界で解決・再照合。profileはBIKEのserver側設定から明示し、HTTPの任意入力には増設しない。日時は分単位UTCms+IANA zone、topSpeedはscooter専用km/h。
- `service.revalidatePreview(context,previewId,true)`は`segmentEvidence`を持つ既存RoutePreview。通常factoryからも同じDBのpreviewを再照合できる。BIKEの`assessCommonRoute`へそのまま渡す。
- 共通`saveRoute`と`getSavedRoute`は区間根拠もsnapshot保持。ただし、通常の経路snapshot保存とBIKEの適合ルート採用は異なる。BIKEのadoptは日本車種/highwayがunknownなので拒否される。
- `compareRoutes`は同じwhole-tripを1件返す先行単位。複数の二輪代替案を捏造しない。

## 同一取得の境界

`ROUTES_VALHALLA_URL`は既存の`/route`URLを使用し、同じbase pathの`trace_attributes`を呼ぶ。識別`X-Client-Id: sodateru-map-production-specs-routes-25`、20秒timeout、直列で各trace前1.1秒。全2〜10地点をroute一括取得し、各legの元encoded shapeと同じcosting/options・leg出発時刻をtraceへ渡す。全legのshape一致・全edge順序被覆・同じosm_changesetが揃うまでpreviewは発行しない。

`SegmentEvidence`型はBIKE正本をtype importし、C側で複製しない。geometryHashはBIKEと同じCORE `requestHash`（キー正規化SHA256）、routeFetchedAtはroute取得、fetchedAtは最後のtrace取得。providerEvidence.geometryHashは既存ROUTESのJSON順SHA256のままなので、BIKE照合にはsegmentEvidence.geometryHashを使う。元データ版を更新日時へ変換しない。motorroad欠測はnull。

要求208はignored、警告なしでも要求成功の証拠がなければunknown。同形状のmotorwayクラス不在はBIKEが別評価する。その他warning、形状差異、別profile、被覆欠落、途中trace失敗/429は全体preview失敗。階段/屋根/滞在は未対応。

## 確認

`motorbike.test.ts`の正式factory→ローカルHTTPで記録済み実Valhalla route/trace再生→実BIKE評価/SQLite→共通route保存→別OSプロセスで全snapshot/再送一致が成功。52edge/79区間、本人違い拒否、要求ignoredとmotorway観測verified、日本車種/highway unknown、BIKE採用拒否。`motorbike-connection.json`を参照。installation/Overpass入力は試験fixtureで、BIKEの通常HTTP/UIの完成証拠ではない。

新しいscooter traceだけ実1回取得（`motor-scooter-trace.json`）。既存BIKE requests[1]の同一shapeでHTTP200/52edge。元routeは再取得していない。車種属性は文字列`"null"`で欠測だったため`providerEvidence.traceVehicleTypes`にそのまま保持。profile名から適格性を推論せず、BIKEはunknownを維持。これを再生したscooter接続も成功。その他の新検査はtrace形状/車種矛盾/被覆欠落/429の拒否と、変更したparserのcycling3回帰。

公式仕様: https://valhalla.github.io/valhalla/api/route/api-reference/ 、 https://valhalla.github.io/valhalla/api/map-matching/api-reference/ 。ローカルコンペ/動画用途のみ。一般公開サービス採用・外部Discussion投稿は行わない。

## 残件

C fragment v1.4.0に出力とserver入口を記載。共通生成の判断はroot保留中で、B所有pathは編集しない。BIKE側のinstallation/settings→新factory配線は#29へ依頼。通常HTTP/UI、二輪の複数比較、日本の車種/時間規制、階段/屋根/滞在、公共交通/運賃/定期券は未達。#25/#87/#88を閉じない。
