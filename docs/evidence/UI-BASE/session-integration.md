# UI-BASE: CORE実セッションと画面登録の接続

## 対象

- 基準: develop `6dac91f4fba8bb28506c73efd39c4db1518a963d`（UI-BASE shell PR #47、CORE v0.3.0を含む）。本書と同じ提出commitで確認。
- worktree: `/Users/roz/.codex/worktrees/ui-base-4`、branch `rozwer/4-ui-base`。
- API: `mise exec -- node --experimental-transform-types server/app/main.ts`、`127.0.0.1:3001`。
- Web: Vite `127.0.0.1:5174`、`/api` proxyで同じAPIへ接続。
- live DB: `.local/app.sqlite`、demo DB: `.local/demo.sqlite`、本人設定: `.local/profiles.json`。いずれも当worktree相対。DB/本人設定・secretをcommitしていない。
- 初期本人「自分」と、本人切替検査用にローカル設定へ追加した「切替確認用」を使用。業務データのサンプル完了とは扱わない。

## 実ブラウザで確認した操作

1. 通常入口 `/` がCORE `getSession` / `getSessionProfiles` を呼び、未開始では本人を明示選択するまで開始ボタンを無効にする。
2. 「自分」を選び開始。CORE `postSession` の本人で地図shellを開き、メニューに「自分」を表示。
3. APIプロセスを停止・再起動してブラウザ再読込。同じDB/cookieの本人「自分」とメニューを復元。
4. メニュー→スタート画面→demo ON。開始前は旧本人を表示せず、demoの本人選択を要求。「切替確認用」を選択後、メニューとデモバッジが切り替わる（`session-demo-390.png`）。
5. `session.html#/settings` は**実セッションAPI＋検査用の下書き/地図表示**。下書き入力→スタート→同じ本人で続ける→設定へ戻り、下書きが保持される。
6. 同じ検査画面からdemo OFF。旧入力DOMが0件になり、liveの「自分」へ戻る。設定を開くとscopeはliveの本人で、下書きは空（`session-live-reset-390.png`）。
7. `header:none/contentPadding:none/bottomNav:false` で共通header DOM 0件、本文左右padding 0px、nav非表示。dialogのタイトル・スクロール・Escapeは保持。
8. API停止中に通常入口を再読込すると通信失敗と再試行を表示（`start-api-error-390.png`）。`localhost:5174`でAPI復帰後に再試行し、保存済セッションの地図shellへ復帰。
9. 320px/390pxで本人select・モードswitch・開始操作へ到達でき、document幅とscrollWidthが一致。共通shellの広幅・文字200%・focus/scroll/date・Chat検査は `shell.md` を参照。

途中、127.0.0.1の再試行で本人再選択へ戻った。並列ローカル起動が同じhostのcookieを使う可能性を切り分けるため、localhostの別cookie領域で停止→再試行を確認し、復帰に成功した。APIから別本人を推測して埋める処理はない。

## 実装の境界

- 共通clientは `src/app/api.ts` の一つだけ。COREがcookie・X-Data-Mode・取消と遅着応答の拒否を所有。
- SessionRootはサーバー本人とmodeからscopeKeyを作る。切替時は旧画面/bridgeを破棄。同じ本人でスタートへ戻る場合は入力を保持する。
- start背景とProviderMarkは、ユーザーが利用を許可したリハーサル `docs/ui/reference/start-background.png` と既存welcome画面の構成を基準とする。画像全体を画面として貼らず、背景・文字・操作を分離。Google/Apple/OpenAI接続はCOREローカル本人方式では未提供のため、元画面同様に無効化して説明を表示。
- `src/features/companion/MapCompanion.tsx` の単一地図への注入入口を追加。相棒の実装が統合されたときに利用され、onActivateはai-exploreへ遷移。
- 設定保存通知 `sodateru:settings-changed` でgetMeを再取得し、本人名/画像を再表示。表示設定の正式型はSETTINGS統合後の残件。

## 検証と未達

- BASE入口を対象にstrict/noUncheckedIndexedAccessの型検査成功。Vite build成功。
- 全体 `bunx tsc --noEmit` はPLACESの未統合 `server/information/service.ts` と配列indexの型エラーで停止。COREへ結果を通知。BASEのエラーは出ていない。
- 通常入口の実MapboxはUI-MAP統合待ち。現在の未接続表示を地図機能の完成とは扱わない。
- 各業務画面の全受入、相棒の実データ表示、設定フォント/動作低減の全体適用は未達。Issue #4は継続。
