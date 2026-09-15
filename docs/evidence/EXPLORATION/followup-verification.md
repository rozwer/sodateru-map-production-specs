# EXPLORATION-FOLLOWUP 接続確認
Task EXPLORATION-FOLLOWUP / Issue #102。独立worktreeと検証DB、標準 server/app/main.ts、正式 packages/api-client/index.ts を使用。共有デモDB/プロセスは変更していない。

## 確認済み
- live-storable-route.mjs/json: 実Nominatim storable候補→場所採用→実Mapbox徒歩preview(storable)→明示保存→別OSプロセス再起動→同一経路/再送。全チェック成功。AI呼出しなし。
- live-history-restart.mjs/json: #26で実相談と履歴linkが成功した検証DBのコピーを標準mainで開き、同じ保存consult会話が残り、result/resultId/expiresAt=null、resumeAction=search。実相談生成の反復なし。旧結果は15分経過後でもあり、TTL単独の検証とは区別する。
- 正式UI: Vite build成功後、上記storable経路の検証DBで独立mainを起動。ブラウザーで本人/デモOFF→地図→正式 #/route-results?routeId=... を開き、保存経路「実APIから保存した徒歩経路」、徒歩17分・距離1.4km、地図上の経路線を確認。生成/保存を再実行せずDB再表示を確認した。画像は本Taskのブラウザー出力で視認した。検証タブを閉じ、専用serverを終了。

## 発見生成の未達と原因
latest uniqueItems対応後も標準main/生成clientで実discover Runはfailed/UPSTREAM_FAILED。provider-diagnostic.mjsは共通runStructuredをそのまま呼ぶ検証専用wrapperで、Schemaエラーのtype/code/status/paramだけを取得（材料本文・認証情報は記録しない）。
provider-diagnostic.json: HTTP400 invalid_json_schema、sources[].url.anyOf[0]のformat uriが未対応。共通担当#103へIssue通知し、修正PR235/develop a8e577675e4c532ec8fe55ed962be4b6f841edc8が届いた。取込み後、通常モード（診断wrapperなし）で実Luna 27,615ms→Run complete→一般説明1出典のカード保存/採用参照→OSプロセス再起動→同一カード/出典/Run/採用再送→非表示がすべて成功した。live-discovery.jsonが成功証拠。
通常実行: node --env-file=<正規主clone>/.env --experimental-transform-types docs/evidence/EXPLORATION/live-discovery.mjs
診断時のみ --diagnose。live-discovery-before-diagnostic.jsonは初回失敗、live-discovery.jsonは直近結果。

## 残る受入
実discoverと保存の未達は上記実確認で解消。場所固有のUI結果と残る画面の問題は以下へ記載する。全Issue/実端末音声の完成はまだ主張しない。

## 場所固有の実UIと根拠更新
- inspect-ui-discovery.mjs / live-discovery-ui.json: 正式discovery画面で保存場所を選び、AI OFFから明示同意（AI/位置利用ON）を経て実Lunaを1回実行。place-specific出典1件、同じplaceのSourceRef、Run complete、カードとappliedRefs保存を実DBで確認。
- 同意完了でparamsなしdiscoveryへ戻り、元routeのカードが見えない不具合を#136へ通知。ブラウザーで元routeに戻るとカードが復帰し、UIの保存反応→reload→保存一覧→同じカード/知識/対象の出典を再表示できた。修正前の回避操作であり、同意復帰の受入は未達のまま。
- live-source-change.mjs/json: 上記実生成カードのDBコピーでplaces PATCHにより元placeの版を更新。古いカードGET、採用POST、反応POSTが全て409 SOURCE_CHANGED。元DBは変更せず、AI再生成なし。
- 実サーバー/ブラウザーは検証ごとに終了済み。引継ぎ元DBと固定card/Run IDはlive-discovery-ui.jsonに保存。

## 現在の残件
#136の同意復帰修正を取り込み、既存カードだけで直接再表示を確認する。写真/音声/方位等の実端末UI条件は#136/#103の担当受入と連携する。API・根拠・保存の成功を元UI全体の完成とは扱わない。
