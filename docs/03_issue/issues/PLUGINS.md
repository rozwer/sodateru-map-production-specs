# PLUGINS｜拡張機能のカタログ・試用・導入と版管理

<!-- task-id: PLUGINS -->

初期担当枠：C。担当者：kaiya。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

定義した拡張機能を試用し、本人ごとに導入・設定・停止・更新・版戻し・削除できる。

## 実装範囲

- カタログ/作者/更新/利用情報、settingsSchema・本人領域・試用条件・導入確認を定義する。
- 適用宣言・競合判定・アイコン・更新版/旧版の保存を実装し、固有プラグインを登録する入口を提供する。

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

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/plugins/`、`server/db/migrations/plugins/`、`docs/evidence/PLUGINS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
