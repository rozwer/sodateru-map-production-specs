# 保存設定から正式二輪経路へのHTTP配線

## 実装

`POST /bike/route-previews`（BIKE fragment 1.3.0）は、導入済み1.1.0の解決済み `feature:bike:segment-evidence` 宣言と本人の保存設定から、ROUTES #265 の `createMotorbikeRoutesService` を呼ぶ。入力はtitle（最大100文字）、順序付きwaypoints、departAt（UTCミリ秒・分単位）、timeZone、任意returnBy。profileや根拠をHTTP入力から受けない。

mopedはmotor_scooter / topSpeed=30、他車種はmotorcycle。高速回避はuseHighways=0 / avoidMotorways=true、許容はuseHighways=0.5。これはproviderの計算パラメータであり、日本の排気量・法定速度・通行適格性を保証しない。結果の同一形状、profile、設定地域を照合し、取得前後と同一キー再送時にinstallId/設定版/設定hash・有効状態を確認する。

返却previewIdを既存 `/bike/route-assessments` へ渡して評価を保存する。要求ignoredと同形状motorway不在verifiedを区別し、日本の車種/自動車専用道路条件はunknownを保持、BIKE採用を拒否する。旧1.0.0とrollback後は新規二輪previewを拒否するが、共通候補/採用と保存済み評価GETは#266のまま保持する。

同一キーの処理中は409、完了時は現在の設定と共通preview期限を再照合して同一結果を返す。再起動で一時previewを失った場合は410とし、新しいキーで取得し直す。停止後も保存済みassessmentはGETできる。

## 検証

`motorbike-http.ts` を実行し、`motorbike-http.json` の10項目を確認した。実CORE HTTP、正式PLUGINS registry/設定HTTP、正式ROUTES二輪factory、BIKE、実SQLiteを使用。プロバイダは取得済み実Valhalla応答をlocalhost HTTPから返す明示的な再生fixture。道路検索のseedもfixture。外部API追加取得は0回、localhostはmotorcycleとmotor_scooter各route/traceの4回。実providerの再確認を意味しない。

- 旧1.0.0では新previewだけを拒否、1.1.0でmotorcycle/scooterを保存設定から選択。
- 任意profile入力を422拒否、同一キー再送はproviderを再度呼ばない。
- 設定変更・停止後の再送は409。保存済みassessment GETは全snapshot一致。
- 同一形状52edgeのSQLite保存、要求208 ignored / motorway部分評価verified / 車種unknownと採用409を確認。
- strict TypeScript検査PASS（ESNext / bundler / esModuleInterop）。NodeNext指定は既存AJVの型解決で失敗するため、本リポジトリと同じbundler解決を使用した。

検証はdevelop `f78e77bccf2b19dc9b0e7579b0729eb46e05a6e7` の一時コピーにBIKE差分だけを重ねた。ROUTES #265統合 `e12cfcaa829a384216e444567e891ef3ecc55eb3` とBIKE #266統合 `5126fac4dbcee54670769ee8abab3a2886fdbd06` を含む。元worktreeの未選択差分を復旧/破棄していない。

再現: 統合依存とnode_modulesがある環境で `mise exec -- node --experimental-transform-types docs/evidence/BIKE/motorbike-http.ts`。契約は既存CORE契約に固有fragmentを一時合成するため、通常生成済み契約/clientを検証したとは扱わない。今回の新テストは同一プロセスで行い、別OS復元の既存証拠は#265/#266に分離する。

## 残件

共通生成/clientはroot保留中、通常production HTTPとUI接続は#90へ継続。全区間の日本車種/時間規制・自動車専用道路根拠と実適合採用は#91へ継続し、親#29は未完了。公開demoを一般公開アプリの既定providerに採用するための利用条件調整も未完了。
