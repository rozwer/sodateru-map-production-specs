# 通常HTTPの乗継接続

既存GTFS loaderと#268の探索をそのまま使用。通常factoryの実乗り場2点のtransit検索を乗継探索へ接続し、3点以上の直通は従来providerを維持。別乗り場徒歩・初終端道路徒歩は未接続として拒否し、座標の近さで同じ乗り場と扱わない。shape/運賃が未確認のpartial候補を保存可能候補にはしない。

scope=bus_transfersは各便の既存直通根拠segmentsを保持する。全体の待機時間は初回待ちと乗継待ちを含む。便shapeは既存の停留所射影推定で、接合は道路徒歩の根拠にはしない。

検証: ROUTES_TEST_TRANSFERS=1 の transit-http.test.ts が通常HTTP検索/比較→2便420円保存→新OSプロセスGET/同key再送一致PASS。実feed版20260927_030901。transfer-http.json。型検査、既存contracts:build/check（214 operations/314 schemas/1179 examples）PASS。生成出力は公式add-lock後に既存生成器のみで更新。#138への変更連絡: comment5854728269。

残件: 任意地点の道路徒歩、3点以上の乗継、鉄道/定期券、階段/屋根等。#25/#88全体は未完了。
