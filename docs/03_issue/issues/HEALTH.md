# HEALTH｜健康データの取込・期間許可・停止と集計

<!-- task-id: HEALTH -->

初期担当枠：B。担当者：koshiro。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

本人が許可した項目と期間の健康データを取り込み、取得元付きで読み直し、停止・削除できる。

## 実装範囲

- XML取込、重複防止、取込履歴、権限/期間/用途、停止と保存分削除、歩数等の集計API/保存を追加する。
- 対応iPhoneアプリ経由の接続先・受信契約を確定する。新規iOSアプリ開発が必要と判明した場合は残件として明記し、このIssueを完了扱いしない。

## 通過条件

- 実XMLの範囲外データを除外し、同じファイル再取込で件数が増えない。
- 項目・取得元・欠測・時刻を再取得でき、歩数をGPS距離から生成しない。
- 取込停止と既存データ削除を別々に確認し、再起動後も状態が一致する。

## 参照と契約

[健康データの連携](../../01_requirements/03_pages/health-connect/README.md)、[健康データの項目と期間](../../01_requirements/03_pages/health-permissions/README.md)、[健康データの連携状態](../../01_requirements/03_pages/health-status/README.md)、[活動の統計](../../01_requirements/03_pages/activity-stats/README.md)、[データの取得元](../../01_requirements/03_pages/data-sources/README.md)。

[requirements.md](../../01_requirements/03_pages/health-connect/requirements.md)、[requirements.md](../../01_requirements/03_pages/data-sources/requirements.md)。

契約補完の担当：`health`、`health-import`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/health/`、`server/db/migrations/health/`、`docs/evidence/HEALTH/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
