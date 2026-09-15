# HEALTH｜健康データの取込・期間許可・停止と集計

<!-- task-id: HEALTH -->

初期担当枠：B。担当者：koshiro。[GitHub #23](https://github.com/rozwer/sodateru-map-production-specs/issues/23)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **HEALTH.complete**：健康取込・期間許可・停止/削除・集計。実対応データの取込から許可変更/停止/削除/再取得まで確認する。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`、`CORE.integration`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/health/`、`server/db/migrations/health/`、`docs/01_requirements/04_api/fragments/HEALTH.json`、`docs/evidence/HEALTH/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
