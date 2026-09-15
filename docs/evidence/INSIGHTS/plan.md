# INSIGHTS implementation plan
Goal: Issue #34の確定済み保存・期間同一性・本人評価を先行し、契約合意後に期間集計とAI説明を実接続する。
Spec: docs/03_issue/issues/INSIGHTS.md と GitHub #34 の最新本文・コメント。
Architecture: CORE DatabaseSync/HTTP/context、INFORMATION共通読取・根拠検査を利用する。固有repositoryはinsightsのSQL/DTO、serviceは同一性・本人評価・根拠再検査、aggregationは入力定義合意後の日別純粋計算。
Constraints: サブエージェント禁止。取得4path内のみ編集。UIはA。未合意5軸規則は実装しない。部分提供でIssueを閉じない。
- [ ] 保存adapter: identity.ts / repository.ts / service.ts。canonical条件・ソート参照と生成定義からSHA-256。同一入力のreview保持、再起動後再取得、版競合、他本人、削除後再送をSQLiteで検査。
- [ ] 固有fragment: INSIGHTS.json。既存operation維持、期間検索と200文字理由、構造化説明の契約をCOREへ渡す。
- [ ] summary: aggregation.ts。期間とtimezone、日別重複・分母・unknown規則は根拠対応表と担当合意を経て確定。INFORMATION実効日時を利用。
- [ ] register.tsでCORE登録、実HTTP→SQLite→再取得、INFORMATION変更/削除検出、AI実説明を確認。
- [ ] 司令塔に独立役レビューを依頼し、修正→commit/push→develop通常merge。全受入確認後にtask:finish。
