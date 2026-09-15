# ACTIVITY｜訪問確認・位置観測・日別軌跡と成長

<!-- task-id: ACTIVITY -->

初期担当枠：B。担当者：koshiro。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/activity/`、`server/db/migrations/activity/`、`docs/evidence/ACTIVITY/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
