# REFLECTION #33 実装計画

正本: GitHub #33と画面requirements。取得範囲内、UIはA担当。

1. 質問はtarget/topic/根拠版/生成定義で重複抑止。同じIDでpending/later/skipped/answeredを永続化。回答原文はRECORDS private memo案を#20/#6と調整。
2. 共通AIのextract/diary/compare登録を使い、本人明示採用時だけ版照合して固有保存先へ渡す。原文・本人編集中本文を保護。
3. 手動比較は左右2件とcommon/differences各100文字、AI比較はINSIGHTS.saveComparisonへ保存。現在の根拠権限/版をINFORMATIONで照合。
4. node:sqlite実保存/再起動/訂正/別本人/再送/競合を必要範囲で確認。共通実AI・HTTP接続は提供commit後に確認。
5. 契約断片をCOREへ反映依頼し、短い独立役レビュー、PR/develop統合、task:finishへ進む。

未提供依存・未実接続は完成扱いしない。
