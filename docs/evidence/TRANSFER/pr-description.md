## 変更

元体験の意味・順序・参照版をレシピへ保存し、忠実案/本人向け案を検査して別の街で採用するQ10固有処理です。AIが候補外の地点や引用を追加した場合、必須条件の評価を省略した場合、移動と滞在が予算を超える場合は採用しません。元記録を更新しません。

レシピ/計画/採用のSQLite保存、8operation断片、CORE登録/再送接続、AI用途登録と各共通サービスadapterを含みます。採用は固定した共通route IDを再送し、最終PlanSet更新・AI採用参照・共通受付完了を同じtransactionへ接続します。

## 検証

- 固有6検証成功：実SQLite再オープン、順序/本人/版、AI候補/引用/二案/条件/時間、採用再送と根拠変更。
- 共通SchemaとQ10断片の参照コンパイル、実SQLite DTOとの照合1件成功。
- CORE統合後、固有store/service/planning/httpのstrict型検査成功。

## 未完了

AI/PLACES/INFORMATION/ROUTESの実統合と全adapter型検査、実API/外部取得/採用後プロセス再起動GET、A担当UI bindingの受入が残っています。採用再送テストの共通依存はテスト用であり、製品の実接続証拠には数えません。このdraftはTRANSFER.completeやIssue closeを要求しません。

Refs #32
