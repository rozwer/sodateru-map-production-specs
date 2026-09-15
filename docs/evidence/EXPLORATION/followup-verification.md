# EXPLORATION-FOLLOWUP 接続確認
Task EXPLORATION-FOLLOWUP / Issue #102。独立worktreeと検証DB、標準 server/app/main.ts、正式 packages/api-client/index.ts を使用。共有デモDB/プロセスは変更していない。

## 確認済み
- live-storable-route.mjs/json: 実Nominatim storable候補→場所採用→実Mapbox徒歩preview(storable)→明示保存→別OSプロセス再起動→同一経路/再送。全チェック成功。AI呼出しなし。
- live-history-restart.mjs/json: #26で実相談と履歴linkが成功した検証DBのコピーを標準mainで開き、同じ保存consult会話が残り、result/resultId/expiresAt=null、resumeAction=search。実相談生成の反復なし。旧結果は15分経過後でもあり、TTL単独の検証とは区別する。
- 正式UI: Vite build成功後、上記storable経路の検証DBで独立mainを起動。ブラウザーで本人/デモOFF→地図→正式 #/route-results?routeId=... を開き、保存経路「実APIから保存した徒歩経路」、徒歩17分・距離1.4km、地図上の経路線を確認。生成/保存を再実行せずDB再表示を確認した。画像は本Taskのブラウザー出力で視認した。検証タブを閉じ、専用serverを終了。

## 発見生成の未達と原因
latest uniqueItems対応後も標準main/生成clientで実discover Runはfailed/UPSTREAM_FAILED。provider-diagnostic.mjsは共通runStructuredをそのまま呼ぶ検証専用wrapperで、Schemaエラーのtype/code/status/paramだけを取得（材料本文・認証情報は記録しない）。
provider-diagnostic.json: HTTP400 invalid_json_schema、sources[].url.anyOf[0]のformat uriが未対応。共通担当#103へIssue通知し、修正PR235/develop a8e577675e4c532ec8fe55ed962be4b6f841edc8が届いた。取込み後の実再確認はこれから。
通常実行: node --env-file=<正規主clone>/.env --experimental-transform-types docs/evidence/EXPLORATION/live-discovery.mjs
診断時のみ --diagnose。live-discovery-before-diagnostic.jsonは初回失敗、live-discovery.jsonは直近結果。

## 残る受入
実discover生成→採用→出典/反応の保存→OS再起動再表示と正式UI。場所/写真の実参照・設定変更・取消等は既存成功検査を反復せず具体的な接続懸念に絞る。全Issue/実端末音声の完成はまだ主張しない。
