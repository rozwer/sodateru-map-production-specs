# INSIGHTS｜期間集計・傾向説明・根拠と本人の判断

<!-- task-id: INSIGHTS -->

初期担当枠：D。担当者：mattsun。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

期間の活動と判断可能な日から傾向を計算し、根拠と不明を示して本人の評価を保存できる。

## 実装範囲

- summary/insightsの計算・保存・評価、日別の重複回答統合/分母/欠測規則Q05を具体化する。
- analysisの説明は計算済みinsightIdを使い、根拠の再検査と訂正時の無効化を実装する。
- 比較等のinsights保存adapterを公開し、用途固有の比較計算はREFLECTIONに渡す。

## 通過条件

- 同じデータ/期間で同じ集計を返し、不明日と実際のゼロを区別する。
- 2体験の仮説を検証済み傾向にせず、反例と不足情報を根拠へ戻せる。
- 本人評価と理由が残り、元記録更新後は最新の参照状態を反映する。

## 参照と契約

[タイプ診断](../../01_requirements/03_pages/type-diagnosis/README.md)、[傾向の根拠](../../01_requirements/03_pages/trend-evidence/README.md)、[傾向の確認・訂正](../../01_requirements/03_pages/trend-review/README.md)、[活動の統計](../../01_requirements/03_pages/activity-stats/README.md)。

[16_insights.json](../../01_requirements/01_DB/16_insights.json)、[03_evidence.md](../../01_requirements/02_common/03_information/03_evidence.md)。

実装する既存operationId：`getReflectionSummary`、`getInsights`、`postInsights`、`getInsightsInsightId`、`patchInsightsInsightId`、`deleteInsightsInsightId`。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

Summaryは現在の契約どおり記録/訪問と判断可能な日を入力にする。共通読取の実効日時を使うため、GPS記録機能や健康取込全体の完了を待たない。歩数など健康由来の数値はHEALTHが返し、UI-SETTINGSで両方を確認する。

- 着手前：なし。
- 実接続・完了前：[AI](AI.md)、[INFORMATION](INFORMATION.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/insights/`、`server/db/migrations/insights/`、`docs/evidence/INSIGHTS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
