# PLUGINS｜拡張機能のカタログ・試用・導入と版管理

<!-- task-id: PLUGINS -->

初期担当枠：C。担当者：kaiya。[GitHub #28](https://github.com/rozwer/sodateru-map-production-specs/issues/28)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

定義した拡張機能を試用し、本人ごとに導入・設定・停止・更新・版戻し・削除できる。

## 実装範囲

- カタログ/作者/更新/利用情報、settingsSchema・本人領域・試用条件・導入確認を定義する。
- 適用宣言・競合判定・アイコン・更新版/旧版の保存を実装し、固有プラグインを登録する入口を提供する。

MAP-CUSTOMへ、本人/モード別の導入状態・版・enabled・競合解決後の適用宣言の読取を先行提供する。地図設定の保存はMAP-CUSTOMが持ち、導入/有効状態の変更は本Issueだけが持つ。停止操作は地図設定や体験を削除しない。

## 通過条件

- 試用が導入済み設定を変更せず、確認後の導入だけが保存される。
- 同対象の異なる宣言だけを競合とし、選んだ解決結果を再取得できる。
- 更新失敗時は旧版を保持し、停止/削除で本人の体験や保存場所を消さない。

## 参照と契約

[拡張機能を探す](../../01_requirements/03_pages/plugin-store/README.md)、[拡張機能の詳細](../../01_requirements/03_pages/plugin-detail/README.md)、[拡張機能を試す](../../01_requirements/03_pages/plugin-trial/README.md)、[導入前の確認](../../01_requirements/03_pages/plugin-install/README.md)、[導入済みの機能](../../01_requirements/03_pages/plugin-manage/README.md)、[機能の更新](../../01_requirements/03_pages/plugin-update/README.md)、[変更が重なる場合](../../01_requirements/03_pages/plugin-conflict/README.md)。

[07_plugin_settings.json](../../01_requirements/01_DB/07_plugin_settings.json)、[07_plugins.md](../../01_requirements/04_api/endpoints/07_plugins.md)。

実装する既存operationId：`getPlugins`、`getPluginSettings`、`postPluginSettings`、`getPluginSettingsPluginId`、`patchPluginSettingsPluginId`、`deletePluginSettingsPluginId`。

契約補完の担当：`plugin-version`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **PLUGINS.state**：本人別の導入・有効状態・版・適用宣言。本人/モードの有効状態を再取得でき、停止/削除で保存設定と体験データを壊さず対象の適用だけ止める。
- **PLUGINS.lifecycle**：試用・導入・更新・競合解決・版戻し。試用と導入を分離し、更新失敗時の旧版保持と競合解決結果を確認する。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`、`CORE.integration`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/plugins/`、`server/db/migrations/plugins/`、`docs/01_requirements/04_api/fragments/PLUGINS.json`、`docs/evidence/PLUGINS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
