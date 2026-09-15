# REFLECTION 後続｜実モデル・画面導線と残受入

元Issue #33 / 実装PR #80。2026-09-15の「まずデモ動作完成、提供済み範囲を通常統合、残件を後続1件へ移す」方針に基づく引継ぎ。元の全要件を完了扱いしない。

## 継承する残要件

- 共通AIの実モデルを使ったextract/diary/compareの生成→保存→再取得をUI #12/#14の実導線で確認する。テスト用providerの成功を実AIの成功に代用しない。
- UIから質問のあとで/スキップ/回答/訂正、日記の明示採用、二体験/友達比較と本人の「違う」を保存して画面復帰後に同じIDで取得する。
- 日記生成中の本人編集保護、共有取消/根拠訂正後の引用非表示→再生成を実画面で確認する。現在の版を使い、新しい根拠なしの理由再質問を避ける。
- 通常起動が利用する共通Schema/APIクライアントにREFLECTION v1.2.0以降を反映し、新規日記create時のoptional If-Matchを共通側で扱う。

## 依存・契約・担当範囲

AI #7、INFORMATION #6、RECORDS #20、INSIGHTS #34、CORE #3、UI #12/#14。
担当固有pathはserver/features/reflection/、server/db/migrations/reflection/、docs/01_requirements/04_api/fragments/REFLECTION.json、docs/evidence/REFLECTION/。
共通ファイルとUIは既存担当へ調整し、重複実装しない。#33終了時のclaimは解放し、後続着手時は新しいTask/claimを正式に取得する。

## 提供済み範囲の証拠

#33の終了範囲と実際の確認結果はdocs/evidence/REFLECTION/completion-scope.mdへ記録する。現時点の既知のコード/契約はPR #80、独立レビュー指摘2件は修正済み。後続で確認済みの項目は二重に網羅テストせず、残る実接続だけを完了させる。
