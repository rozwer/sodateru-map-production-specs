## 変更

RECORDSの同期extensionに由来付きメモの保存・再取得を登録。通常memoの20000文字契約を保持し、presentation付きだけ200文字を検査する。サービス試験のnoUncheckedIndexedAccessも修正。

## 確認

全体 `bun run typecheck` 成功。既存manual CRUD/HTTP/SQL/断片検証はPR #54/#78とcloseout.mdを参照。

## 今回の範囲と残件

実RECORDS連結試験は共通OpenAPIのmemo未反映による追加属性検証で未通過。CORE #3に生成依頼済み。生成後の実保存・再取得・UI受入とAI命名は #105へ移管。#37は利用者の方針変更に従い、統合済み提供範囲と証拠を明記して正規手順で終了する。原仕様の全受入済みとは扱わない。

Refs #37, #105
