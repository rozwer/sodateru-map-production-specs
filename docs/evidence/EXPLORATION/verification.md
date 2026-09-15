# EXPLORATION 先行検証（2026-09-15）
状態: 固有処理の先行提供。CORE/共通AI/PLACES/ROUTES/INFORMATION未統合、実HTTP/実AI/実経路の完了証拠ではない。
環境: Node 22.22.1、node:test、node:sqlite。正規task:verifyでEXPLORATION/mattsunの4pathを確認。
## 実行した検証
- node --test server/features/exploration/dialogue.test.mjs: 4成功。候補ID/起点維持、所有者・mode・設定版・期限、取消/BUSY/遅着、検索上限。
- node --test server/features/exploration/discovery.test.mjs: 3成功。実SQLiteファイル保存→close/reopen→同じカードと反応再取得、saved/dismissed/interested、根拠変更/非公開、反応再送、取消/古いattempt、削除後再送拒否。NodeのSQLite ExperimentalWarningあり。
- node --test server/features/exploration/history.test.mjs: 1成功。同じ候補で履歴復帰、別mode/本人、期限切れは再検索。
- node --test server/features/exploration/facts.test.mjs: 1成功。出典完全組、別対象のplace-specific、未知factKeyと捏造URLを拒否。
- EXPLORATION断片の5 Schemaを既存componentsと合成しAjv2020でコンパイル。
外部依存はテスト用の注入値。これらを外部API接続の証拠にしない。共有DB列は正本storage-additions.sqlからテストに適用し、固有migrationは採用receiptだけ。
## 残り
共通入口へHTTP/AI用途登録、実AI相談→実場所→実経路、実Runからdiscovery保存/再取得、#10のUI操作、独立レビュー、develop統合、board/Issue終了。
