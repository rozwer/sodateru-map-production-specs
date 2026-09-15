# SUGGESTIONS｜今日の希望・候補生成・選択と達成

<!-- task-id: SUGGESTIONS -->

初期担当枠：D。担当者：mattsun。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

今日の状態と希望から理由付き候補を作り、選択/保留/見送り/達成を保存できる。

## 実装範囲

- self_checkinsとsuggestions、同行者/負担/移動手段/120分以上の条件、順位・期限・滞在時間を具体化する。
- 共通場所/経路/根拠と本人設定を使い、選択→confirmed訪問→達成/取消をつなぐ。

## 通過条件

- 回答だけの保存・未回答利用・同日訂正を区別し、構造化条件が候補へ反映される。
- 移動+滞在が予算に収まることと、適合理由・根拠時点を返す。
- 再送/期限切れ/訪問取消を検証し、提案停止対象が再提示されない。

## 参照と契約

[今日はどう過ごしたい？](../../01_requirements/03_pages/self-checkin/README.md)、[提案候補一覧](../../01_requirements/03_pages/suggestions/README.md)、[提案候補の詳細](../../01_requirements/03_pages/suggestion-detail/README.md)。

[11_self_checkins.json](../../01_requirements/01_DB/11_self_checkins.json)、[12_suggestions.json](../../01_requirements/01_DB/12_suggestions.json)、[04_state-transitions.md](../../01_requirements/04_api/conventions/04_state-transitions.md)。

実装する既存operationId：`getSelfCheckins`、`postSelfCheckins`、`getSelfCheckinsCheckinId`、`patchSelfCheckinsCheckinId`、`deleteSelfCheckinsCheckinId`、`postSuggestionBatches`、`getSuggestions`、`getSuggestionsSuggestionId`、`patchSuggestionsSuggestionId`。

契約補完の担当：`checkin`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[AI](AI.md)、[PLACES](PLACES.md)、[ROUTES](ROUTES.md)、[INFORMATION](INFORMATION.md)、[ACTIVITY](ACTIVITY.md)、[SETTINGS](SETTINGS.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/suggestions/`、`server/db/migrations/suggestions/`、`docs/evidence/SUGGESTIONS/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
