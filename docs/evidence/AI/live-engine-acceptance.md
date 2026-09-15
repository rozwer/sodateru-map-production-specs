# 本番共通AIの実保存・再起動再取得

2026-09-15、develop 6731fceの正式server/app/main.tsと正式OpenAPIで実行。CODEX_AI_MODEL=gpt-5.6-luna、推論強度の上書きなし。

再現：mise exec -- env CODEX_AI_MODEL=gpt-5.6-luna node --experimental-transform-types docs/evidence/AI/live-engine.ts --fresh-default-style

- 新規の一時DB/合成本人でsession作成、正式SETTINGS HTTPでAI許可。
- MAP-CUSTOMの公開DEFAULT_STYLEを入力。本番mapstyle登録が保存設定との一致を検査し、共通会話HTTPでSDKを実行。
- 22,785msでcomplete。requestId 290e9b19-0a13-42d8-96d6-b07a4f33c865。
- 結果/model/promptVersion/attemptを保存し、サーバーを停止して同じDBで別プロセス起動。結果・モデル・attemptが一致し、保存された本人発言も入力本文と一致。
- 結果と実行情報はlive-engine.json。

## 残る境界
sourceRefs=[]の用途なので、実INFORMATIONの参照失効/変更受入ではない。音声実機確認も含まない。
/map-settings GETは統合タイミング差で正式契約に未反映。404実証をmap-settings-main-blocker.jsonへ保存しCORE #3へコメント5674356087で依頼済み。地図設定取得/採用の通常画面が完成したとは扱わない。
