# UI-COMPANION #19 検証

## 現在の範囲

管理・ZIP取込・制作の3画面と、単一地図に重ねる`MapCompanion`を実装中。共有shell・CORE型・COMPANION実APIの統合確認前で、Issueの受入は未完了。

- 指定画像：`docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 08_23_36.png`を実際に開いて照合した。
- ブラウザ：Codex内ブラウザ、127.0.0.1:5219、390×844。確認ページはAPI未接続のテスト表示。
- 管理のカード・2列選択・表示/サイズ/動き・追加導線、取込の3列プレビューと追加動作、制作の名前/外見/参考画像/接続先/2操作/生成CTAをDOMで構成。参照画像を製品に貼り付けていない。
- 390pxで横幅390px/scrollWidth390px。名前の絵文字を1文字と数え、入力後に管理→制作へ戻って内容が保持されることをブラウザで確認した。
- 保存失敗表示で入力を保持。未接続の生成ボタンと検査前の登録ボタンは無効。
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

- COMPANION v0.2の共通型・multipart/file・data envelopeへの確定反映と実API。
- 正しいZIP→25動作確認→登録→任意選択→設定GET→同じ本人/live DBで再読込した地図の描画。
- サイズ超過/構造不正/通信失敗/版競合で既存の相棒と入力を保持。
- 下書き保存/参考画像/再開、生成先設定、実生成・取消・候補採用。採用は現在選択を変更しない。
- 320px/広い画面/文字200%/共通Sheet内の最終照合。

API未接続・未提供の状態やこの技術fixtureだけをlive完了として扱わない。PR統合、board done、ロック解放、Issue closeは通過条件が揃った後に行う。
