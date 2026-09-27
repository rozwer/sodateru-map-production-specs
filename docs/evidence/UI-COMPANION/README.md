# UI-COMPANION #19 検証

## 現在の範囲

利用者の範囲変更（#19の2026-09-15コメント）により、完成対象は既存ペットの管理・ZIP取込・表示・選択。製品は2画面と単一地図に重ねる`MapCompanion`を提供する。制作コードは保全し、入口/画面登録から外した。COMPANION実APIと共有shellはdevelopへ統合済み。CORE生成型の反映と共有アプリの起動修復を待っており、実保存を含む受入は未完了。

- 指定画像：`docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 08_23_36.png`を実際に開いて照合した。
- ブラウザ：Codex内ブラウザ、127.0.0.1:5219、390×844。確認ページはAPI未接続のテスト表示。
- 管理のカード・2列選択・表示/サイズ/動き・追加導線、取込の3列プレビューと追加動作、制作の名前/外見/参考画像/接続先/2操作/生成CTAをDOMで構成。参照画像を製品に貼り付けていない。
- 390pxで横幅390px/scrollWidth390px。名前の絵文字を1文字と数え、入力後に管理→制作へ戻って内容が保持されることをブラウザで確認した。
- 保存失敗表示で入力を保持。未接続の生成ボタンと検査前の登録ボタンは無効。
- 320×740でも横幅320px/scrollWidth320px。最初の3動作だけでは確認チェックがONにならず、展開して各コマを表示すると確認数が3→21→25へ変化し、25/25で明示確認した後だけ登録ボタンが有効になることを実ブラウザで確認した（テスト表示）。
- views/AtlasPreview/v2-rendererと確認ページのstrict TypeScript検査が成功。API接続ファイルの全体型検査は共通生成型の提供後に行う。

## 画面を開く

担当worktreeから次を実行する。

```sh
mise exec -- bun install --frozen-lockfile
mise exec -- node node_modules/vite/bin/vite.js --config docs/evidence/UI-COMPANION/vite.config.ts
```

[空状態と入力の確認](http://127.0.0.1:5219/docs/evidence/UI-COMPANION/preview.html) / [検証用アトラスを入れた表示](http://127.0.0.1:5219/docs/evidence/UI-COMPANION/preview.html?sample=1)。この起動はUI部品を確認するためのもので、実APIの起動・保存証拠ではない。

## 取込用ZIP

`fixtures/companion-ui-test.zip`はこのタスクで作った原創作の単純図形。外部画像や個人の相棒を含まない。`make-fixture.py`で再生成できる。`pet.json`と1536×2288のRGBA PNGを格納し、8×11セル、未使用セル透明、使用コマ数`6,8,8,4,5,8,6,6,6,8,8`。ZIP transport/形式/セル参照/保存の技術検証用であり、相棒の作画品質や実生成サービスの証拠ではない。

描画表の根拠はrehearsal commit `d51fb6c317b307503b0696d504660c91522b4a35`の`shared/logic/pet-package/index.ts`と`src/companion/renderers/codex-v2/index.ts`。9標準動作と`gaze-0`から`gaze-337.5`まで22.5度刻みの16視線を#35と調整した。

## 実接続の残件

- COMPANION v0.2の共通型・operationへの確定反映。実APIはPR55/3f1d659で統合済み。
- 正しいZIP→25動作確認→登録→任意選択→設定GET→同じ本人/live DBで再読込した地図の描画。
- サイズ超過/構造不正/通信失敗/版競合で既存の相棒と入力を保持。
- 新規制作・生成・生成先設定は今回対象外。以前の制作部品と制御コードは保全し、実生成を実装済みとは数えない。
- 320px/広い画面/文字200%/共通Sheet内の最終照合。

API未接続・未提供の状態やこの技術fixtureだけをlive完了として扱わない。PR統合、board done、ロック解放、Issue closeは通過条件が揃った後に行う。

共有shellで実際の`companion-import`登録を開き、50,000,001バイトのZIPを選択。サイズ超過を表示し、登録が無効のままであることを確認した。ファイルの解除も実入力を対象にする。

## 組込みへの提供（2026-09-15 12:13 JST）

- PR64、機能提出628c4b5。`screens.tsx`の`export screens`は管理/取込のみ。`MapCompanion({scopeKey,onActivate,active?})`はBASEが1個mountし、AI相談へ接続する。
- 非表示/未選択/媒体取得失敗のときもAIボタンを残す。全体が非activeの間は表示と読み込みを止める。409の構造検査/未確認エラーを版競合メッセージに置換しない。
- develop a080b3dを通常merge。公式`bun run dev`をAPI `127.0.0.1:3091`、Vite `127.0.0.1:5175`で起動。live DBは担当worktreeの`.local/app.sqlite`、demoは`.local/demo.sqlite`、本人設定は`.local/profiles.json`。共有環境ファイルは変更していない。
- ブラウザでrootを開くと`src/features/activity/screens.tsx`から`../../map/display-state`を解決できずViteエラーになった。組込み担当へ通知済み。本人選択/ZIP保存/再読込のlive確認はこの時点で未実施であり、API単体証拠とは区別する。

## 共通画面への到達（12:20 JST）

develop 891c1cdを取り込み、上記display-state不足は解消。公式起動の本人選択→地図→相棒管理の共有Sheet表示へ到達した。相棒の共通生成operationが未反映のため`Unknown operation: listCompanions`を確認。失敗時は0件/未選択と断定せず「未確認」「一覧を読み込めていない」と表示し、保存無効・再試行ありになることを実ブラウザで確認した。地図で媒体取得に失敗しても「AIと話す」ボタンが残ることも確認済み。ZIP保存/設定再取得は引き続き未完了。


## 2026-09-27 取消・選択解除の修復（#19）

起点develop `db1e338`、公式worktree `companion-19-followup`、branch `rozwer/19-companion-actions`。取得範囲はsrc/features/companion/と本証拠ディレクトリのみ。

### 修正

- 取込の明示「キャンセル」は戻る前にファイル・検査結果・動作確認・現在選択フラグを破棄する。従来はuseScreenStateに残り、再訪時に取消済みファイルが復活していた。
- 管理の「変更を取り消す」で未保存の選択/表示設定を保存値へ戻す。取消自体はAPIを更新しない。
- 「現在の相棒の選択を解除」を既存selectedCompanionId:nullへ接続。保存するまでは下書き、明示保存後に反映する。登録一覧から相棒を削除する機能ではない。
- 保存成功通知でrevisionが更新されたとき、すでに実行中で再読込がskipされてもloadingだけtrueになる問題を修復。実際に読込処理を開始したときだけloadingを更新する。

### 確認

- `mise exec -- node node_modules/vitest/vitest.mjs run src/features/companion/screens.test.tsx`: 2件PASS。取消後にキャッシュを再マウントしてもファイル/確認が復活せず登録無効、選択解除→取消はAPI書込なし、明示保存だけnullを送信し未選択/読込完了へ遷移。
- screens.tsxとテスト入口strict tsc PASS（ES2022 / ESNext / Bundler / react-jsx / vite/client / allowImportingTsExtensions）。Vite production build PASS。
- `http://companion19.localhost:5197`、Vite --strictPort、API3027。lsofでUI PID11889/API PID11880両cwd=`/Users/roz/.codex/worktrees/companion-19-followup`。API起動出力のDBは同worktreeの.local/app.sqlite / .local/demo.sqlite。固有hostnameで他担当のcookieと隔離し、共有環境は変更しない。
- 実shellの管理→ファイルから追加→実ファイルchooserで既存fixtures/companion-ui-test.zipを選択。API検査とatlas表示（初期3/25）→キャンセル→管理は登録0件→再訪でファイル/プレビューなし・登録無効を確認。
- 同ZIPを再取込し、追加プレビューを開いてスクロール。9動作+16視線を表示し25/25、明示確認チェック→今の相棒にする→登録で、管理に同じ技術fixtureの実atlas/表示中/選択済みが出ることを確認。この図形はテスト用と説明され、作画品質の合格証拠ではない。
- 320×740で選択解除→変更取消が元の選択を復元。再度選択解除→保存で未選択に遷移し、保存ボタンが操作可能のままで読込中に張り付かない。390×844で再読込後も未選択で、登録済みatlasは一覧に残る。各scrollWidthは320/390。1440×900の取込画面も操作・目視確認。viewportは解除。

### 未完

登録済み相棒のDELETE operationは現行生成clientにない。選択解除やローカル取込取消をサーバー資産の削除とは扱わない。独自APIは追加しない。

全指定画像との全状態比較、異なる2種類、文字200%、soft keyboard、reduced motionの総合確認、二本人/live-demo分離、実ネットワーク競合/失敗の全組合せ、通常地図での本人相棒とAI入口の全条件は未完。背景地図は一部取得失敗表示も残る。#19/#147全体をcloseする証拠ではなく部分修復として提出する。新規制作は対象外のまま。


### 最小の次タスク（1件）

- 原因: `MapCompanion.tsx`のpet未取得時の同一fallbackが「表示OFF/未選択」と「読込失敗」をまとめてモックHinataを描画する。非表示なのにキャラが残るのは既存の状態分岐不足であり、新基盤が必要な問題ではない。
- 次タスク: `src/features/companion/MapCompanion.tsx`だけで表示OFF/未選択時を区別し、既存`companion-map--ai`のAI入口だけを出す。新DTOや設定保存は作らない。
- 完了確認: 管理で表示OFFを保存→通常地図に戻り、相棒のcanvasがなくAI入口が操作できることを1回確認する。


## 第2周: 相棒非表示時のAI入口（#19 / #97）

起点develop ed225d9、公式claim/UI-COMPANION、worktree companion-19-hidden。製品変更はMapCompanion.tsxのみ。petなし時のmock atlasを既存AI-onlyボタンへ置換し、取得失敗時だけ既存エラー表示を出す。OFF/未選択時に架空の相棒を表示しない。

検証: 対象strict tsc PASS。companion19.localhost:5197（strictPort）/ API3027、PID23080/26926のcwdは本worktree、DBは本worktree.local。前回#350の実取込DB/本人bindingをSQLite backupで専用コピーし、取込の再試験はしない。コピー時はDBとprofilesを同時に合わせた（初回は不一致をCOREが拒否し、その後正常起動）。

実操作1系列: 登録済み「動作確認用テスト相棒」を選択して保存→reloadで同じ相棒/表示ON/中/動き軽減OFF→通常mapで同じ図形atlas（相棒button内canvas1）→管理で表示OFF保存→通常mapで相棒canvas0、AIボタン1→クリックでai-exploreへ遷移。初回未選択時もAIのみを確認。相棒の図形はテスト専用と明示済み。

#97最小受入の対応: 共通23operationはCORE #338で反映済み。ZIP chooser/atlas/25動作/登録/現在選択は前節#350の実API証拠を再利用。reload同相棒/設定と通常mapの選択媒体表示は今回確認。固有APIの致命的不具合はこの系列ではなく、追加API修正は不要。新規生成は対象外。独立レビュー後に#97の最小接続受入は完了可能。#19の全画像・200%等の広いUI受入とは区別する。
