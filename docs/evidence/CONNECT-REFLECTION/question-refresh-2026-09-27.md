# 回答保存後に古い質問引用が残る不具合

対象 #139、基点 develop `0d87611`。前のPR #336は `36e5bca` で通常merge済み。今回の変更はQuestionsScreenの保存後、GETした質問からcard全体を組み直し、元記録も読み直す。answer/statusだけを旧cardへ継ぎ足さない。独立回答の入力は保持する。

## 実APIで再現・修正確認

担当worktreeの製品dist、実 `server/app/main.ts`（port3139/PID74157）、担当専用 `.local/app.sqlite` とprofilesを継続使用。観測proxy3140から同じAPIへ転送。ブラウザhostを `reflection139.localhost:3140` に変更し、他担当の127.0.0.1 cookieとの衝突を回避した。通常入口でsession401→profiles200→本人開始POST201、その後GET session200を観測。前証拠の初回本人選択エラーはportでcookieが分離されないことと整合するが、原因確定や本人切替受入PASSとは扱わない。

検証データは担当専用SQLiteへ既存createRecord/QuestionStoreで投入。本文に `[検証用合成データ]`、質問に `[検証用合成質問]`、generatorVersionに`manual-qa-not-ai`と明示。実AIで生成した質問ではなく、AI生成受入には数えない。API応答はmock・差替えなし。通常入口のself-homeで合成記録1件の表示とGET records200を確認。その後質問保存の検証はquestionId付き実画面URLへ直接遷移したため、通常導線の全受入は未完。

修正前の `reflection139-qa-question` で、画面からあとで→スキップ→回答保存を操作。各回PATCH /reflection/questions/{id} → GET同IDはいずれも200。PATCHは順に `{status:later}`、`{status:skipped}`、`{status:answered,answerText:...}`（If-Match 1→2→3）。続いて別HTTPセッションから元記録をIf-Match1で訂正（200）。GET質問はquestionText:null/evidenceState:changedを返したが、画面で回答訂正を保存（If-Match4、answerVersion1）すると旧質問文・旧元記録カードが残ることを再現。

修正後は元記録v2を参照する `reflection139-qa-question-v2` を作成。製品buildを再読込し、画面で初回回答を保存。別HTTPセッションから元記録をIf-Match2でv3「図書館で休んだ」へ訂正（200）。画面で「[検証用回答訂正v2] 図書館で休めた。」を保存（question If-Match2、answerVersion1）。PATCH→GET質問→GET元記録→GET媒体の全て200。画面は直ちに「元の質問を表示できません。」と訂正v3の元記録へ更新し、回答入力は保持。ページreloadでも同じ状態を再表示した。

SQLite照合: question-v2 status=answered/version=3、answerRecordId=`answer_e5f0c882d7060d003dfd31ad2603f55cf10c3b0e04b71452`。回答は同IDのrecords kind=memo/visibility=private/version=2で、本文は上記訂正回答と一致。元のquestionもversion5、固定answerRecordIdの回答version2で保存された。

## チェック

- `mise exec -- bunx vitest run src/features/reflection/QuestionsScreen.test.tsx --environment jsdom`: 2/2 PASS。根拠changed/deletedそれぞれで保存後の古い質問・根拠を除去し、訂正入力とquestion/answerの版送信を保持する回帰。
- `mise exec -- bunx vite build`: PASS（chunk警告あり）。`git diff --check`: PASS。
- CORE #338（eceba47）を含む最新developを追加統合後、`mise exec -- bun run typecheck` 全体PASS。公式 `CODEX_OWNER=rozwer mise run task:verify` PASS（submitted・取得path不変）。契約更新後に回帰2件と製品buildを再確認しPASS。担当APIのみPID74157を停止しPID5506で同じSQLiteへ再起動、同じquestionId URLをreloadして訂正回答・質問非表示・訂正v3元記録の再表示を確認。共有サーバーは変更していない。

## 残受入

今回、明示合成質問を使った実HTTP/SQLiteの状態保存と回答訂正・再読込を確認した。実AI生成/質問までの通常導線、AI日記採用、比較判断、根拠変更後のAI再生成、本人切替/閲覧拒否/遅着、失敗時の古い引用除去は未確認。#139はcloseしない。履歴一覧・根拠参照の再取得失敗時や画面復帰時の古い引用表示は別の具体的懸念として残る。
