# UI-SUGGESTIONS #15 — 希望入力・候補・詳細

2026-09-15。`rozwer/15-suggestions-ui`、起点 `origin/develop`。取得範囲は `src/features/suggestions/` と本ディレクトリ。

## 現在の提供範囲

`self-checkin` / `suggestions` / `suggestion-detail` を `screens.tsx` から登録する。共通の `api` / `ScreenProps.active` / `useScreenState` / `MapBridge` を使用し、共有ファイルは変更していない。

- 任意入力、15/30/60/120分以上、移動手段、同行者、負担、回答だけ保存、未回答の地図移動。
- 同じ時点の訂正は既存IDと版を使う。新時点の回答は新ID。条件変更後は新batchを作り、一覧をbatchIdで再取得する。
- 確定したAPI契約へ回答保存→再取得→候補生成→一覧・詳細、選択/保留/見送り/本人メモ、しおり、提案停止を配線。
- 場所の写真は現在閲覧できる本人/共有記録の媒体のみ。公式施設写真のproviderは未定義。写真未取得を媒体領域内で表示し、本文と操作を残す。OSM等の出典を施設公式サイトと呼ばない。
- 選択後は保存placeIdを地図へ渡す。経路条件にはdestinationPlaceId/suggestionId、保存routeIdがあれば案内へ渡す。本人確認した訪問だけを達成操作へ指定する。
- 保存中の重複送信抑止、作成ID・再送キー保持、失敗時の入力保持、版競合時の現行値再取得、非active/本人変更時の要求取消。

## 検証済みの範囲

**表示部品・契約型の確認と、確定契約を明示合成した実APIでの回答保存確認。通常起動全体の接続完了とは区別する。**

| 検査 | 結果 |
| --- | --- |
| 指定画像 `08_11_47.png` を実際に開いて3画面を照合 | 見出し、カード、条件chip、任意入力、時間式、確認済み/不明、操作行をDOM/CSSで構成 |
| 390pxで状態入力・2時間以上・同行者変更→候補一覧→詳細→メモ入力 | 選択条件の保持、対象候補の遷移、メモ原文入力を確認 |
| 320px詳細 / 390px文字200% | DOM幅がviewport内。拡大状態でも下部の「これにする」へスクロールして操作可能 |
| 5件・長い候補名・評価1と未評価 | 390pxで件数5、評価の区別、横はみ出し0を確認 |
| 0件・通信失敗 | 条件変更、再試行、入力保持を表示 |
| 写真2枚と次/前切替 | 写真サンプルを表示し390pxの横はみ出し0、2/2への切替、メモ入力を確認。製品データではない |
| TypeScript strict + noUncheckedIndexedAccess | 公開済みCORE generatorでSUGGESTIONS/COMMUNITY/PLACES/SETTINGSの確定fragmentを一時領域へ合成し、3画面とAPI呼出しの型検査成功 |

参照画像は製品の画像素材にしていない。画面上部の「表示サンプル・API未接続」と、操作後の「API保存は行っていません」で表示検査を明示する。

コントローラーの限定検査: `mise exec -- bunx vitest run src/features/suggestions/screens.test.tsx --environment jsdom`、2件成功。回答だけ保存のPOST→GET（候補/訪問作成なし）、保存後の応答喪失→同じIDのGET確認（POST/PATCH重複なし）を検証。テスト専用の応答storeであり、live DBの証拠ではない。

画像：`reference-layout.png`、`checkin-390.png`、`list-390.png`、`empty-390.png`、`detail-text200.png`、`list-long-390.png`、`detail-photo-390.png`。

表示サンプルは、Viteで `/docs/evidence/UI-SUGGESTIONS/preview.html` を開く。`preview.tsx` は製品の画面登録から読まれない。

## 契約の根拠

- UI-BASE #4: `ScreenDefinition` / `ScreenProps` / `useScreenState` / shared `api` / `MapBridge`。先行shell統合 `6dac91f`。header:none/contentPadding:noneは#4追補の入口を利用。
- SUGGESTIONS #36: `mattsun/36-suggestions` の `d6ddc50`、fragment v1.2.0。timeBudget、companion、effort、条件評価、memo、checkinSnapshotを使用。
- COMMUNITY #22: `1704832`、fragment v1.0.0。しおりは `{type:"place",id:placeId}`。suggestion本文をしおりへ複製しない。
- PLACES #5: `4714cd3`、fragment v0.2.0。写真はPlaceDetailの記録媒体、タグ/出典/取得時刻はplaceから使用。
- SETTINGS #24: `1291124`、本人設定の提案停止をGET/PATCH/GETで確認する。

## 未完了

- 確定fragmentと各server registerのdevelop統合後に、同じ起動・本人scope・SQLiteを使ってブラウザ操作→API保存→再取得→再起動を確認する。
- 写真ありの表示部品確認は完了。本人/共有記録の実媒体URLでの読込・権限取消は接続後の受入に残る。
- 詳細閲覧の独立保存はv1.2.0のviewed:trueへ接続済み。実DBでpresentedAt/viewedAt/selectedAtが別々に保持されることを統合後に確認する。
- 経路/訪問/共有確認先の同一対象引継ぎと、訪問取消→提案selected復帰を実接続で確認する。

部分提供のみでTask/Issueを完了しない。

## 実APIの回答保存確認（統合前）

2026-09-15、serverはdevelop364f8efを取り込んだ専用worktree。通常起動は共通OpenAPI未更新によりPOSTが422になることを実画面で確認し、CORE #3へ報告済み。共有ファイルは変更せず、COREのcreateApp({contract})へ確定fragment合成を渡す一時起動で進めた。外部応答のモックは使用していない。

- API :3095、Web :5196、DB `.local/suggestions-ui.sqlite`、本人 `46d32afe-ae3d-477a-a787-99dbbdf8cef8`、live。UI-BASEの確定済み共有shellを一時領域へ読取りコピー。
- 画面で「少し疲れている」「静かな場所で休みたい」「2時間以上」「子どもと」「無理しない距離」→回答だけ残す→GET後の保存表示。
- DBの同回答 `9dcefaea-91a0-48de-8414-7353cff4bb0d` version1: timeBudget={kind:atLeast,minutes:120}、companion=children、effort=easy、mode=any、minutes=null。提案数0、訪問数0。
- 同じDBでサーバー停止/再起動後、同URLを再読込して全文/選択値を復元。本人IDやDBを変更していない。
- cached screen同士の固定input id重複を実シェルで発見しuseIdへ修正。再読込後のlabel対応、重複id0、横はみ出し0を確認。

写真表示サンプルの出典: [窓辺のカフェ](https://unsplash.com/photos/j6ERcKXdlXw)、[Dick Hoogerdijkのカフェ写真](https://unsplash.com/photos/dytlQR4hi4g)。写真は表示検査専用の外部URLで、実際の提案地点の写真とは表示していない。
