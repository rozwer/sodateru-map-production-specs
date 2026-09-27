# CONNECT-FRIENDS 二本人の共有・取消・再取得

2026-09-27。基点 `3681e002433b69a30d57f5cfba59b5301913787f`。#142の部分受入証拠であり、Issue全体は未完。

## 環境と本人

専用worktree `/Users/roz/Documents/sodateru-connect-friends-0927` の通常 `server/app/main.ts` と `src/app/main.tsx` を使用。古いstage-live.pyの別commit混成環境は使用していない。

- API: 127.0.0.1:3115、PID85503、再起動後95657。
- Vite: 127.0.0.1:5292、strictPort、PID87390。Vite/API双方のlsof cwdはこのworktreeと一致。
- DB: `.local/friends-acceptance/live.sqlite` とdemo.sqlite。本人設定は同directoryのprofiles.json（secretは非公開）。
- 所有者: `http://friends-connect.localhost:5292`、alice=`friends-live-alice`。
- 閲覧者: `http://friends-viewer.localhost:5292`、bob=`friends-live-bob`。
- 両方とも通常開始画面で本人を選択しデモOFF。ホスト名別のcookieを使う。
- seedのみAPIスクリプト。手入力の検証地点と検証本文、68byteの1pixel PNGを登録。実写真を撮影した証拠ではない。

最初の申請/承認とpicker未保存監査は127.0.0.1:5292で行った。並行セッションとのcookie衝突可能性があるため、この部分を厳密なブラウザ本人分離PASSとしない。共有保存以降は専用ホストに移し、開始画面・所有者本文・閲覧者の他者記録という具体的状態を確認した。5195は他プロセス使用中だったため停止せず未使用5292で起動し直した。製品コードへのホスト埋込みなし。

## 実操作と結果

|操作|実API/保存/再表示の確認|
|---|---|
|aliceがbobへ申請|通常プロフィールで申請中。bob本人へ切替後のみ承認ボタンが出た。bob承認後は友達。API取得で同一friendshipIdのaccepted v2。上記cookie限定あり。|
|picker完了|alice記録はprivate v2、sharedWith=[]のまま。bob一覧/map0、本文/媒体404。pickerは共有保存しない。|
|隔離ホストaliceでbob選択→共有する|画面は「共有範囲を保存し、再取得した内容を確認しました」。recordId `ui-friends-live-record-alice` v3、selected、sharedWith=[friends-live-bob]。|
|隔離ホストbobの友達地図|aliceの本文と媒体を表示、地点データ1件。別cookie API監査で本文/媒体200、media68byte、shared-records/map双方1件。|
|bobをプロフィールへ進め、aliceが自分だけにする|aliceの保存成功表示、同一recordId v4 private、sharedWith=[]。bobがcacheされた友達地図へ戻ると本文/媒体が消え、現在見られる共有記録なし・地点0件。|
|取消後API監査|bobの本文GET404、媒体GET404、共有一覧/map0。友達関係はacceptedのまま（共有取消と友達解除を混同していない）。|
|APIプロセス停止→同じDBで再起動|同一recordId v4 private/空共有相手、同一friendshipId accepted v2を取得。owner画面は自分だけ/0人、viewer reloadでも本文/媒体なし・地点0件。|

`live-audit.json` が各段階のID・版・範囲・ステータスを記録する。監査clientは各本人のCookieを別々のクロージャで保持し、browserのcookieを流用しない。ブラウザ操作のmethod/path/body/回数を全量収集した証拠ではない。

## 再現

初回は専用の空DBと2本人profiles.jsonを用意する。既存個人DBへ接続しない。

```sh
SODATERU_DB_PATH=.local/friends-acceptance/live.sqlite SODATERU_DEMO_DB_PATH=.local/friends-acceptance/demo.sqlite SODATERU_PROFILES_PATH=.local/friends-acceptance/profiles.json SODATERU_PORT=3115 mise exec -- node --experimental-transform-types server/app/main.ts
SODATERU_API_ORIGIN=http://127.0.0.1:3115 mise exec -- bunx vite --host 127.0.0.1 --port 5292 --strictPort
mise exec -- node --experimental-transform-types docs/evidence/CONNECT-FRIENDS/live-seed.mjs
# UI操作の該当段階でread-only監査（認証session作成を除く）
mise exec -- node --experimental-transform-types docs/evidence/CONNECT-FRIENDS/live-audit.mjs selected
mise exec -- node --experimental-transform-types docs/evidence/CONNECT-FRIENDS/live-audit.mjs private
```

seedはPUBLIC profile/検証地点/記録/媒体を専用DBへ作成する。初回専用。profiles例のkeyはalice/bob、idはfriends-live-alice/friends-live-bob、version=1、secretはランダム32byte以上。session/secretを成果物へ含めない。

## 未達

- #14の指定画像・全幅/文字200%等・実Mapbox。今回はtoken未設定なので「地図の接続設定がありません」を表示。地点件数とmap APIは確認したが実地図PASSではない。
- #142のAI比較の左右/拒否/共有取消後引用、共有行程の実取得・条件検索・本人保存、テーマ。
- public共有、友達解除と再承認、版競合・再送・遅着・部分失敗・利用不能、live/demo往復、媒体の全閲覧条件。
- 全操作の通信呼出回数/params/body照合。今回の結果でIssue全体を閉じない。

UI修復は既存PR #333で統合済み。このPRは通常entry・現在providerで初めて揃えた部分受入の再現手順と監査を追加する。製品の動作を縮退させていない。
