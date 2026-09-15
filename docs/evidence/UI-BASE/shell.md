# UI-BASE.shell 先行提供

2026-09-15。UI-BASE #4、branch `rozwer/4-ui-base`、base `26a2532`。
本書は共通shellの部分提供。UI-BASE全体・各機能画面・実API・実地図の完成報告ではない。

## 提供する入口

- `src/app/contracts.ts`: `ScreenDefinition` と `ScreenProps`。機能は取得pathの `screens.tsx` から `screens` をexportする。共通入口が自動登録し重複IDを拒否する。
- `src/app/useScreenState.ts`: `[value,setValue]`。画面/paramsと本人scopeで分離し、画面往復時に値を保持する。一画面の入力は一つのオブジェクトへまとめる。
- `src/app/api.ts`: COREの `createApiClient` を一度生成した `api`。型・HTTP・再送規約はCOREの所有。CORE未統合時点では利用不能で、独自の通信処理は用意していない。
- `src/app/map-bridge.ts`、`useMapBridge.ts`: 常時mountするrendererと共有するcamera/view/padding、候補、保存場所、経路、区間を分けた軌跡、選択購読。rendererはUI-MAP所有。
- `src/ui/`: 単一Sheet、Button、Status、Icon、Chat、tokens。Chatのtoolbar/childrenへ音声・履歴・候補を差し込める。
- `src/messages.ts`: 共通文言と機能別文言断片。参照画像を製品素材として配信しない。
- Vite `/api` proxyはCORE指定の `127.0.0.1:3001`。`SODATERU_API_ORIGIN` で起動先を明示変更できる。

地図は既存 `03_map-ui.md` のowner別操作を維持。Issue #8/#9/#10で合意した補完は `route-planner` / `route-navigation`、保存routeIdだけの再表示、代替候補と選択購読。Issue #11/#16の補完は保存場所 `showPlaces` と欠測を結ばない `showTrack`。API fieldの追加ではなく表示境界である。

## ブラウザ確認

起動: `mise exec -- bunx vite --host 127.0.0.1 --port 5174 --strictPort`。
プロダクト: `http://127.0.0.1:5174/`。
明示したUI fixture: `/docs/evidence/UI-BASE/preview.html#/fixture-input?date=2026-09-15&timeZone=Asia%2FTokyo`。
fixtureは「デモ」「UI fixture / API未接続」を表示する。DB/本人セッションは未接続。scopeは `fixture-person-a:demo` / `fixture-person-b:demo`。

| 操作 | 確認結果 |
| --- | --- |
| 下書き入力→Chat→戻る | 「9月15日の未保存メモ」、date、timeZoneを保持。元のChat起動ボタンにfocus復帰 |
| Chat入力→送信→取消 | 処理中と取消を表示、送信buttonはdisabled。取消後に再入力可能。API保存は未検証 |
| 一覧末尾→メニュー→Escape | 末尾buttonへfocus復帰、scrollTop=256、下書きを保持 |
| fixture本人切替 | 旧下書きを画面・DOMから除去、入力は空。HTTP要求取消はCORE接続待ち |
| 320×740 | 横overflowなし、下部3操作とスクロール内メニューへ到達 |
| 文字200% | root 32px、横overflowなし。末尾のスタート画面へ到達。下部nav高さ約105pxを計測して本文余白へ反映 |
| 1440×900 | 左side panelと中央下部navを表示 |
| メニュー項目→別画面→戻る | 最新コードを完全再読込後、「スタート画面」buttonへfocus復帰。DOMを作り直すメニューでも名前/IDで復元 |

モバイルの全幅Sheetの背後にあったメニュー/現在地操作を非表示にし、同座標の閉じる操作との重なりを解消した。

ビルド: Vite production build成功。限定strict TypeScript検査成功（共通shell/fixture/Chat）。`vitest run src/app/map-bridge.test.ts` は3件成功: 一時候補の期限切れと保存案内の独立、本人scope切替時の全表示除去、owner別選択購読/解除。CORE未提供のapi.tsは型解決確認待ち。

## 参照画像との照合

正本: `docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 08_11_51.png`。
main-menuの458×860、self-modeの451×860、community-modeの460×860を実際に開き、DOM/CSSで右メニュー/左モード面、白背景、青緑の選択面、行順、アイコン、下部3操作を照合した。

証拠: `main-menu-fixture-458.png`、`self-mode-fixture-451.png`、`community-mode-fixture-460.png`、`community-mode-fixture-320.png`、`main-menu-fixture-text-200.png`、`self-mode-fixture-1440.png`。
照合で見つかった390pxのメニュー文言の折返し、行間、見出し位置、200%時の下部navとの重なりを調整した。

残る差分: 実Mapbox背景・実プロフィール写真は提供待ち。装飾イラストはSVGで構成を再現しており参照絵との細部一致は未達。主メニュー背後の元画面を含め、各実画面を接続した後に再照合する。画像全体の一致を合格としていない。

## 残る受入

COREの本人開始/復元/live-demo切替と、旧要求取消・遅着拒否の実HTTP確認。UI-MAPの実描画、選択、padding、再起動後camera復帰。実端末ソフトキーボード/reduced motion、削除済み詳細への復帰回避。各遷移先の機能画面登録と画像照合。これらが残るためIssue #4は閉じない。
