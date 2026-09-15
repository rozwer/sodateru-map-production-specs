# BIKE #91: Valhalla 日本二輪 profile の限定実証

2026-09-15、実呼出しは **3回のみ、全てHTTP 200**。`X-Client-Id: sodateru-map-bike-issue29-research`付き。`valhalla-probe.mjs`が要求/取得時刻/全応答を`valhalla-live.json`へ保存し、保存応答だけの集計を`valhalla-summary.json`へ置いた。ROUTES adapter・通常API・既定providerは変更していない。

## 実測

共通の出発/到着は `[139.701,35.659]` → `[139.712,35.665]`、出発指定 `2026-09-15T13:30` (Asia/Tokyo)。両方に`use_highways:0, exclude_highways:true`を指定。

| 実要求 | 実応答 |
|---|---|
| route / motorcycle | 1.693km、253.149秒。案内travel_type=motorcycle、到着13:34 |
| route / motor_scooter、top_speed=30 | 同じ形状の1.693km、304.576秒。travel_type=motor_scooter、到着13:35 |
| 直前motorcycleのencoded_polylineをtrace_attributes / edge_walkへ | 返却shapeが文字列として完全一致。80点の全79線分を52 edgeのshape indexが被覆 |

52 edgeはtertiary 26 / trunk 22 / primary 4、全てvehicle_type=motorcycle。traversabilityはforward 40 / both 12。way_id・道路名・進行方向・始終点の部分区間割合を返す。始点edgeはtertiary、終点はtrunk。両routeのsummaryはhas_highway=false / has_time_restrictions=falseだった。

**全3応答で warning 208：hard exclusions はこのserverで許可されず無視された。** routeでは`trip.warnings`、trace_attributesではルート直下`warnings`にある。top-levelだけの検査は不十分。今回shapeにmotorway分類がなかった事実と、強制除外の適用成功を区別する。

## #91への評価

- 改善できる点：Valhalla自身が返した同じgeometryへOSM way ID・車種profile・道路分類を対応付けられた。近傍道路を別のMapbox線へ流用する方法ではない。ただし今回Valhalla形状は既存Mapbox約1.56kmとは別経路。
- 未確認：日本の50/125/250cc等の排気量区分・電動定格出力を指定し評価した根拠は今回のAPI仕様/応答で確認できない。motor_scooterのtop_speed=30は速度条件で、日本の法的原付区分の証明にはならない。
- 欠測：返却edgeに原OSMアクセス/条件付きタグ、区間別「タグ欠測/未確認」表示、各wayの実編集時刻はない。traversabilityはengineが加工した属性で、明示的な車種通行許可の証拠ではない。has_time_restrictions=falseを規制網羅の保証にしない。
- 時刻：要求/取得時刻、ローカル出発/到着、timezoneは保持。`osm_changeset=1789328065`は元データ版の識別子としてそのまま保持し、各wayの編集時刻へ変換しない。
- 結論：genericな二輪profileの実経路と同一形状の道路属性は実証できた。日本の指定車種全区間適合は**unknownのまま**。BIKEへ採用済み経路を追加せず、#91は閉じない。

## ROUTES #25へ渡す境界案（未確定）

既存previewと保存snapshotにprovider/profile、実送信costing_options、要求出発時刻/zone、fetchedAt、geometryとhash、route/trace双方のwarningsを保持する。同一形状を確認したedgeのway_id・shape index・road_class/use/traversability・vehicle_type・部分区間割合と元データ版を供給できれば、BIKEが個別条件を評価できる。別geometryへの根拠転用は禁止。warning 208でrequested hard exclusionは適用済みにしない。日本車種の未確認を残すDTO方針を#25と調整する。

## 公式資料・公開demo利用条件

- [route API](https://valhalla.github.io/valhalla/api/route/api-reference/)：use_highwaysは選好。hard exclusionsはserver設定に依存し、利用可能でも始終点に例外がある。motorcycle/motor_scooterには日本の排気量/出力を検証したとする項目は確認できなかった。
- [map matching API](https://valhalla.github.io/valhalla/api/map-matching/)：edge_walkは同engineの既存shape向け。返る属性は原OSMタグではなく加工されたルーティング属性。osm_changesetは元データ版の識別子。
- [公式READMEのdemo案内](https://github.com/valhalla/valhalla#demo-server)：FOSSGISの公開APIはfair use/rate limit対象。エンドユーザー向けアプリから使う場合はGitHub Discussionsへの連絡と識別X-Client-Idを求めている。既定採用前の調整事項として報告する。外部投稿はしていない。

出典: Valhalla / FOSSGIS、© OpenStreetMap contributors (ODbL)。取得済みの公開応答をこの証拠へ保持した。公開demoを通常アプリへ既定接続する変更は含まない。
