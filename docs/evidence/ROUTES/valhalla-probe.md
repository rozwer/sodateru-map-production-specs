# Valhalla公開demoの少数実証（ROUTES #87）

2026-09-15。製品接続・保存完了の証拠ではない。公開demoへのPOSTは固定3地点で3件、直列・間隔1.5秒・各20秒timeout・再試行なし。識別header `X-Client-Id: sodateru-map-production-specs-routes-25-probe` を付与。自前サーバー/DBは追加していない。

## 結果

東京駅周辺 `[139.767125,35.681236] → [139.769,35.682] → [139.771,35.684]`、各地点break、2区間。

| 要求 | 実応答 | 判断 |
|---|---|---|
| bicycle、2026-09-16 10:00出発 | HTTP200、1621m / 410.879秒、Asia/Tokyo、地点時刻10:00→10:05→10:07、warningなし | 自転車と出発時刻のprovider応答は成立 |
| bicycle、同日10:30到着 | HTTP200、同距離/時間/geometry、地点時刻10:23→10:28→10:30、warningなし | 到着指定のprovider応答は成立 |
| motor_scooter、exclude_highways=true/use_highways=0 | HTTP200、1612m / 435.778秒、warning208「Hard exclusions are not allowed on this server, ignoring hard excludes」 | 強制除外は無視。高速禁止を満たす成功として採用不可 |

地点original_indexと座標、区間数、polyline6の復号・境界連続性、距離/時間合計、指定端点時刻、timezoneを取得済みJSONから確認。自転車2応答の結合geometry SHA-256は `3ae3cdfa70afb9b2df4675e2eee4cdd2bb3be4518203ab1d02d2e0784e90a9b0`。raw shapeのhashも元証拠に保持。道路形状とwarningを別リクエストから混合しない。

`valhalla-probe.json`は実要求/応答、`valhalla-analysis.json`はオフライン検査と結合geometry。返却地点時刻は分単位で、秒精度の到着保証ではない。今回はhas_time_restrictions=falseの短距離例であり、時間帯通行規制/滞在/同時の出発・帰着制約は未検証。motor_scooterは日本の車種・排気量の適格性を証明しない。

## 未達と次の小さな実装単位

- 第一候補は明示的に設定したValhalla endpointを使うcycling adapter。Mapboxの既存walking/drivingを維持する。
- 現在の共通DTOはproviderがmapbox-directions固定。製品公開前にprovider識別、出典/取得時刻、時刻指定とtimezone、warningsの契約をROUTES fragmentで追加し共通Schema担当と調整する。ValhallaをMapboxと偽って返さない。
- 後続は同一context/地点順/本人・mode・期限照合、全区間失敗処理、秒の丸め、共通保存/再起動再取得。今回の試行はこの実装や正式exportを追加していない。
- 階段のstep_penaltyは選好であり禁止保証ではない。屋根の全区間根拠は未取得。今回の公開demoではhard highway exclusionsも成立しない。これらを適用済みにしない。

## 利用条件の確認と採用判断

[公式READMEのDemo Server](https://github.com/valhalla/valhalla#demo-server)はFOSSGISの全世界公開demoとfair usage/rate limitを案内し、エンドユーザー向けアプリから使う場合はGitHub Discussionsへの連絡と識別X-Client-Idを求めている。今回の少数実証にとどめ、外部投稿は行っていない。一般公開アプリの既定providerへの採用は、この連絡と提供形態の判断を済ませるまで保留。現APIはMapboxのまま。

[API仕様](https://valhalla.github.io/valhalla/api/route/api-reference/)ではdate_timeは端点のlocal time、hard exclusionsはserver許可が必要で、許可されなければwarningと無視になる。許可されても始終点の例外があるため、warning不在だけで道路禁止を検証済みにしない。OSM出典・データ利用条件も公開時に維持する。

再解析（外部通信なし）:

```sh
mise exec -- node docs/evidence/ROUTES/valhalla-analyze.mjs
```

再取得が必要なときだけ `mise exec -- node docs/evidence/ROUTES/valhalla-probe.mjs`。成功済み3件を一律再実行しない。#87/#25は未完了。
