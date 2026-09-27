# #16 一覧・地図の条件保持修正

検証日: 2026-09-27。基点: develop `30128adf3cfdfab1db7b438da2ec1eea21b5cdab`。対象commitは本ファイルを含むPRのhead。
専用worktree: `/Users/roz/.codex/worktrees/knowledge-16-sep27`。公式task:worktreeでUI-KNOWLEDGEを取得。

## 修正

- 検索済み文字列・分類・filters・placeIdを一覧→絞込/地図→一覧のroute paramsへ渡す。新しい一覧は渡された検索済み文字列で初期化する。
- 地図画面も受け取った検索語・期間・共有範囲・地域条件で読む。未接続分類を黙って体験へ変えない。
- 期間なしは日時不明を含み、今週/今月指定時は含めない。画面の説明と`includeUndated`を一致させ、呼出し側のtrue上書きを除去。
- 検索条件が変わったrenderでは旧cursorを即座に無効にする。key照合で新条件＋旧cursorの余分な読取りを止め、effectで旧pagination自体を破棄する。独立レビューで見つかったA→B→Aで旧cursorが復活するケースも回帰テストで確認。

## 確認

`mise exec -- bunx vitest run src/features/knowledge/screens.test.tsx`: 4件成功。実ビューの検索submit、地図/一覧遷移、条件適用、ページ送り後の検索とA→B→A往復を操作し、共通clientへ渡るqueryを照合。API応答はmockであり保存の証拠ではない。

実shell: Vite `http://127.0.0.1:5196` → 実API `http://127.0.0.1:3196`。worktree固有の`.local/app.sqlite`、自己profile、liveモード。既存稼働DBは使っていない。
`POST /api/v1/session` 201の後、正式`POST /api/v1/records`を4回実行、すべて201。記録は検証用と本文に明記した、当日「港」、日時不明「港」、60日前「港」、当日「公園」の4件。placeIdなし・public・媒体なし。UI応答の差替えはしていない。

Codexブラウザーで実操作:

1. 一覧で「港」と入力しEnter → 3件（当日、60日前、日時不明）。
2. 検索条件で今週・公開を選択して適用 → 検索語「港」、1件、本文「港の散歩（検証用）」のみ。
3. 地図で見る → routeにquery=港/kind=experience/period=week/audience=publicを保持。場所シートの1件と同じ本文を確認。
4. この場所の声を見る → 一覧の検索入力「港」、1件、同じ本文を確認。
5. 条件を開き直す → 今週・公開が選択済み。今月・フレンドへ変更して閉じる → 適用前の今週・公開と1件を保持。検索条件ボタンへfocus復帰。

`mise exec -- bunx vite build`: 成功。
`mise exec -- bun run typecheck`: 全体は不合格。既存のserver/core/core.test.ts (displayName)、exploration/flow.ts (requestId)、friends/screens.tsx (entry)、reflection/DiaryScreen.tsx (version)、tools/local/dev.ts (undefined)に計12エラー。knowledgeのエラーなし。他担当pathは変更していない。

## 残件・完了境界

#16/#143は閉じない。今回成功したのは上述の条件保持経路。

- この環境はMapboxトークン未設定で「地図の接続設定がありません」と表示。実地図描画・全件マーカーの受入は未確認。場所なしの投稿を使ったためplaceId/中心半径は回帰テストのquery照合のみ。
- 地図はまだ一覧の先頭100件から地点を表示している。100件超/全件地図/場所不明数/413は#143の残件。
- 休憩チップ・人物・目的・bbox・地域候補・しおり・共有単体/取消・別本人読取等の既存未接続は保持。
- 指定画像照合、媒体あり、各viewport/200%/ソフトキーボード、実Mapbox、動画端末操作など#16本文の残受入は未完。
- 外部レビューと必要チェック充足を待ってdevelopへ提出commitを保持して統合する。今回の部分修正だけでfinish/closeしない。
