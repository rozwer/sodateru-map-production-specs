# ROUTES cycling 接続（実装Draft）

#87 / 親#25。既存のfactoryとHTTP操作を維持し、cyclingのみValhallaへ接続する。walking/drivingはMapbox。新DBなし。

- endpoint: `ROUTES_VALHALLA_URL`（既定 `https://valhalla1.openstreetmap.de/route`）。ローカルのコンペ/動画デモ用途。識別X-Client-Idを付与。比較は標準/距離優先の2要求を1.1秒以上離し、同じ形状は重複除去。
- input: `mode:cycling`、既存waypoints。`conditions.departAt/returnBy`は分単位UTC Unixミリ秒、指定時は`timeZone`にIANA時間帯が必要。同時指定は出発をproviderへ渡し、同じ応答の推定到着予定が帰着期限内か検査。丸めで期限を誤って満たさないよう、原秒合計と保存用秒合計の大きい方を用いる。
- output: provider=valhalla、sourceUrl、timing、providerEvidence（同一geometry hash/strategy/endpoint/attribution/warnings=[]）、条件適用結果。同一候補の採用・本人/mode/期限再照合・PLACES採用・再送は既存保存境界を使用。保存GETで再計算しない。
- warning208を含む全warning、区間欠落、境界不連続、地点順不一致、指定時刻不一致、期限超過は成功previewにしない。階段/屋根/交通/滞在/自転車の高速回避は未対応のまま。
- API: postRouteSearches/postRouteComparisons→postSavedRoutes→getSavedRoutesRouteId。実COREで比較/保存/別OS再取得まで確認済み。通常起動用の共通生成はBの反映待ち。

初期検証: 実証済みのValhalla応答をfixture再利用し、全区間/時刻/比較重複除去/共通SQLite保存再open/再送と固有失敗を検査。既存Mapboxを含め10テスト成功。この10検査は外部再呼出しなし。下記の新動作E2Eを追補した。共通生成・通常main起動・独立レビューは残件で、全受入完了ではない。

ROUTES fragment v1.3.0のみ更新。共通Schema/clientはBへ生成依頼し、生成物はCで編集しない。日時は推定値・provider返却時刻は分精度。公衆向けサービスの既定採用やDiscussion投稿は行わない。公開前の連絡要請はvalhalla-probe.mdを参照。

## 新動作の実HTTP証拠

`cycling-http.json` / `cycling-provider-responses.json`。実CORE `createApp` / 全 `loadFeatures` / 共通session・SQLite・既存clientへ接続。Bの生成待ちのため、固有fragmentは共通の正式`merge_fragments`で一時JSONへ合成して渡した。共通基盤のコピーはなく、生成物の完成扱いもしない。

- 実Nominatim候補 → 自転車の全2区間 → 標準/距離優先の全行程2案 → 同じ候補を再照合して地点採用＋経路保存 → navigating/currentLeg=1 → 別OSプロセス再起動 → 保存GET/再送の全snapshot一致。
- 標準は1588m/404秒、距離優先は1562m/418秒（時間は区間の整数秒合計）。出発10:00・期限10:30 Asia/Tokyo。同一geometryと条件評価・取得時刻の対応を保存。
- 到着10:30のみの指定でも、保存・別OS再取得が一致。別本人/live-demoの候補流用と階段条件を拒否し、業務行の増加なし。
- 成功実行はNominatim1回/Valhalla4回。先行失敗1回は座標精度照合で拒否、保存なし。公開provider要求は直列・比較間1.1秒/操作間1.2秒以上、識別header付き。大量取得なし。
- 検索候補の元座標は小数7桁以上あり、Valhallaのlocation返却小数6桁との厳密一致で最初の実HTTPが失敗。送信/照合だけ明示的に6桁へ丸め、元座標はwaypointsに保持する修正で成功。高精度座標回帰検査も成功。
- 比較応答と2件の保存DTOを実応答のまま正式合成Schemaへ照合し成功。

再現（少数外部要求が生じるため、成功済み確認の反復は不要）:

```sh
mise exec -- python docs/evidence/ROUTES/compose-cycling-contract.py /tmp/routes-cycling-contract.json
mise exec -- env ROUTES_COMPOSED_CONTRACT=/tmp/routes-cycling-contract.json node --experimental-transform-types docs/evidence/ROUTES/cycling-http.ts
```

Bの共通生成反映後は`ROUTES_COMPOSED_CONTRACT`なしで同scriptが通常`server/app/main.ts`を使う。既存の実応答を使う接続確認で差分を検証し、成功済み外部要求を一律再実行しない。
