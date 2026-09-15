質問の回答状態と本人回答原文を保存し、同じIDで訂正・再表示できるAPIを追加します。抽出用途と既存日記は明示採用でRECORDSへ反映し、手動比較はINSIGHTSへ保存します。根拠変更時は古い生成文を非表示にし、独立した本人回答は保持します。

検証：実HTTP/SQLiteで回答訂正、原文保護、採用再送、日記編集競合、比較と本人判断、DB停止・再オープン、共有取消を1本で確認。担当strict型検査成功。SQLite/純粋処理4件成功、独立レビュー2件修正済み。

外部AIは明示したテストprovider。実モデル/UIと共通契約生成、新規日記createのCORE optional If-Match不具合は後続#111。本PRは#33をこの保存API範囲へ限定して完了し、元全要件の完成とは扱いません。証拠docs/evidence/REFLECTION/completion-scope.md。
