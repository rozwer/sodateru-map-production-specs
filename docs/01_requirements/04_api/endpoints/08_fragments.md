# 機能別契約断片

自動生成。契約の存在と機能の実装・接続完了は別。

## getSessionProfiles

`GET /api/v1/session/profiles`

ローカルで選択できる本人

サーバー設定で許可したprofileKeyと名前のみ。人物検索や公開プロフィールとは別。

## postSession

`POST /api/v1/session`

ローカル本人セッション開始

登録済みprofileKeyから本人を解決し、X-Data-Modeに対応するHttpOnly cookieを発行する。Idempotency-Keyは初回から固定し、終了後の同じキーは404。

## getSession

`GET /api/v1/session`

現在の本人セッション



## deleteSession

`DELETE /api/v1/session`

本人セッション終了


