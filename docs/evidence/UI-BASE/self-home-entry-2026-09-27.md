# SelfHomeScreenの製品入口修復（#4）

基点: origin/develop 30128ad。担当branch: rozwer/4-self-home。

`#/self-home` を共通NavigationCardsへ強制し、visited画面からも除外していたため、登録済みSelfHomeScreenに到達できなかった。登録画面がある場合はその画面を描画し、下部ナビもself-homeへ遷移する。未登録のUI fixtureは従来カードを使い、明示navigation?mode=selfのカード入口も保持する。communityの挙動は今回変更しない。

## 確認

- `mise exec -- bunx vitest run src/app/presentation.test.tsx`: 3件成功。直URL、共通メニュー、下部ナビ、同一画面のmount保持を追加確認。既存のfullscreen/地図保持と写真引継ぎも成功。
- `mise exec -- bunx vite build`: 成功（既存の大きなchunk警告あり）。
- 製品distを隔離API `SODATERU_PORT=3244 mise exec -- node --experimental-transform-types server/app/main.ts` で起動。新規worktreeの専用.local DBを使用、既存DBは未使用。Chromeで通常本人「自分」→地図をのぞく→下部ナビ「自分を知る」を操作し、self-homeの「日々の体験から、いまの自分へ。」「今日の軌跡」「タイプ診断」「わたしの地図」を確認。
- SelfHome内メニュー→自分を知る、reloadでもSelfHomeScreenを確認。390×844を目視し、[画面証拠](self-home-390.png)を保存。

## 残件（Issueは閉じない）

- 到達後、機能側getRecordsがfrom/toを送る際timeZoneを送っておらず、実APIは `from/to/timeZone must be supplied together` を返す。対象はsrc/features/reflection/screens.tsx（#185/#12系統）。取得範囲外のため無断変更していない。データ表示の成功とは扱わない。
- この隔離環境はMapbox接続設定なし。実地図の受入は未確認。390px画面では見出しが見えない状態もあり、原本との全体照合は未達。
- 320/1440、200%、実ソフトキーボード、reduced motion、全画面のscroll/focus、表示設定・GPS共有・plugin layer等、#4の既存未達は保持。
- #137実接続と#98全体統合の完了を代替しない。レビュー/必要CI後に提出commitを保持して統合する。
