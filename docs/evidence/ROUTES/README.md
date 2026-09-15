# ROUTES 実装・確認状況

## 対象

Issue #25、branch `kaiya/25-routes`。取得範囲は `server/features/routes/`、`server/db/migrations/routes/`、本fragment、本証拠ディレクトリ。

## 確認済み

- `mise exec -- node --experimental-transform-types --test server/features/routes/mapbox.test.ts`：4件成功。2区間結合、距離と区間ごとの秒丸め、2区間目NoRoute/429/不正JSON/境界不一致、取消、未対応条件の拒否、失敗時のDB書込なし。
- `ROUTES_ENV_FILE` に設定済み環境ファイルを渡して `live-provider.ts` を実行。実Mapbox Directionsで東京の3地点をwalking/driving各2区間取得。
- walking: 798.634m / 671秒 / steps 11+8。driving: 1617.807m / 459秒 / steps 10+3。
- `live-provider.json` は実取得結果。アクセストークン・リクエストURLは保存しない。
- [Mapbox公式仕様](https://docs.mapbox.com/api/navigation/directions/)を確認。同一応答のstepsを形状と一緒に保存する契約。

## 公開口（実装中・統合前）

`server/features/routes/index.ts` の `createRoutesService(db)` を登録入口とする。serviceの `previewRoute(context,input)`、`revalidatePreview(context,previewId,forSave?)`、`saveRoute(context,{id,previewId,title}) -> {data,created}` を他機能へ提供する。HTTPはpreviewIdをresultIdへ変換。

保存の再送は本人・mode別DB・route-save・保存idで照合し、previewId/titleのhashを保持。同入力は期限確認より先に現在の保存行を返し、異入力は409、削除後は404。プレビューは本人/mode/DB別の15分メモリ保持、再起動後に期限切れとして再検索。保存済み経路はSQLiteのsnapshotから返す。

## 未確認・残件

- CORE.runtime/integration未統合につき、共通HTTP登録と共通SQLiteによる保存・再起動・再取得はまだ未確認。実APIの完了証拠ではない。
- PLACES公開口は先行commit `80cf955` に接続する。統合後の実検索→地点採用→経路保存は未確認。
- CRUD/案内状態の業務処理は実装済み、DB/HTTP接続テスト前。
- 階段/屋根/交通/出発帰着/定期券条件の取得根拠、比較候補、交通ID検証・運賃は残件。未対応条件を黙って外した成功は返さず、Issueは未完了のまま維持する。
- 共通Schema/API生成器反映と短い独立レビューはこれから。
