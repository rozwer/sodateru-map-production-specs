# AI｜根拠・音声と用途接続の残件

元Issue #7 の未確認部分を保持する後続です。30分デモ優先の利用者承認により、共通実行器の提供と残る全受入を分離します。元の全要件が完了した扱いにはしません。

## 提供済み
PR #96、develop 0216502b0fcba53a379fff9b7fdf8cc8da24b191。
共通用途登録、会話/Runの保存、取消/再試行、旧attempt遅着防止、CORE永続再送、固定SDK/一時CLI、gpt-5.6-luna実応答、音声確認テキストの既存送信API境界。

## 残る要件・受入
- [ ] 本番用途の実Luna応答→会話/構造化結果/model/参照版の保存→サーバー再起動再取得を実HTTPで確認し、証拠を保存する（現在準備済みlive-engine.tsで継続）。
- [ ] INFORMATIONの正式helperを使い、生成前・保存直前・結果取得・再試行の権限/参照版変化を実DBで確認する。失効参照は読めず、更新済み参照は所定エラーになり、入力を保持する。
- [ ] SETTINGSの送信直前の最新許可検査を実接続で確認する。既定OFF/明示許可/処理中の撤回とscopeを確認し #83 と証拠を相互参照する。
- [ ] UI #10 の既存Web Speech/録音導線で、実マイク→日本語認識→編集→明示確認→保存したMessage.body一致を確認する。中間結果/取消/録音失敗/本人またはmode変更は自動送信しない。
- [ ] 利用担当の本番登録・結果採用との接続を実導線で確認する。共通処理や用途別プロンプトを複製しない。

## 依存
INFORMATION #6 のread/refs、SETTINGS #83、MAP-CUSTOM #27 のregisterMapstyleTask、UI-EXPLORE #10。用途の固有処理は各担当が保持する。

## 契約・証拠・運用
元の仕様と全受入は #7 の元本文・リンクを引き継ぐ。server/ai、server/features/conversationsの公開口を使い、voiceはdocs/evidence/AI/voice-binding.mdに従う。元全文をdocs/evidence/AI/original-issue-7.mdへ保存する。
未確認部分を実行済みと報告しない。実AIとcontrolled-provider試験を明示して区別する。
後続着手時は担当と取得範囲をTask運用へ登録して正規claimする。#7のclaimを後続へ暗黙移管しない。
