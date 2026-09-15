# BIKE #91 — 要求適用と経路結果を分けた区間評価・保存

## 実装

`RouteSnapshot.segmentEvidence` はserver専用の任意付加情報。HTTP入力は従来のpreviewId/searchIdだけを受け付ける。ROUTES担当へ [最小境界を提案](https://github.com/rozwer/sodateru-map-production-specs/issues/25#issuecomment-5674643795) 済み。共通Valhalla adapterは未提供であり、本差分はBIKE側の評価・DTO・保存を先行する。

- geometryHashとrouteFetchedAtが一致する根拠のみ評価。各edgeのway ID・方向、順序付きbegin/end shape indexが全区間を覆うことを確認する。欠落・重複・順序不整合はunknown、別形状・不正index・時刻不一致はSOURCE_CHANGED。
- `requestedExclusion` はwarning 208でignored。警告の不在だけでappliedとはしない。
- `motorwayAssessment` は返却経路の全区間の道路クラス・用途を検査する。要求適用の成否と独立してverified/ineligible/unknownを判定する。
- `highwayAssessment` は高速回避時にmotorwayと自動車専用区分の確認を要する。motorroad欠測はnullとして保持。日本の排気量・出力・時刻別通行規制は車種評価unknownで保持し、costing名で許可へ変換しない。
- 証拠全体・要求状態・被覆数・部分評価を既存assessment snapshotへ保存する。新規DB表やmigration、公開APIは追加しない。既存GET results/stateで再取得できる。BIKE fragment v1.2.0の任意resultEvaluation項目として追加した。

## 取得済み実データでの確認

入力は [valhalla-live.json](valhalla-live.json) の実motorcycle routeと同一encoded shapeのtrace_attributes。今回の追加provider呼出しは **0回**。別のMapbox経路には付けていない。

| 項目 | 結果 |
|---|---|
| 形状 | 80点・79区間、52edgeが順序どおり全区間を被覆 |
| 全edge | way ID/進行方向/道路クラス/use=roadあり |
| motorway部分検査 | verified（tertiary 26 / trunk 22 / primary 4） |
| 要求の強制除外 | ignored（warning 208保持） |
| 高速条件全体 / 車種 | unknown / unknown |
| 採用 | STATE_CONFLICTで拒否。common saveに到達しない |
| 保存・再取得 | 実SQLiteへ保存後、別OSプロセスでCOREのHTTP GETを実行。200・snapshot全項目一致 |

証拠: [segment-snapshot.json](segment-snapshot.json)。形状・全52edge・出典/取得時刻・OSM基盤version ID・profile/要求設定・BIKE設定版/hash・warningsを保存した。osm_changesetを各wayの編集時刻には変換していない。

**検証の範囲**: これは実取得済み応答の再生であり、新たな実API検索やproduction共通Valhalla接続ではない。ROUTES preview/installationは明示したharness境界。書込時は元の取得時刻直後へ時計を固定し、元の有効期間で評価・unknown採用拒否を検証した。再取得は実際の現在時刻で別プロセスから行い、元のfetchedAt/expiresAtを変更していない。共通候補・経路の現在有効なpreviewを発行したという主張はしない。HTTPは現行COREとBIKE固有fragmentの一時合成で、共通production生成反映は別担当。

## 再現・限定検証

```sh
mise exec -- node --experimental-transform-types --test server/plugins/bike/bike.test.ts server/plugins/bike/segment-evidence.test.ts
mise exec -- node --experimental-transform-types server/plugins/bike/segment-snapshot.e2e.ts
mise exec -- node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --allowImportingTsExtensions server/plugins/bike/register.ts server/plugins/bike/segment-snapshot.e2e.ts server/plugins/bike/segment-evidence.test.ts
```

8テストPASS、実SQLite/別プロセスHTTP再取得PASS、strict型検査PASS。境界テストの全条件verified例はfixtureと明示し、実適合経路の成功証拠に含めない。

## 未完了

- ROUTESの正式Valhalla preview/保存provider境界と共通生成契約。
- 日本の自動車専用道路区分、排気量/出力・方向/時間規制の全区間の根拠。実適合経路の採用成功。
- 公開demoの一般公開アプリ向け連絡条件は従前の [限定実証記録](valhalla.md) のとおり。既定採用・外部投稿はしていない。

#91および親#29は未完了のまま保持する。
