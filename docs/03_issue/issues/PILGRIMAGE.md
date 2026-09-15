# PILGRIMAGE｜作品と地点の対応・聖地巡りの計画

<!-- task-id: PILGRIMAGE -->

初期担当枠：C。担当者：kaiya。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

作品と地域から出典付きの場所を探し、巡る順序と経路を保存して地図で使える。

## 実装範囲

- 作品/地点/説明/出典の固有Schemaと取得元、対象地域・地点順・設定保存を実装する。
- 計画の固有AI処理と共通経路を使い、採用結果・更新・無効化を扱う。

## 通過条件

- 実在する作品と地点の対応を出典へ戻し、不明な関連を確定事実にしない。
- 選んだ地点順が道路経路と保存結果に一致し、再取得できる。
- プラグイン無効化で表示だけが消え、本人記録と保存場所が残る。

## 参照と契約

[README.md](../../01_requirements/02_common/02_places-routes/README.md)、[README.md](../../01_requirements/02_common/03_information/README.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[PLUGINS](PLUGINS.md)、[ROUTES](ROUTES.md)、[AI](AI.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/plugins/pilgrimage/`、`server/db/migrations/pilgrimage/`、`docs/evidence/PILGRIMAGE/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
