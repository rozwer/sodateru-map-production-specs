# ACTIVITY｜訪問確認・位置観測・日別軌跡と成長

<!-- task-id: ACTIVITY -->

初期担当枠：B。担当者：koshiro。[GitHub #21](https://github.com/rozwer/sodateru-map-production-specs/issues/21)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

観測と本人確認を分けて保存し、訪問・用途に応じた軌跡と成長材料を返せる。

## 実装範囲

- visitsとtrack_pointsの取得/作成/確認/訂正/取消/削除、日付境界と日別振り返りを実装する。
- 成長段階・用途外観の算出規則を画面要件へ対応させ、訂正/削除時の再計算と提案達成連携を定める。

## 通過条件

- 近接・検索・しおりで訪問を確定せず、confirmedだけを回数/成長へ含める。
- 日付/タイムゾーン/不明日時を変え、軌跡と記録の実効日時を照合する。
- 用途訂正・訪問取消・範囲削除後も文章は規約どおり残り、成長材料が再取得で更新される。

## 参照と契約

[訪問の確認](../../01_requirements/03_pages/visit-confirm/README.md)、[今日の軌跡](../../01_requirements/03_pages/daily-track/README.md)、[体験で地図が育った](../../01_requirements/03_pages/growth-result/README.md)、[わたしの地図](../../01_requirements/03_pages/personal-map/README.md)。

[15_visits.json](../../01_requirements/01_DB/15_visits.json)、[09_track_points.json](../../01_requirements/01_DB/09_track_points.json)、[04_state-transitions.md](../../01_requirements/04_api/conventions/04_state-transitions.md)。

実装する既存operationId：`getMapGrowth`、`getVisits`、`postVisits`、`getVisitsVisitId`、`patchVisitsVisitId`、`deleteVisitsVisitId`、`getTrackPoints`、`postTrackPoints`、`getTrackPointsPointId`、`postTrackPointsDeleteRange`、`getReflectionDaysDate`。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)、[RECORDS](RECORDS.md)、[INFORMATION](INFORMATION.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **ACTIVITY.growth**：訪問確認・訂正・地図の成長材料。候補閲覧では訪問を増やさず、確認/取消と用途訂正を成長材料に反映する。
- **ACTIVITY.track**：位置観測・日別軌跡・範囲削除。日付境界・観測と確定訪問の違いを保ち、再起動後に軌跡を再取得する。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`、`CORE.integration`。
- [RECORDS](RECORDS.md)：`RECORDS.save`、`RECORDS.media`、`RECORDS.lifecycle`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`、`INFORMATION.sharing`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/activity/`、`server/db/migrations/activity/`、`docs/01_requirements/04_api/fragments/ACTIVITY.json`、`docs/evidence/ACTIVITY/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
