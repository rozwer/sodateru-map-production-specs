# タイプ診断デモ補完

- Base: c6ec1ba; 配信: /Users/roz/.codex/worktrees/qa-visual-40, http://127.0.0.1:5173/
- demo/self の正式 POST /records に架空と明記した記録2件 (diagnosis-demo-20260915--1, diagnosis-demo-20260915-0) を追加。既存記録は変更していない。live への書込なし。
- POST /insights で今日・今週・今月・これまでを保存。今週とこれまでは同範囲なのでAPIが同一IDを返す。本人評価 review は null。
- INSIGHTS fragment が定義済みの5軸と provisionalName を表示に接続。旧6軸は読み替えず、根拠更新時は図と呼び名を非表示にする。UI/CSS変更なし。
- vitest data.test.ts: 2 passed。vite build 成功。
- tsc: 今回の変更にはエラーなし。既存の core.test.ts, exploration/flow.ts, friends/screens.tsx, reflection/DiaryScreen.tsx, tools/local/dev.ts にエラーが残る。
- ブラウザ表示・再読込確認は統合反映後にIssueへ追記する。
