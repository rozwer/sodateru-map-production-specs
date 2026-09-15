# VISUAL-SHELL #172

基点 28f3bf672084ef72b51888d6178fe4493497bd41。取得: src/app/ src/ui/ src/messages.ts docs/evidence/VISUAL-SHELL/。実装thread 01a0a323-b1b4-7972-8d5a-3bdcb7169d05。

## 原本と初回照合

|画面|参照/原本状態|実ブラウザURL・commit・幅・状態|差分|修正|未確認|
|---|---|---|---|---|---|
|navigation self|03_pages/references/08_11_51.png（正式名Codex 画像 2026年9月15日 08_11_51.png）原本実画像を開いた、451×860領域|127.0.0.1:5173/#/navigation?mode=self、QA報告448a857、451×860 demo|286px panel、見出し/3項目/下nav/図版の配置は対応。図版は既存SVGで細部差、地図/プロフィール値はdemo|既存panelを保全|390px/新commit表示は後述、完全一致扱いでない|
|navigation main|同08_11_51 main-menu458×860原本を開いた|未確認|未確認|既存右panelを保全|新commit実表示|
|navigation community|同08_11_51 community460×860原本を開いた|未確認|未確認|既存左panelを保全|新commit実表示|
|$start|page原本absent、既存UI-BASE/session-integration.mdがリハーサルwelcome/独立背景を指す|未確認|新デザイン不可|PR162開始一クリックを維持、開始コード無変更|原本代替の画像/実表示照合|
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
