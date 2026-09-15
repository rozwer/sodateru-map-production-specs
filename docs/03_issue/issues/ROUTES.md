# ROUTES｜経路計算・条件比較・保存と案内状態

<!-- task-id: ROUTES -->

初期担当枠：C。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

指定した地点順・移動条件から道順を取得し、選んだ全行程を保存・再表示できる。

## 実装範囲

- 道路経路、複数候補、出発/帰着・階段/屋根条件、ターン案内、案内状態と再送を実装する。
- 定期券の路線/駅ID・有効期間・運賃/交通対応範囲を契約化する。現在501の手段と画面要求の差を解消対象に残す。

## 通過条件

- 保存した形状/地点順/距離/時間/取得時刻が再起動後も同じ。
- 2区間目失敗・429・NoRouteを全行程成功として保存しない。
- 階段/屋根/交通条件は取得根拠を示し、未対応を適用済みにしない。要求する対応が残ればIssueは未完了。

## 参照と契約

[経路の条件](../../01_requirements/03_pages/route-conditions/README.md)、[経路の候補](../../01_requirements/03_pages/route-results/README.md)、[徒歩ナビゲーション](../../01_requirements/03_pages/route-navigation/README.md)、[友達のおすすめルート](../../01_requirements/03_pages/shared-route/README.md)。

[02_routes.md](../../01_requirements/02_common/02_places-routes/02_routes.md)、[06_saved_routes.json](../../01_requirements/01_DB/06_saved_routes.json)、[10_transit_passes.json](../../01_requirements/01_DB/10_transit_passes.json)。

実装する既存operationId：`postRouteSearches`、`getSavedRoutes`、`postSavedRoutes`、`getSavedRoutesRouteId`、`patchSavedRoutesRouteId`、`deleteSavedRoutesRouteId`、`getTransitPasses`、`postTransitPasses`、`getTransitPassesPassId`、`patchTransitPassesPassId`、`deleteTransitPassesPassId`。

契約補完の担当：`route`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)、[PLACES](PLACES.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/routes/`、`server/db/migrations/routes/`、`docs/evidence/ROUTES/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
