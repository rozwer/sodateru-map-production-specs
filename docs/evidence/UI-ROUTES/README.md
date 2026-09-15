# UI-ROUTESの実装・接続確認

## 現在の状態

2026-09-15。UI-ROUTES #9。先行部品PR #44はb77d390で統合済み。共通Shell/型付きclientの接続を追加したが、API保存往復・実地図の受入は未完了。

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
- 相互レビューで指摘された、写真失敗時の枠消失と保持画面間のradio衝突を修正。写真の再読込部品を残し、radio name/関連IDを画面インスタンスごとに分離。対象2件のjsdom回帰確認が成功。

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


## 共通ShellとAPI呼出しの接続（第2提供）

基点 `6dac91f`（UI-BASE/CORE/PLACES先行提供を含む）。`screens.tsx`が3画面を登録し、共通apiから実operationIdを呼ぶ。全画面が同じ本人/modeのRouteFlowを使い、画面を閉じても保存route ID/再送intentを保持する。scope破棄では一時候補・通信を破棄する。ブラウザ保存は入力文字と条件のみ。

- 条件検索→保存（固定id/再送キー）→案内開始→保存GET→明示終了を配線。開始失敗では作成済みrouteを保持し、応答不明の作成は固定IDのGETで照合する。
- 保存済みの案内開始は最新GETから状態/版を確認し、応答不明でも新routeを作らない。終了失敗では案内状態を保持し、訪問書込みを送らない。
- 提案の `destinationPlaceId`、共有の `sharedRouteId`、相談の `dialogueResultId/candidateId` を入口として登録。共有元をGETし、自分の起点+元地点順の新draftを作る。元routeをPATCHしない。
- 相談のoriginを同じresultから保持する。未保存相談candidateはPLACESのresultIdと異なるため、pointに偽装せず未接続を表示する。保存placeIdのある候補はstored地点として検索へ渡す。
- hidden画面は保存GET/地図focusを発生させず、MapPreviewをmountしない。MAP未統合のcheckoutでは共有登録口と同じglobで欠測表示し、独自地図を追加しない。

### 検証範囲

- 対象9テスト成功（`route-flow.test.ts` 7件、`routes-components.test.tsx` 2件）。保存/開始の通信切断、終了競合、条件黙殺防止、共有コピー、相談ID境界を含む。API応答を差し替えた単体証拠であり実保存証拠ではない。
- UI固有のstrict型確認成功。統合版 `bun run typecheck` はPLACESのINFORMATION import未解決とservice.ts座標undefinedで失敗。担当へ [#5](https://github.com/rozwer/sodateru-map-production-specs/issues/5#issuecomment-5673898372) に連絡済み。
- 実API: `http://127.0.0.1:5320`、UI: `http://127.0.0.1:5318/#/route-conditions`。
- DBは同worktreeの `.local/ui-routes-live.sqlite` / `.local/ui-routes-demo.sqlite`、本人設定 `.local/ui-routes-profiles.json`。起動ログ `features:[]`。PLACES/ROUTES登録前、Shellはscope unresolvedで本人開始未接続。検索は401を返した。
- 390×844の実ブラウザで入力→失敗→再試行後も入力保持を確認。空リストを隠すCSSがエラー部品まで隠していた点を修正。[失敗画面](conditions-390-shell-error.png)。document横幅390、横はみ出しなし。元画像との全体一致証拠ではない。

### 接続待ち

1. BASE: 本人/modeセッション接続、固有headerを持つ画面向けheaderなし設定（現状は重複を実画面で確認）。
2. MAP: MapPreview/単一測位状態の統合版で道路・精度・進行方向・paddingを確認。
3. PLACES/ROUTES: 機能登録、基本経路保存往復、候補期限/条件/複数経路/turn情報の確定Schema。
4. 相談未保存候補の元検索ID解決とroute preview対応、共有GETの公開範囲、定期券画面の正式入口。

Issue #9はclaimed/openを維持する。部分提供を全画面完成やtask:finishの根拠にはしない。


### 提出を止めている共通ガード

`task:verify`はclaimed/取得path一致で成功し、Vite production buildも成功した。通常commitは`Changed paths outside claim`で拒否された。HEADは `6dac91f4fba8bb28506c73efd39c4db1518a963d`、実際のstageは取得範囲内の10ファイルのみ。`production_guard.py`がclaim起点からstageを比較し、developから取込済みの共通変更まで担当外として判定する。オーケストレーターへ報告済み。hook迂回・共通修正・receipt変更はせずstageを保持する。第2提供は未commit/未PR。
