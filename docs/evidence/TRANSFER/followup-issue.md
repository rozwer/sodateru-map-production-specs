# TRANSFER follow-up: 実データ二案生成・採用・Q10画面の結合受入

元Issue: #32 / 先行PR: #94。デモ期限に合わせたユーザー承認の切り分けです。元のTRANSFER.completeの全受入は未達で、このIssueへ引き継ぎます。

## 先行提供
レシピ/計画/採用の固有SQLite保存、CORE HTTPと再送/競合処理、二案の順序・候補・根拠・時間検証、共通サービスadapter、8operation断片。テスト依存を使ったHTTP境界検証と実アプリ起動/本人セッションを確認。元記録を更新しません。

## 残要件・受入
- INFORMATION.read/refs (#6/PR48) とCOREの共通schema/型クライアント合成 (#3) を統合し、実記録からレシピをPOST/GET。OSサーバープロセス再起動後も意味・順序・sourceRefs・移転条件が一致すること。
- 共通AI.engine/refs (#7、PR96)、PLACES.search/detail (#5)、ROUTES.basic (#25) で実在候補から忠実案/本人向け案を生成。共通点・相違・不足情報を返し、候補外地点/架空引用/必須条件未確認/時間超過を誤って採用しないこと。
- 選んだ地点列を同じ順序で共通ROUTESへ保存。採用途中の切断/再送とOSプロセス再起動後に同じ計画・選択・保存経路をGETし、AI採用参照と一致すること。
- A担当UI #10のQ10画面へ保存・生成・比較・採用・再表示を接続し、指定画像と実API契約で受入すること。
- 最新本人AI許可と参照版を送信・採用直前に共通サービスで確認し、削除/非公開化/訂正の失敗を成功表示しないこと。live/demo分離と元体験非上書きを実接続で確認。

## 既存証拠と再現入口
docs/evidence/TRANSFER/progress.md、startup.json、http-acceptance.mjs。
server/features/transfer/{recipe,planning,service,contract,http}.test.ts。
HTTP境界の外部依存は明示的テストダブルであり、実provider受入の代用ではありません。

## 担当範囲
server/features/transfer/、server/db/migrations/transfer/、docs/01_requirements/04_api/fragments/TRANSFER.json、docs/evidence/TRANSFER/。UIはA、共通生成はCORE、共通実装はそれぞれの所有者が担当。着手時はboard/claimを正規取得してください。
