# 共有相手pickerの取消・再入場修復

- Issue: #14 UI-FRIENDS（全体は未完、close不可）
- 基点: origin/develop `30128adf3cfdfab1db7b438da2ec1eea21b5cdab`
- 提出: 本ファイルを含むcommit。専用branch `rozwer/14-friends-sharing`
- 範囲: `src/features/friends/`、`docs/evidence/UI-FRIENDS/`

## 修正

同じrecordIdのpickerはshellのvisited/useScreenStateに保持され、取消後に開くと前回の一時選択が復活していた。sharingから開くたびにselectionSessionを発行し、新しい選択は現在の共有下書きから開始する。プロフィールへの往復では同じ選択sessionを保持する。pickerへ明示的な取消ボタンを追加した。

最新のaccepted一覧に含まれない選択IDは警告し、取り除くまで完了不可にする。picker完了は下書きだけを更新する。API DTO・保存契約は変更していない。

fixtureはAppの静的importが共通clientを先に初期化し、fetch差替えが効かず実APIへ到達していた。fixture transportの設置後にAppを動的importするよう修復。製品entryには影響しない。既存ResizeObserverの空entryの型エラーも担当内で修正。

## 検証

2026-09-27、Chrome、Vite 5194、実App shell、明示UI fixture（画面に「UIテスト応答・実API/DB未接続」表示）。実保存の証拠ではない。

1. `reference.html#/sharing?recordId=fixture-record-0` → pickerで はるか・こうたを選ぶ → 取消 → 共有画面は公開・0人のまま。
2. 再入場 → 0人、両チェックが未選択。selectionSessionが更新される。
3. はるかを選択 → プロフィール → 戻る → はるかの選択保持。
4. こうた追加 → 完了 → 共有画面で「選んだ友達・2人」「未保存の変更があります」。共有は未実行。
5. 画面のテスト通信記録はGETのみ。POST/PATCH/DELETEなし。
6. `mise exec -- bunx vitest run src/features/friends/picker.test.tsx`: PASS。解除済み相手は完了不可、除去後は完了可、選択と取消では下書き不変、完了でID更新、GETのみを検証。
7. `mise exec -- bunx vite build`: PASS。
8. 全体 `tsc --noEmit` は既存の他範囲（core.test.ts FeatureRequestCreate.displayName、exploration/flow.ts requestId、reflection/DiaryScreen.tsx version、tools/local/dev.ts undefined）で未通過。friendsのResizeObserverエラーは修正。全体型検査成功とは扱わない。

## 残件と後続

#14の指定画像完全一致、異なる2組の全状態、320/390/1440、文字200%、キーボード、reduced motion、Mapbox全画面検証はこの修正では未完。既存reference-repair.mdのプロフィール/比較/共有ルート残件も維持する。

#142では二本人での共有取消・媒体・比較引用・解除後の画面復帰、保存/再起動/再取得を実APIで検証する必要がある。このPRのpickerはUI操作単位の引継ぎ。統合後に正式release/claimで接続側へ進める。レビュー・必要チェック完了前はmergeしない。
