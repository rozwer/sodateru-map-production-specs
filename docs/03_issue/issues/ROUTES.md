# ROUTES｜経路計算・条件比較・保存と案内状態

<!-- task-id: ROUTES -->

初期担当枠：C。担当者：kaiya。[GitHub #25](https://github.com/rozwer/sodateru-map-production-specs/issues/25)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **ROUTES.basic**：基本道路経路の取得・保存・再取得。まずwalking/drivingの全行程を実providerで取得し、形状/地点順/距離/時間/取得時刻を保存・再起動後再取得する。区間失敗を全行程成功にしない。
- **ROUTES.navigation**：案内状態・ターン案内・復帰。同じ保存経路で開始/進行/終了と画面復帰ができる。
- **ROUTES.conditions**：追加経路条件・交通・定期券。階段/屋根/出発帰着/交通/運賃/定期券の全要求を実取得根拠付きで確認。未対応の条件を適用済みにしない。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`。
- [PLACES](PLACES.md)：`PLACES.search`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

基本経路の取得・保存・再取得を最初の統合単位として、rozwerのUI-ROUTESとmattsunのEXPLORATION/SUGGESTIONS/TRANSFERへ渡す。案内、追加条件、交通・定期券は同じIssueで続ける。条件契約の共通部分を先に固定し、後から基本経路の入出力を作り直さない。未対応条件を無視した成功応答は返さない。

## 編集範囲

提案path：`server/features/routes/`、`server/db/migrations/routes/`、`docs/01_requirements/04_api/fragments/ROUTES.json`、`docs/evidence/ROUTES/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
