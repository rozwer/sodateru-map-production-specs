# ROUTES cycling 接続（実装Draft）

#87 / 親#25。既存のfactoryとHTTP操作を維持し、cyclingのみValhallaへ接続する。walking/drivingはMapbox。新DBなし。

- endpoint: `ROUTES_VALHALLA_URL`（既定 `https://valhalla1.openstreetmap.de/route`）。ローカルのコンペ/動画デモ用途。識別X-Client-Idを付与。比較は標準/距離優先の2要求を1.1秒以上離し、同じ形状は重複除去。
- input: `mode:cycling`、既存waypoints。`conditions.departAt/returnBy`は分単位UTC Unixミリ秒、指定時は`timeZone`にIANA時間帯が必要。同時指定は出発をproviderへ渡し、同じ応答の推定到着予定が帰着期限内か検査。丸めで期限を誤って満たさないよう、原秒合計と保存用秒合計の大きい方を用いる。
- output: provider=valhalla、sourceUrl、timing、providerEvidence（同一geometry hash/strategy/endpoint/attribution/warnings=[]）、条件適用結果。同一候補の採用・本人/mode/期限再照合・PLACES採用・再送は既存保存境界を使用。保存GETで再計算しない。
- warning208を含む全warning、区間欠落、境界不連続、地点順不一致、指定時刻不一致、期限超過は成功previewにしない。階段/屋根/交通/滞在/自転車の高速回避は未対応のまま。
- API: postRouteSearches/postRouteComparisons→postSavedRoutes→getSavedRoutesRouteId。別OS再取得の実HTTP検証は共通fragment生成後に実施する。

検証: 実証済みのValhalla応答をfixture再利用し、全区間/時刻/比較重複除去/共通SQLite保存再open/再送と固有失敗を検査。既存Mapboxを含め10テスト成功。外部の再呼出しは未実施。共通生成・実HTTP/E2E・独立レビューはこの初期Draftの残件で、全受入完了ではない。

ROUTES fragment v1.3.0のみ更新。共通Schema/clientはBへ生成依頼し、生成物はCで編集しない。日時は推定値・provider返却時刻は分精度。公衆向けサービスの既定採用やDiscussion投稿は行わない。公開前の連絡要請はvalhalla-probe.mdを参照。
