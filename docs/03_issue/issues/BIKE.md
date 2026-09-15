# BIKE｜バイク向け地点・車種条件とルート

<!-- task-id: BIKE -->

初期担当枠：C。担当者：kaiya。[GitHub #29](https://github.com/rozwer/sodateru-map-production-specs/issues/29)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

車種と高速道路条件に合う候補と根拠を調べ、導入した地図で経路を使える。

## 実装範囲

- 車種/地域/高速利用の固有Schema・地点/道路データの取得元・出典/更新時刻を追加する。
- drivingの共通経路に車種条件を評価し、設定と採用結果を保存する。

## 通過条件

- 模擬試用と実検索を区別し、実データで車種/高速条件の評価根拠を返す。
- 未確認道路を走行可能と断定せず、通行条件を満たさない経路を採用済みにしない。
- 設定/結果を再取得し、停止後に共通地図から該当表示だけが消える。

## 参照と契約

[README.md](../../01_requirements/02_common/02_places-routes/README.md)、[README.md](../../01_requirements/02_common/03_information/README.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[PLUGINS](PLUGINS.md)、[ROUTES](ROUTES.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **BIKE.complete**：車種/高速条件付き地点と経路。固有条件が実データと実経路に作用し、停止時に該当表示だけ外れる。

### 接続に必要な提供物

- [PLUGINS](PLUGINS.md)：`PLUGINS.state`。
- [ROUTES](ROUTES.md)：`ROUTES.basic`、`ROUTES.conditions`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/plugins/bike/`、`server/db/migrations/bike/`、`docs/01_requirements/04_api/fragments/BIKE.json`、`docs/evidence/BIKE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
