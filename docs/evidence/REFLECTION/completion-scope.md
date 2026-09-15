# REFLECTION #33 — 保存API提供範囲

2026-09-15のデモ優先指示により範囲を分割。実装PR #80、後続Issue #111。元の全要件完成ではない。

## 提供範囲

- 固有8 API、SQLite migration、契約断片v1.2.0。
- extract/diary/compareを共通AI登録へ接続。結果を提案として保存し、用途/既存日記は明示採用でRECORDSへ反映。
- 質問のあとで/スキップ/回答状態、本人回答原文の独立private memo保存と同じrecordIdへの訂正。
- 手動比較の固有ID保存、共通INSIGHTSへ比較結果と本人判断の保存を委譲。
- 根拠changed/unavailable時に古い生成質問/比較引用を返さず、独立回答原文と本人手動比較文を保持。

## 検証

- questions.test.ts 1件成功。同一根拠の重複、本人分離、版競合、DB再オープン後の同一ID/状態。
- logic.test.ts 3件成功。比較左右/引用、用途採用の原文保護、古い質問非表示と独立回答保持、比較依頼文の識別。
- Ajv2020で8 schemas/8 operationsの参照解決成功。
- INSIGHTS役の独立レビュー2指摘を修正、必要回帰成功。
- integration.test.ts 実HTTP/SQLite 1件成功。回答訂正、AI失敗後の回答保持、用途採用/同内容再送、既存日記採用/本人編集後の旧版412、比較と本人の「違う」、HTTPサーバー/DB停止・再オープン後の同一ID再表示、共有取消/根拠変更/原文削除後の表示を確認。
- 外部AI providerとAI許可設定だけを明示したfixtureへ差替。CORE HTTP/SQLite、INFORMATION権限/SourceRef、RECORDS、INSIGHTS、REFLECTIONは実コード。実モデル生成の証拠ではない。共通契約はテスト内でfragment合成、通常製品全体成功の代用にはしない。
- 担当と依存のstrict型検査成功。ルートと同じESNext/Bundler、strict/noUncheckedIndexedAccessでregister.tsとintegration.test.tsを検査。全体型検査は他担当の残エラーがあり成功とは扱わない。

## 再現

mise exec -- node --experimental-transform-types --test server/features/reflection/integration.test.ts

mise exec -- bunx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --esModuleInterop --skipLibCheck --strict --noUncheckedIndexedAccess server/features/reflection/register.ts server/features/reflection/integration.test.ts

依存統合：AI 0216502、RECORDS 560c976、INSIGHTS eabfe868、INFORMATION cc710000を含むdevelopから通常取り込み。対象実装は本証拠を含むPR #80提出HEAD。

## 未達・後続 #111

新規日記create:trueはCOREがoptional If-Matchを必須化して428 VERSION_REQUIREDになった。初回実HTTPのrequestId 65eb6023-7ef6-408e-8b21-bdbf2dd7a6ef。今回の完成範囲は既存日記への採用に限定し、共通修正は#3へ報告済み。

実AIモデル、UI #12/#14での実導線受入、通常起動の共通契約/client反映、生成中編集/根拠変更後の再生成の実画面受入は#111へ継承。

## Task運用

PR #80は通常mergeし、提出commitのdevelop到達性をtask:finishで検証する。後続着手時は正式Task/claimを取得し、#33のclaimを流用しない。
