# INSIGHTS 提供状況

## 先行提供: 保存adapter
- COREの同期transaction/所有者境界を使う比較・分析結果の保存、取得、本人評価、削除。
- 同一入力の再利用で本人評価を保持。要求ID別名のreceiptも保存し、異なる入力へのID再利用を拒否。
- INFORMATIONの同期checkSourcesを注入する。変更済み/取得不可の根拠は返さない。
- register.tsは保存用migrationだけを登録。HTTPとAIの実接続は次の提供で追加する。
- REFLECTIONからcreateInsightsService(db,{checkSources})を利用できる。

## 検証
identity/repository/service/HTTP/analysisの限定テスト成功。SQLite保存・再オープン、所有者/版、参照変更/取得不可、同一要求再利用、外側transactionのrollbackを確認。HTTPとAIのテストはCORE実装と依存fixtureを使い、実INFORMATION/AI接続完了の証拠ではない。

## 作業中
固定5軸（自然、本、カフェ、散歩、人との時間）の明示記録による日別集計と根拠。Summary/POST、統計のfactoryを作成中。実環境接続・契約更新・画面確認は未完。
ユーザーの30分デモ優先方針により、現Issueの提供範囲と残件を明記して後続Issueへ引き継ぐ。現時点で全受入完了とはしない。

## guard復旧
developの#63修正を通常merge、task:verify後のcommit d965a47成功。変更破棄・claim解除・hook回避なし。
