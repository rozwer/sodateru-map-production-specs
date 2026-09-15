# ROUTES 提供と証拠

Issue #25 / branch `kaiya/25-routes`。基本経路・案内状態・全行程比較の部分提供。追加交通条件は未完了。

## 実APIで確認済み

`http-smoke.json`（2026-09-15T02:42:09Z）は正式 `server/app/main.ts` を2つのOSプロセスで起動し、共通client→本人session→実Mapbox→共通SQLiteを通した結果。

- live: walking/drivingの3地点・全2区間を保存。demo:同じIDのwalkingを別DBに保存。
- `status=navigating,currentLeg=1,version=2` へ更新後、プロセス停止・再起動・GETで全snapshot一致。地点順/名前/placeId/形状/区間形状/距離/秒/取得時刻/steps/案内状態を比較。
- 同じ検索キーの再送は同じpreview。保存再送はメモリpreview喪失後も現在の保存行と案内状態を返す。
- 実2区間目の遠距離入力をMapboxが拒否したとき、PROVIDER_UNAVAILABLEで失敗し、保存一覧は増えない。実応答はNoRouteではなくprovider入力制限拒否。NoRoute/429は後述の障害注入テスト。
- 実テストに使った依存: CORE提出`fb767fe`/develop統合`413598b`、PLACES統合`97f4d1a`。共通基盤のコピーは使用していない。

再現:

```sh
mise exec -- env ROUTES_ENV_FILE=/path/to/configured/.env node --experimental-transform-types docs/evidence/ROUTES/http-smoke.ts
```

専用の一時live/demo DBと本人設定を作り、終了時に片付ける。既存利用者DBを使わない。トークン値/URL/cookieは証拠へ保存しない。

## 必要範囲の検証

```sh
mise exec -- node --experimental-transform-types --test server/features/routes/mapbox.test.ts server/features/routes/persistence.test.ts
```

7件成功。2区間結合/距離保持/区間ごとの秒丸め、2区間目NoRoute・429・不正JSON・境界不一致、取消、未対応条件の拒否、失敗時DB書込なし、比較の重複除去、motorway違反拒否、正式CORE SQLiteで再起動/再送/版競合/共有取消/削除後再送を確認。

`persistence.test.ts`だけは取得済みprovider結果をfixtureとして再生。DB/migration/transactionは正式CORE。fixtureテストを実provider接続の証拠とは扱わない。

- `live-provider.json`: 実walking 798.634m/671秒/steps11+8、実driving 1617.807m/459秒/steps10+3。
- `live-comparison.json`: 同じ地点順の実2候補。1617.807m/459秒、1645.75m/516秒。全2区間、形状重複なし。
- `live-motorway-avoidance.json`: 全2区間にexclude=motorwayを送信しprovider違反通知/道路分類を検査した実取得。要求条件と根拠を保存snapshotへ保持。
- 全体typecheckのROUTES由来指摘は解消。PLACESのINFORMATION未統合importと添字型の指摘を#5へ報告済み。全体成功とはしていない。

## 公開口

`server/features/routes/index.ts`:

- `createRoutesService(db)`：COREのmode別DatabaseSyncを受ける。
- `service.previewRoute(context,input) -> Promise<RoutePreview>`。HTTPではpreviewId→resultId。
- `service.compareRoutes(context,input) -> Promise<RoutePreview[]>`：最大3件の全行程、同じprovider応答を各候補で利用。
- `service.revalidatePreview(context,previewId,forSave?) -> RoutePreview`：本人/mode/期限/場所版。
- `service.saveRoute(context,{id,previewId,title}) -> {data:SavedRoute,created:boolean}`。
- `service.getSavedRoute(context,id,own=false) -> SavedRoute`。別機能の採用存在確認ではown=true。
- `savedRouteDto(row)`は現在の閲覧権限確認後に使う純粋変換。`dto.ts`から直接import可。

HTTP登録は`register.ts`。既存6operationと追加`POST /route-comparisons`。作成はCOREの永続受付を使用し、保存receiptのresourceは現在資源へ再照会。検索受付は実行IDだけ永続化し、providerの一時結果をDBへ保存しない。再起動でpreviewが失われた検索再送は410となり、新しい検索を要求する。

保存は本人・mode別DB・route-save・保存idで照合。previewId/titleのhash一致は期限より先に現在行を返し、異入力409、削除後404。PLACES候補の採用は同じCORE transaction内で行い、temporaryを拒否する。保存前/計算後に地点の版・候補期限を確認する。

DBのwaypoints_jsonに名前も保持し、route_jsonにmode/各区間geometry/stepsと条件評価を保持。再取得で外部の地点名や経路を再計算しない。取得済みの基底列で表現できるため追加DDLは不要。

## 未達

- PLACES候補検索→候補解決→場所採用→経路保存の実HTTP一連確認はPLACES HTTP登録の提供待ち。pointによるROUTES.basicの実HTTPは成功。
- ROUTES fragment v1.2.0の共通Schema/client反映、比較と高速回避のHTTP入力確認は未完了。provider/固有serviceは実装済み。
- 階段/屋根/公共交通/出発帰着/運賃/定期券の実取得は、交通API契約なしとのユーザー回答により未達。未対応条件は501で拒否し適用済みと表示しない。Q07不足をfragmentへ具体化済み。
- UIとの画面接続、短い独立レビュー、PR統合は後続。部分提供のためIssueを閉じずtask:finishしない。

[Mapbox Directions公式仕様](https://docs.mapbox.com/api/navigation/directions/)に従い、同一応答stepsを形状に束縛。motorwayはbest-effort除外のため違反通知と道路分類を確認し、違反を含む経路は採用用previewにしない。
