機能要望の投稿・共感・本人編集/削除をSQLiteへ保存し、再起動後に再取得できます。投稿時の表示名、本文からの題名、地域/目的タグ、private/publicを往復させ、同じ投稿の再送で二重作成しません。

実CORE HTTPの投稿→共感→再起動→編集→削除と、本人権限/再送/版競合の受入1件が成功。対象機能と依存のstrict型検査成功。全体typecheckには既存THEMES/DISASTERの担当外エラーが残ります。

COREの共通生成とUIの操作接続は後続Issueへ移管し、このPRは検証済みのAPI提供単位です。Refs #31。証拠: docs/evidence/FEATURE-REQUESTS/README.md。
