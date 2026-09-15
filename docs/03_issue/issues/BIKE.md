# BIKE｜バイク向け地点・車種条件とルート

<!-- task-id: BIKE -->

初期担当枠：C。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/plugins/bike/`、`server/db/migrations/bike/`、`docs/evidence/BIKE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
