# UI-PLUGINS 実装・確認

## 作業範囲

- Issue #18。`rozwer/18-plugins-ui`、起点 `26a25329111af5e72ee42c3120c06993adbeae91`。
- `src/features/plugins/`、`src/features/feature-requests/`、本証拠ディレクトリを正式取得。作成末尾の既知例外後、専用worktreeで通常 `task:verify` が成功。
- UI-BASEが画面登録・共通通信・トークン・Sheetを所有。UI-MAPがMapPreviewを提供。固有UIから業務処理・SQLは変更しない。

## 画像の対応

| 画面 | 実際に開いて確認した画像 | 根拠 |
|---|---|---|
| plugin-detail / plugin-trial / plugin-install | `docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 08_23_14.png` | 左・中央・右の順 |
| plugin-manage / plugin-update / plugin-conflict | `docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 08_23_21.png` | 左・中央・右の順 |
| feature-requests / feature-request-edit | `docs/01_requirements/03_pages/references/feature-request-flow-v2.png` | 一覧・入力・投稿完了一覧 |
| plugin-icon | `screenshots/icon-selection-draft-390.png` | 仕様相談タスク経由で2026-09-15にユーザーが配置を承認。承認後の実装画像は `icon-selection-390.png` |
| plugin-store | リハーサル `docs/requirements/mockups/grow-app-store-v1.png` / `docs/evidence/R-THEMES/ia-extension-store-390.png` | 専用本番画像なし。既存リハーサルを元に構成可能というユーザー追加指示をIssue #18に記録。既存DOMは `src/features/extensions/entry.tsx`、カードは一行一件 |

参照UI画像は製品の画像素材に使用しない。写真と地図と操作は別要素とする。共通MapPreviewへ同一cameraの比較を渡し、凡例はDOMで表示する。

## 提供する画面部品

9ページと承認済みアイコン選択の表示・入力・状態をcontrolled Viewとして提供する。`src/features/plugins/screens.tsx` が共通globへ登録する。全画面に「UI検査・API未接続。操作は再読込で初期化されます。」と常時表示する。業務APIは後続接続である。

- ストアの名称/分類絞り込み、導入済み・要望への入口。
- 詳細、試用条件、同一のMapPreview上での自動before/after、導入前確認。
- 管理のON/OFF・アイコン・地図・条件・更新・相棒への操作callback、更新比較、版戻し/削除、競合の明示選択。アイコン選択は呼出元が候補/選択値を渡し、確定前プレビュー・取消・保存・送信中/失敗を表示する。
- 公開投稿/自分の下書き、件数を含む共感ボタン、本人の編集/削除、依頼フォーム共用、固定表示名/本文200文字/公開範囲の入力部品。
- 失敗時の再試行、入力保持、0件、送信中、削除確認。サーバーの失敗・永続化は未検証。

`usePreviewPhase` は2.6秒で導入前後を切り替える。非表示画面・非表示タブでは停止する。MapPreviewのbridgeを作り直さず表示材料だけを差し替える。本文文字数はUnicodeコードポイント単位で、201個の絵文字入力を200個へ制限した。

## 2026-09-15 の表示確認

確認環境：UI専用fixture `127.0.0.1:5188`、Codex in-app browser。`dataMode=demo` と画面右下の `UI fixture / API未接続` を常時表示。DB/本人session/業務APIは使用していない。MapPreviewの背景だけは実Mapbox、地点・線は明示した検査データである。

- UI-BASE：PR #47 `c6b73e3` の実ソースを読取利用。`layout={header:back,bottomNav:false,background:soft}` を詳細/試用/導入/管理/更新/競合/要望編集へ適用。ストアと要望一覧は下部navあり。
- UI-MAP：提供元worktreeの実MapPreview。再render循環の修正後、Mapbox読込完了・地点/線・attributionを確認。先行renderer統合commitは未提供。
- 390×844：9ページの主要表示を指定画像と照合。管理のOFF→地図ボタン無効、競合の未選択→確定不可/選択後→確定可、要望共感12→13、下書き0件、ストア分類と検索0件を確認。試用は無操作で導入前0件→導入後2地点/1経路へ変化し、両方でcanvas1個。画面移動後のhidden canvasは0個。失敗表示で車種を大型二輪へ変更して再試行しても選択が残る。これらはViewの状態変化であり、API成功の証拠ではない。
- 320×844・文字200%：要望入力、公開範囲、末尾CTAまでスクロール、入力保持を確認。SheetのscrollWidth/clientWidthは共に318px。font-sizeをremにし、カウンター/選択肢/投稿headerを折返し可能にした。
- 1440×900：左側Sheetの試用条件とCTAを確認。
- 操作で初めて現れる試用プレビューと無効化対象へフォーカスを移し、画面を戻した後も他のページの地図を残さない。管理の地図は共通rendererの最低120pxを確保し、地域ラベルをattribution・模擬注記と重ねない。

画像は `screenshots/`。管理・更新・競合選択・ストア・要望一覧・要望編集・試用自動切替と文字200%を保存した。出典未提供のavatarは写真を捏造せず代替iconを表示している。

### 検査コマンド

```sh
mise exec -- bunx tsc --noEmit --strict --noUncheckedIndexedAccess --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --jsx react-jsx --skipLibCheck src/features/plugins/views.tsx src/features/plugins/PluginIconView.tsx src/features/feature-requests/views.tsx src/features/plugins/usePreviewPhase.ts
UI_QA_BASE_ROOT=/path/to/ui-base UI_QA_MAP_ROOT=/path/to/ui-map mise exec -- bunx vite build --config docs/evidence/UI-PLUGINS/vite.config.ts
UI_QA_BASE_ROOT=/path/to/ui-base UI_QA_MAP_ROOT=/path/to/ui-map mise exec -- bunx vite --config docs/evidence/UI-PLUGINS/vite.config.ts
```

strict検査、fixture buildは成功。buildのMapbox同梱bundleサイズ警告あり。共有UI/MAPの統合後は2つのROOTを省略し同じcheckoutから起動する。`browser.html#/plugin-store` などpageIdを指定する。`?font200=1` は表示拡大確認、`?failure=1` はプラグイン部品の失敗表示確認用。fixtureの保存・投稿・削除はReact stateだけを変える。API・DB・localStorageへの保存は行わず、リロードで初期検査値に戻る。

## 追加した連続操作の確認

同じ390pxブラウザで、以下を画面操作とアクセシビリティツリーで確認した。すべてUI fixtureの検査であり永続性の証拠ではない。

- 管理→アイコン選択→ピンを保存→再度開いてピン選択済み。取消は保存値を変えない。
- 管理→条件変更→東山公園/大型二輪/高速道路あり→試用→確認画面へ3条件を引継ぎ→保存→管理。
- 更新v1.2.0→v1.3.0→更新なし/更新ボタン無効→前の版へ戻す→v1.2.0。
- 機能削除の確認→削除→管理一覧から対象だけ消え、背景の模擬地点1→0。カタログには未導入として残る。
- 新規要望→下書き保存→自分の下書きから編集→表示名固定/本文保持→本文変更して公開→公開一覧へ反映→削除確認→削除。
- 他者の「人に頼む」→共用依頼フォームへ本文引継ぎ。宛先や外部送信は追加しない。

上記のfixtureには通常地図の模擬表示を加えたため、通常地図のcanvas1個が常時存在する。先のcanvas1個という確認はプレビュー単体の検査時点を指す。業務データの地図表示は後続接続で検証する。

## 実接続へ引き継ぐ残件

- PLUGINS #28 v3の確定fragment、生成済み共通clientとHTTP実装の統合後、各画面の検査stateを実controllerへ置換する。試用snapshotのsettings/stateRevisionを導入確認へ引継ぎ、確定時のみ保存する。fixtureのReact stateによる条件引継ぎはこの経路の代替ではない。
- BIKE #29 / DISASTER #30 / PILGRIMAGE #38の実取得・保存結果を共通MapBridgeへ接続し、停止/削除/競合時は指定ownerKeyだけを消す。意味別GeoJSONとbounds付きimageの地図側公開署名は #8 と調整中。
- FEATURE-REQUESTS #31のdisplayName/title/タグ/共感/guideUrl補完と実APIを待ち、投稿→再読込→編集→削除、非公開分離を確認する。
- GET /plugins.iconOptionsの正式6候補を使う保存/地図マーカー反映、3種類の固有条件・出典/時点、更新失敗の旧版保持、本人/モード切替と通信取消、通常地図への復帰を実接続で確認する。
- 参照画像の地図内の意味別色/凡例と実表示、未提供のGitHubガイドを完了扱いにしない。ユーザー方針によりUIと実接続を分離する。Issue #18のfinish/closeは正式なUI完了定義と対応する接続後続Issueの確定後に行い、実API/保存の未完を引き継ぐ。

## 共通hookの修復と先行提出

`task:verify` はUI-PLUGINS/rozwer/claimed/取得3pathを返して成功。stageも取得3pathだけだが、`origin/develop` の正常fast-forward後にcommitすると、固定したclaim時baseとの差分へCORE等の既統合変更を含めて `Changed paths outside claim` と拒否した。共通修復Issue #62 / PR #63の修正を含む `2332231` を通常fetch/fast-forwardで取り込み、同じstageと取得範囲で `task:verify` 後に一度再試行。正規commit `e333b36` が成功した。独自hook変更・検査回避・claim再取得・変更破棄は行っていない。UI-BASEは `6dac91f` を取込済みで、fixtureは既統合BASEをこのcheckoutから読む。

## 共通QAへの最小登録

残り時間のユーザー指示と組込み担当#98からの依頼で、検査状態と遷移を `src/features/plugins/screens.tsx` へ移し、10画面を共通のscreens globへ登録した。本人/dataModeのscopeKeyごとに検査stateを初期化し、非表示ページのpreviewをunmountする。通常アプリの地図へ検査overlayは追加しない。独立fixtureだけが `InspectionMainMap` を使う。API/DB呼出しはなく、API成功・保存完了の証拠ではない。
