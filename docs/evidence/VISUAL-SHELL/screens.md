# VISUAL-SHELL #172

基点 28f3bf672084ef72b51888d6178fe4493497bd41。取得: src/app/ src/ui/ src/messages.ts docs/evidence/VISUAL-SHELL/。実装thread 01a0a323-b1b4-7972-8d5a-3bdcb7169d05。

## 原本と初回照合

|画面|参照/原本状態|実ブラウザURL・commit・幅・状態|差分|修正|未確認|
|---|---|---|---|---|---|
|navigation self|03_pages/references/08_11_51.png（正式名Codex 画像 2026年9月15日 08_11_51.png）原本実画像を開いた、451×860領域|127.0.0.1:5173/#/navigation?mode=self、QA報告448a857、451×860 demo|286px panel、見出し/3項目/下nav/図版の配置は対応。図版は既存SVGで細部差、地図/プロフィール値はdemo|既存panelを保全|390px実表示済み。図版細部/通常プロフィール差は未解消、完全一致扱いでない|
|navigation main|同08_11_51 main-menu458×860原本を開いた|127.0.0.1:5173/#/navigation?mode=main、QA第一反映7ac7f68、458×860/390×844 demo|プロフィール自分/空bio、図版細部と背面状態が原本と異なる|既存右panelを保全|完全一致は未達|
|navigation community|同08_11_51 community460×860原本を開いた|5173/docs/evidence/UI-BASE/preview.html#/navigation?mode=community、QA2f4df19、460×860/390×844 fixture|panel286px、2カード、footer/nav配置対応。図版細部差、背景mapはAPI未接続fixture|既存左panelを保全|実地図/通常データ込み完全一致は未達|
|$start|page原本absent、既存UI-BASE/session-integration.mdがリハーサルwelcome/独立背景を指す|127.0.0.1:5173/#/$start、QA第一反映7ac7f68、390×844 demo|既存start-live-390.pngも実画像として開き、背景/文字/ボタン構成を照合。demo/live表示のみ異なる|PR162開始一クリックを維持、開始コード無変更|page原本absent、過去QA画像を代替比較に使用|
|friends-map（共通原因のみ）|07_41_08.png853×1844原本実画像＋ユーザー証拠画像を開いた|ユーザー提供画像1079px幅/commit不明、empty|430px全高panel内のmapと共通背景mapが二重。原本は全幅header/map/bottom records|明示presentation fullscreenを追加。feature担当が原本根拠で選択|feature採用後の実画像一致。通常データはCOMMUNITY担当|

common.jsonは「モバイル単一Sheet、広い画面単一side panel」。全ページfullscreenを示す根拠ではないため既定panelを維持。

## 共通契約

`ScreenDefinition.layout.presentation?: 'panel' | 'fullscreen'`。既定panel。fullscreenは全幅高の一面で、共通背景地図をhiddenにする（unmountせず戻りで復帰）。原本でfeature内に地図を構成する画面だけfeature担当が指定する。navigationは常にpanel。mobileHeight/mapControls/toolbar/bottomNav/headerは既存契約を維持。fullscreenのmap paddingは画面高をbottomに足さず24pxに保つ。

既存UI動作fixtureのfixture-chatをfullscreenにして検証可能にした。製品入口にfixtureはimportしない。API未接続/デモ表記を維持する。

## 検証

全体typecheckは既存範囲外のcore/companion/exploration/friends/records/reflection契約エラーで失敗。今回の変更ファイルの型エラーはなし。これを全体成功としない。

## データ受取索引

B/C/Dの既存Schema準拠サンプルは受信時にここへ記載し、該当担当へ一度転送。新しい共通fixture基盤は追加しない。未着を通常状態確認済みにしない。健康3画面は余力未実装、新規相棒制作は対象外。

初回検査: `bunx vitest run src/app/presentation.test.tsx src/app/map-bridge.test.ts` 4件成功。fullscreen→navigationでMapRendererが同じDOM/1回mountのまま再表示されることを検査。`bunx vite build` 成功（既存bundle size warning）。新commitの実ブラウザはQA反映後、未確認を成功扱いしない。

### 受領: PLUGINS / shymky / #172 comment5674438674

- 所在: 正式develop `server/plugins/{bike,disaster,pilgrimage}/{release.ts,plugin.ts}`、`docs/evidence/PLUGINS/trial-contract.md`、`server/features/plugins/http.test.ts`。提供コメントはcommit未指定。
- Schema/投入: 既存GET plugins（iconOptions）/plugin-state、session→trial→snapshot.settings+confirmed:true+stateRevisionでPOST plugin-settings。`X-Data-Mode: demo`。試用mockを明示、試用のみでは保存しない。
- 再表示: GET plugin-stateで本人installId、GET pluginsで一覧。装飾実JSON `docs/evidence/MAP-CUSTOM/settings-plugin-http.json` と `object-http.json`（同README手順）。
- 転送先: 現VISUAL-PLUGINS #186。B/C/D通常状態サンプルは他に未受領。

### QA第一反映

QA報告: 5173/API3002をdevelop 7ac7f684c4d706a4c996e2cf8ffdbd4104a079b2へ更新、提出d924a0a祖先保持。既存fixture-inputで下書き入力→fullscreen chat→戻るで同値/未保存表示を実ブラウザ確認。画像一致判定ではない。Shell自身はnavigation self451/390、main458/390、開始画面390の実画像を開き、開始1クリック→mapとmock Hinata表示を確認した。mainのプロフィールは既存demoが自分/空bioのため原本人物との差はデータ差。図版細部の差は残る。

## 第二修正: 地図中央カメラ

原本 `03_pages/references/Codex 画像 2026年9月15日 07_41_12.png` を実際に開き、下部中央は角丸カメラであると確認。map/components.jsonのplace-selected/area-info/search-place-selected nav-cameraにも明記。地図ページでは中央をカメラ、他ページでは地図へ戻るボタンにする。native撮影または写真選択で得たFile[]をPR188の`stageRecordCapture(files,scopeKey)`へ預け、`record-create?captureId`へ進む。空/キャンセル時は地図のまま。撮影/選択キャンセル・Escapeで画面履歴を進めない。API契約は追加しない。

記録側担当は VISUAL-RECORDS-CAMERA #189 / 01a0a32b-ad28-7990-9028-f4ab8e2a9845。受取は同scopeで一度take→既存draft。再読込でFileは消える既存仕様をエラー表示する。

`bunx vite build`成功。記録側testはjsdomオプション必須（初回環境未指定ではdocument is not defined）、`bunx vitest run --environment jsdom src/app/presentation.test.tsx src/features/records/capture-handoff.test.tsx`で検査。実機カメラ/権限拒否/実API投稿はまだ未確認で投稿可能とは判定しない。

### 未受領データの具体的不足（SELFから）

self-home/diary/reflection-question/history/compare/theme写真: getRecords→getRecordsRecordId→getRecordsRecordIdMedia/getPlacesPlaceId。診断: getReflectionSummary/getInsights原本4/5軸。提案: 同batchIdの2候補/写真/座標/所要時間。SELFの既存UI-SUGGESTIONS写真fixtureはPR188。現機能担当へ既存入口で反映する範囲であり、新共通mock基盤なし。

### 受領: ROUTES #25 / #172 comment5674461620

- PR194 / commit `3f1678dc1d7b3e3b19e66dd2321f4deec0c87023`。`docs/evidence/ROUTES/visual-fixture.mjs` と `visual-fixture.md`。提供時点は通常merge候補。
- 生成: `mise exec -- node docs/evidence/ROUTES/visual-fixture.mjs > /tmp/routes-visual.json`。ネットワーク/キー/DB投入不要、既存live-comparison1938689由来。東京駅3地点、2区間、2候補、geometry/steps、saved/navigating/finished。生成Schema RouteSearchInput/RouteSearchResult/RouteComparisonResult/CommonMapRoutePreview/SavedRoute AJV成功は提供者報告。
- 既存fixture応答へ同名HTTP envelopeプロパティを適用（commonMapRoutePreviewのみDTO）。同じJSONとvisual-saved-routeで再表示。写真/作者文/滞在合計/recordId/追加条件根拠なし。実serverにpreviewIDなし、保存APIへ送れない。mock表示必須、実保存証拠ではない。
- 転送済み: VISUAL-MAP-EXPLORE #174の実thread。

### Cから既存実接続の所在（#172 comment5674461189）

PLACES/MAP-CUSTOM→CONNECT-MAP #134（C親#5/#27）、ROUTES→CONNECT-ROUTES #138（#25）、PLUGINS→CONNECT-PLUGINS #144（#28/#29/#30/#38）。docs/evidenceの各featureに正式API証拠。画像一致/画面接続の完了証拠と混同しない。

### SETTINGS担当不足（#172 comment5674463052）

VISUAL-SETTINGS #191は既存UI-SETTINGS/preview/fixture.tsのSchema準拠profile/settings通常値で表示例を用意。本人icon Blob/停止place photosが不足、非健康統計operationが未登録。こちらで新Schemaや独自集計を作らず担当証拠へ継続。

### 第二QA反映・Shell自身の実操作

QA HEAD `2f4df19f46afcbc42986b403ce2df71aade82882`、提出`5b886a043fab8251ca850cb969173d93708e2592`祖先保持。既存5173/API3002、390×844、demo。中央カメラ→dialogのキャンセル→#/mapを維持。再open→「端末の写真を選ぶ」file chooserで独立背景素材`src/ui/assets/start-background.png`を選択。

`#/record-create?captureId=5195b0f5-bdf7-4696-b5e9-84c8bf91decf`へ遷移し、画像読込成功→本文入力→確認→戻って編集で同画像と同本文の保持を確認。使用画像は表示用の独立素材、撮影した実写真ではない。Shell担当はこの下書きを投稿していない。記録API保存/再表示は#189担当へ証拠とともに引継ぎ。実機カメラ・OS許可拒否は未確認。地図の実MapboxとモックHinataラベルも表示維持。

共通fullscreenは同QA既存`/docs/evidence/UI-BASE/preview.html#/fixture-chat`でx=0,y=0,width=390,height=844、mapHidden=trueをDOM矩形と実画像で確認（API未接続の明示fixture）。最初の1280×720でも同様に全面矩形。元UIの完全一致を意味しない。

最終操作: 390×844で撮影dialogをEscape取消→#/mapを維持。community原本幅460のpanel286×860、390では横overflowなし。全体typecheckは二度目もcore/companion/exploration/friends/records/reflectionの既存契約エラーで失敗、今回src/app/src/ui変更のエラーなし。

## 引継ぎ境界

共通コンテナ/カメラ入口の変更・QA反映は完了。全ページ画像一致は宣言しない。navigationの図版細部/通常プロフィール、原本のないstart、実機撮影/OS拒否、記録API保存の証拠は未達を上記のとおり残す。各featureのfullscreen採否は担当が原本根拠を記録。健康3画面と新規相棒制作は対象外。B/D未着サンプル待ちでclaimを保持せず、受領済みPLUGINS/ROUTESを各担当へ渡して終了する。
