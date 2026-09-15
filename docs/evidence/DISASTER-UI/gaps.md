# 防災 本番/リハーサル不足表

起点: origin/develop 55a6ff2。担当Issue #223（#219から共通MapRendererを分離して承継）、範囲はreceipt参照。

参照元: /Users/roz/Desktop/sodateru-map-rehearsal/src/features/extensions/{DisasterApp.tsx,disaster.css,disaster-map.ts}。
原本: docs/01_requirements/03_pages/plugin-{trial,install,manage}/。plugin-trial画像はバイクの条件入力画面で、防災固有画像ではない。防災固有の構図はリハーサル実装を根拠にする。

|操作|リハーサル|作業開始時の本番|今回の接続先/未完|
|---|---|---|---|
|開く/戻る|専用header・地図中心・panel|汎用fixtureカードのみ|disaster-mapをplugins登録担当へ提供|
|地域|現在地/地域/地図中心|設定DTOにregion/boundsあり|地域選択・地図中心|
|レイヤー|地形/流域/洪水/津波/雨雲|洪水/陰影起伏/降水解析のDTO|提供3種と欠測を実描画|
|凡例/詳細|出典/時点/凡例|API DTOに全てありUIなし|レイヤーの意味/時点/失敗/欠測を表示|
|避難所/備え|施設詳細/集合先/メモ|対応API DTOなし|未接続、既存情報として偽らない|
|流域/上流下流|BasinATLAS地形style|本番生成DTOなし|未接続。別資産利用判断が必要|
|気象速報/雨雲再生|警報速報と時間軸|降水の単一解析時点のみ|単一解析時点を正しく表記|
|導入/停止|install privateState|PluginSetting/DisasterView.map|データ担当の既存API adapter経由|

リハーサルCSSの局所クラスとレイアウトを移植。map-host等への全体副作用は移植しない。地図は既存Mapbox renderer、画像は生成DTOから提供されるSceneImage。mock/liveを混ぜない。
