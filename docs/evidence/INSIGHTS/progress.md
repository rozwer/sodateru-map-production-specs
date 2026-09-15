# INSIGHTS 提供状況

## 保存adapter
#34/PR #93で同期保存・本人評価・根拠再検査・migrationを提供済み。#34は分割完了し、後続#101 INSIGHTS-DEMOで実接続を継続。

## #101 今回の接続
- 実INFORMATION ownMaterials/checkSources/assertSourcesCurrentへ接続。
- GET /reflection/summary、POST /insights、GET一覧/単体、PATCH本人評価、DELETEをregister.tsで登録。
- 固定5軸の原文日別判定・暫定名・構造化根拠を契約fragment insights-fixed-five-1に追加。旧軸キーは保存結果の読取互換のみ。
- AI analysis taskを共通registryへ登録。数値/日別/根拠を保持した説明保存を提供。

## 実HTTP証拠
connected-http.json / server/features/insights/connected-http.test.ts。
隔離した実SQLite live領域、実CORE/RECORDS/INFORMATION、localhostの実HTTPで、本人session→記録POST→固定5軸summary→insightPOST→unsure理由PATCH→サーバ/DB再オープン→GETで理由保持→冪等再送→元記録訂正→古いinsight 409を確認。
本を見つけた/カフェで過ごした/公園を歩いた/友人と話したの4文から5軸はいずれも1/1、不明1日。

## 未完と限界
共有UIでの最終表示、活動統計HTTP登録は未完。原文判定は版付き定型表現で、自由文の包括的な意味判定ではない。未対応表現は不明。
全体tscは共有生成クライアント未反映によるCOMPANION/SUGGESTIONS/THEMES等の型エラーで失敗。今回の実接続HTTP検証は成功。共有契約生成はCORE担当の反映を要する。

## 実AI説明の保存
実main/全feature、隔離SQLiteと合成記録、正規設定APIのenabled/allowRecords許可でLuna gpt-5.6-lunaを実行。26秒でcomplete、promptVersion insights-analysis-1。計算値保持、unsure判断保持、サーバ再起動後の結果一致と本人入力保存を確認。証拠はlive-analysis.json、再現手順はlive-analysis.ts。最初の許可未設定でFORBIDDENも確認し、許可後に成功。

## 共有デモUI確認
共有UI http://127.0.0.1:5173 / API3001、起動537a15cc、demo/selfへ担当識別付き合成記録を1件追加（shared-demo-seed.json）。自分を知る→タイプ診断→根拠記録→まだ分からない→理由入力→保存成功を実ブラウザーで確認。reload後の選択保持を確認。理由欄はchoice付きrouteで空に戻るUI問題を#13へ報告。title/axes固定のUI mappingも未解消で、API5軸1/1を画面グラフ表示成功とは扱わない。
