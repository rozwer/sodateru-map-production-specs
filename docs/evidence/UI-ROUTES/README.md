# UI-ROUTESの実装・接続確認

## 現在の状態

2026-09-15。UI-ROUTES #9の先行画面部品。API/DB・共有Shell・実地図との接続は未確認で、Issueは未完了。

- worktree: `/Users/roz/.codex/worktrees/ui-routes-9`
- branch: `rozwer/9-route-screens`
- 着手時base: `26a25329111af5e72ee42c3120c06993adbeae91`
- 正式取得: `CODEX_OWNER=rozwer mise run task:verify` exit 0。取得pathは `src/features/routes/` と本ディレクトリ。
- 検証用URL: `http://127.0.0.1:5319/docs/evidence/UI-ROUTES/preview.html`
- 本人/保存先: 部品検証のため本人scopeなし、API/DBへの保存なし。

## 先行提供

`src/features/routes/index.ts`から3画面と表示用のpropsをexportする。UIの下書き型はHTTP Schemaではない。共通クライアントや業務判定は実装していない。

| 画面 | 実装した操作 |
|---|---|
| 経路の条件 | 出発/目的/経由地の選択・消去、経由地追加/削除/順序変更、キーボード候補選択、出発/帰着時刻、移動手段、階段/屋根、公共交通選択時の定期券入口 |
| 経路の候補 | 可変件数の候補カード、選択、距離・移動/滞在/合計時間、条件評価、採用可否と理由、入力条件の再確認、条件へ戻る |
| 徒歩案内 | 方向/案内文/距離・残り時間、精度、現在地/全体表示、一覧/地図へ戻る、明示終了、終了失敗の表示 |

検索/保存/再試行等はコールバックで受ける。親の応答が成功するまで画面側で保存成功や案内終了を宣言しない。閉じる操作と終了操作を別のコールバックにした。

## 参照画像との照合

参照は[08_18_01](../../01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2008_18_01.png)。画像を開いて条件/候補/案内の3列を確認してから実装した。製品には参照画像を埋め込んでいない。

| 参照列 | 実ブラウザ確認 | 照合結果と残差 |
|---|---|---|
| 左・条件 | [390px](conditions-390-component.png) | 淡色背景、見出し/説明、白いフォーム、出発/目的ピン、寄り道、時計、3択、switch、CTAの構成を照合。独立写真は未提供のため画像欠測表示。検証バー分だけ縦に長く、CTAはスクロール到達を確認。 |
| 中・候補 | [390px](results-390-component.png) | 上部説明、地図領域、選択丸/候補名/バッジ/内訳、未知条件と下部2ボタンを照合。地図/写真の一致はUI-MAP/PLACES接続後に確認する。 |
| 右・案内 | [320px](navigation-320-component.png) | 閉じる/全体表示、上部の方向指示、残り表示、精度/現在地、下部の一覧/終了を照合。地図の道路線/現在地/進行方向の一致は接続後に残す。 |

スクリーンショットはテスト表示を明示した部品検証。完成画面との一致合格やlive完了の証拠ではない。共通Shell組込み後に、同じ画面幅/状態で再度差分を修正する。

## 実施した確認

- TypeScript strict、React JSX、ES2022/DOMの型検査成功。
- 390×844の実ブラウザで、経由地追加→「東山」入力→ArrowDown/Enterで「東山公園」選択→検索→候補へ遷移。条件の展開で地点順「本山駅→東山公園→カフェでひと息」を確認。
- 未確認の候補Bを選ぶと理由を表示し、採用ボタンがdisabledになることを確認。
- 出発時刻を指定して10:30を入力、公共交通の選択後に定期券入口コールバックへ到達。
- 0件で条件変更の案内と採用disabledを確認。未知条件とは別の表示。
- 案内の終了失敗で案内が継続、地図へ戻るコールバックと終了コールバックが独立することを確認（fixture内）。
- 390pxでdocumentのscrollWidth=390を確認。320pxで方向/残りの横並びと精度/現在地の操作を画像確認。

検証起動:

```sh
mise exec -- node node_modules/vite/bin/vite.js --config docs/evidence/UI-ROUTES/vite.config.ts
```

## 完了までの残件

1. UI-BASEのscreens登録、共通client、単一Sheetとの接続。UI-MAPのMapPreview・選択イベント・現在地表示の接続。
2. PLACES検索・候補の期限/retention、実APIの検索→採用→保存→再取得。同じ道路形状/地点順/条件を確認。
3. ROUTES.basic/navigation/conditionsの提供。詳細は[#9の契約差分](https://github.com/rozwer/sodateru-map-production-specs/issues/9#issuecomment-5673420905)。未対応条件を削除して検索成功にしない。
4. 保存成功後の案内開始失敗・再送、版競合、区間失敗、案内閉じる/復帰、実測位置、明示終了と訪問非確定を実接続で確認。
5. 1440×900、文字200%、ソフトキーボード、reduced motionと共通Sheet内の全操作到達を確認。PRレビュー/統合とtask:finishは全受入が揃ってから。
