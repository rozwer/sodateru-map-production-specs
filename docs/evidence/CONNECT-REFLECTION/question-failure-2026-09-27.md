# 質問・履歴の再取得失敗時に古い引用を復活させない

#139 継続。前のPR #345（c5dcbe2）の回答保存後更新に続き、画面復帰時の通信失敗を対象とする。

## 実API再現

`reflection139.localhost:3140` → 観測proxy → 担当API3139、担当worktreeの専用SQLite。QuestionStoreに追加した `[検証用合成質問v3] 図書館で休めた理由は？`（id=reflection139-qa-question-v3、元記録reflection139-qa-record/version3、generatorVersion=manual-qa-not-ai）を使用。AI生成受入には算入しない。製品質問URLへ直接遷移し、未保存回答「[検証用未保存回答] 静かで集中できた。」を入力→画面の「振り返りの記録を見る」→担当API PID5506だけ停止→画面の戻る。実接続失敗（proxy502）にもかかわらず旧質問・元記録が再表示され、回答保存/あとで/スキップが有効になることを再現した。

## 修正と再確認

質問の再取得開始時にquestion/AI結果を無効にし、根拠cardの質問文・本文・日時・場所・媒体をプレースホルダーへ置換する。本人のanswer/editedは維持。取得成功まで保存/あとで/スキップを無効化。履歴の全再読込と失敗時はcards/questions/cursorを消去し、古い引用を表示しない。取得エラー中は0件案内も表示しない。

製品buildで同じ操作を実施。API PID12947停止後、質問画面は「元の質問を表示できません。」「元の記録を表示できません」となり、未保存回答を表示・保持したまま3操作がdisabled。履歴へ進むと旧カードなしで通信エラー/再試行を表示。担当APIだけPID17346で同じDBへ再起動→質問へ戻るとGET成功、検証質問/元記録を再取得し、同じ下書きと保存操作の復帰を確認。cookieは担当専用hostname、他担当server/DBは変更しない。0件案内抑止はその後の回帰テストで確認。

## チェックと残件

- QuestionsScreen回帰4件PASS（変更/削除後保存、再取得失敗→再試行で下書き保持、履歴再取得失敗）。0件案内抑止も検証。
- 全体typecheck PASS、製品build PASS（既存chunk警告）。
- GET再取得成功まで旧引用を表示しない動作の確認であり、実AI生成/根拠変更後AI再生成、AI日記採用、比較判断、本人切替/閲覧拒否の全条件、応答不明保存再送・save自体の失敗/遅着は未完。#139はcloseしない。

## 最小の次タスク（1件、2026-09-27 第2周で対象操作は確認済み）

原因は検証不足。#111の引継ぎコメントでは実モデルの日記案→新規日記採用APIは提供済みだが、#139の既存DiaryScreenからの採用・再表示証拠がない。今回、実際に再現した取得400と質問引用の不具合3件を先に直したため未検証であり、API未提供や過剰設計が原因と断定する証拠はない。

次タスクは「既存DiaryScreenでAI日記案を本人が採用し、同じ日記IDへ保存する」1操作だけ。新基盤・新契約は追加せず、失敗した場合の修正境界は `src/features/reflection/DiaryScreen.tsx` と本evidenceディレクトリ。完了確認は通常入口から採用した本文が、再取得後に同じrecordIdで表示されること1つ。実AI利用の条件が満たせない場合はその具体的エラーを記録し、合成結果で完了扱いしない。新Issueは作らず#139を継続する。

### 第2周：既存DiaryScreenの実AI採用→同ID再表示（PASS）

前提PR358（merge924dc0d）のdiary-save handoffを公式claimし、最新developの製品distを使用。製品コード変更なし。`mise exec -- bun install --frozen-lockfile` / `mise exec -- bunx vite build` 成功。専用worktree `/Users/roz/Documents/sodateru-map-production-specs-reflection-diary-139`、新規 `.local/app.sqlite` / `demo.sqlite` / `profiles.json`。`SODATERU_PORT=3139 CODEX_AI_MODEL=gpt-5.6-luna mise exec -- node --experimental-transform-types server/app/main.ts` と既存observe-http.mjs（3140）で起動。hostnameは `reflection-diary139.localhost`、他担当cookie/DBと分離。Vite dev serverは使わずport固定の製品HTTPを使用。

実APIで受入用の架空体験1件（id=diary139-live-source/version1、検証用と本文に明記）を登録し、実SETTINGSのAI/records許可を設定。通常Appの本人開始→製品 `#/diary?date=2026-09-27&timeZone=Asia%2FTokyo` を開き、「記録から日記の下書きを作る」→「下書きを作る」→実モデル完了→「この下書きを本文に追加」→「日記を保存」を実操作。日記画面までは直接URLであり、地図から日記への通常メニュー導線の受入とは区別する。

GET体験200、POST conversation201、POST message202、GET message200。実run=`405bc817-09de-4473-a974-7bfe7e4d8b7d`、task=diary、model=gpt-5.6-luna、status=complete、attempt1、promptVersion=reflection-v1、sourceRef=diary139-live-source/v1。出力「川辺のベンチで休憩した。水の音が聞こえて、落ち着いた。」は本人採用前に本文へ入らず、採用ボタン後に本文へ入り、保存ボタン後にPOST /reflection/adoptions200→GET /records/adfaf0a6-1fd7-467b-b1a6-45205b920ad7 200と「保存先から読み直しました」を確認。

保存先はrecordId=`adfaf0a6-1fd7-467b-b1a6-45205b920ad7` / kind=diary / version1 / private、本文は実AI出力と一致。担当APIを停止→同じDBで再起動（PID35723→40938）し、上記recordId付き製品日記URLをreload。「保存済みの内容」と同じ27文字本文を再表示。生成は1回のみ、mock provider/応答差替え/合成AI出力は不使用。今回割当ての1操作は完了。#139全体の比較判断・根拠変更後AI再生成などの受入は本確認に含まれず、Issueは閉じない。
