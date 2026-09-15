# REFLECTION-INTEGRATION #111 — 実モデル接続

2026-09-15。通常server/app/main.ts、正式OpenAPI、CORE本人session、SETTINGSの実AI許可、独立した受入用SQLiteを使用。provider/共通権限/HTTP契約の差替えなし。入力は受入専用の架空の体験文。

## 修正

比較だけがUPSTREAM_FAILEDになった原因を実providerで採取。compareResult.mappings[].rejected={const:false}にtypeが無く、400 invalid_json_schema「schema must have a type key」で拒否されていた。
固有taskの出力schemaをcloneしtype:booleanを追加。const:falseを保つため本人の拒否判断をAIが代行できる範囲は増えない。共通Schemaや共通providerは変更していない。
原エラーはcompare-provider-diagnostic.json、補正前の一連の結果はlive-integration-before-fix.json。公式Structured OutputsはJSON Schemaの部分集合を扱う: https://developers.openai.com/api/docs/guides/structured-outputs 。

## 確認結果

- schemas.test.ts 1件を修正前に型欠落で失敗させ、修正後に成功。
- 実モデルgpt-5.6-lunaでextract/diaryが生成完了し、用途のみ採用して原文を保持、既存日記へ明示採用して保存できた。
- 成功済み生成は繰り返さず同じDBから再開。比較修正後にcompareも実モデルで生成・INSIGHTS保存・GET成功。
- 通常mainプロセスを停止→同じSQLite/本人で再起動し、日記本文と比較IDの再取得が一致。
- 担当task/schema回帰/実接続スクリプトのstrict型検査成功。

最終証拠live-integration.json。requestId 1a4c252b-1f64-41bf-92bc-f61a831d841f。モデル・応答ID・根拠版・insightIdを保存。INSIGHTS HTTP統合28f3bf6、共通契約更新6731fceを含むdevelopで確認。

## 再現

新しい受入専用DBから:

mise exec -- env CODEX_AI_MODEL=gpt-5.6-luna node --experimental-transform-types docs/evidence/REFLECTION/live-integration.ts

生成途中で失敗した場合は、保存済みの抽出/日記を再生成せずREFLECTION_RESUME_FILEへその結果JSONを指定して比較から再開できる。

## 残件

- 新規日記createのoptional If-MatchはCORE #3へ依頼済み。この証拠は既存日記への採用であり新規採用成功とは扱わない。
- UI実操作は担当CONNECT-REFLECTION #139 / 友達比較UI担当へ依頼。UIや共通ファイルは取得範囲外。画面全受入は未確認。
