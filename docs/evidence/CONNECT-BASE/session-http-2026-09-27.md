# CONNECT-BASE 実HTTP接続受入の追補（#137）

基点develop: 358eb63（#331のUI入口修復を含む）。製品実装を重複追加せず、既存のCORE共通clientとuseLocalSession/Appが接続された境界を検証した。

## 再実行可能な実HTTP・SQLiteテスト

`mise exec -- bunx vitest run src/app/session-http.test.tsx` : 1件成功（3118ms）。

Node実HTTPサーバーに製品createApp/core DB migrationを接続し、一時ディレクトリにlive/demo SQLiteを分離。製品useLocalSessionとAppをJSDOMでmountする。apiモジュールの参照先のみ実HTTP clientへ差し替え、応答や保存をfixtureで代替していない。Cookie jarはNodeテスト側で実装。画面は検証用の本人表示1画面であり全業務画面を代替しない。

| 確認 | method/path/結果 |
|---|---|
| 未開始 | GET /api/v1/session → 401、画面は本人未開始 |
| 本人A開始 | POST /api/v1/session、profileKey=self、live → 201 |
| 閲覧 | 下部self-home→map操作でGET以外の呼出増加なし |
| 本人B切替 | POST /api/v1/session、profileKey=other、live → 201。旧GET /meのAbortSignalを中断し、実応答の遅着はAbortErrorとして拒否 |
| demo切替 | 旧live GET /meを同様に中断・拒否。demo本人AをPOST /session → 201で開始 |
| live復帰 | GET /sessionで本人Bの同一person.idを再取得 |
| 再起動 | server停止・SQLite close→同じDBを再open→server再起動→hook再mount。本人Bの同一person.idを復元、POST/DELETE増加なし |

遅着はサーバー実応答を受け取った後にテストtransportで解放待ちにして再現する。レスポンス内容を捏造せず、client generationの拒否とsignal中断を検査する。全更新呼出は本人開始3回のPOST /sessionのみ。各POSTは共通hookがIdempotency-Keyを付ける。通信断後の同じkey再送・競合は今回未確認。

## 製品ブラウザ実操作

専用worktreeの2本人（確認用の本人A/B）と専用DBで起動:

```sh
SODATERU_PORT=3245 SODATERU_PROFILES_PATH=.local/connect-base-browser/profiles.json SODATERU_DB_PATH=.local/connect-base-browser/live.sqlite SODATERU_DEMO_DB_PATH=.local/connect-base-browser/demo.sqlite mise exec -- node --experimental-transform-types server/app/main.ts
```

事前に`mise exec -- bunx vite build`成功。全体typecheckは既存のserver/exploration等の診断で失敗。追加テスト内の診断は修正し、対象fileに診断がないことを確認。Chromeの通常製品入口でA→スタート画面→B切替とreloadを確認。並行セッションが同じ127.0.0.1でcookieを書き換え得るため、モード往復は専用host `http://connect-base.localhost:3245/` で再確認した（portだけではcookieを分離しない）。

専用originでlive本人B開始→メニュー表示→スタート画面→demo本人A開始→メニューの「デモ」と本人A→live復帰→「本人Bで続ける」→メニュー→reloadで本人Bを確認。

- [demo本人A](demo-person-a-390.png)
- [live本人Bへの復帰・reload](live-person-b-reload-390.png)

## 未達

#137は閉じない。ブラウザでの遅延ネットワーク操作、業務の記録/案内が進行中の遷移、全機能画面の閲覧mutationなし、通信断の同一key再送・版競合・取消保存値・別本人共有反映は未確認。今回の再起動は自動HTTP受入のserver/DB再起動でありブラウザ端末再起動ではない。Mapbox未設定、画像一致・端末操作・全viewport等の#4 UI未達も保持。外部認証やアカウント作成の完了は主張しない。
