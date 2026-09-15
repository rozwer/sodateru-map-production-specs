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
