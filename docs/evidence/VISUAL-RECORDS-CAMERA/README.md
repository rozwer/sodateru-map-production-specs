# VISUAL-RECORDS-CAMERA #189

2026-09-25の追加実API・実ブラウザ検証と未達一覧: [2026-09-25-verification.md](2026-09-25-verification.md)。下記は2026-09-15の既存検証で、fixture・demoの保存範囲はそのまま記録する。

## 第一修復: 画面外側の地図露出

基点 daa6326（PR188の媒体受渡し5b39f2dを含む）。worktree `/Users/roz/.codex/worktrees/visual-records-camera-189`、branch `rozwer/189-visual-records-camera`。原本は `docs/01_requirements/03_pages/<page>/page.json` の参照regionと同梱画像をすべて開いて目視した。common.jsonの例示値を固定の製品データにはしない。

共通Shell PR181のpresentationを利用。記録4画面、訪問、成長は原本に外側地図なし。今日の軌跡は自身の上部地図/カレンダーを持つため外側の地図を重ねない。各登録にのみfullscreenを選択。全ページへの共通変更はない。

実ブラウザ: Codex in-app browser、修正前 localhost:5173、修正後127.0.0.1:5194（API3002、デモ）。446×903の空の記録editorでは修正前右端に地図が露出、修正後に解消。写真付き既存UI-RECORDS/visualのeditorも446×903で表示、写真/動画が読込まれることを目視した（保存通信なし）。

| 画面 | 参照 | 実状態 | 差分 | 修正 | 未確認・残り |
|---|---|---|---|---|---|
| record-create | 08_07_53 editor/場所/確認 446/432/445×903 | 製品デモ: 地図カメラから写真1枚、確認/編集保持、保存。既存fixture写真+動画 | 外側地図露出。写真素材は独立カフェ写真。場所/日時は無断設定しない | fullscreen・PR188媒体引継ぎとPR195入口を連結確認 | 実機撮影/OS拒否/live保存、原本の場所候補3件 |
| record-edit | 08_07_57 中426×930 | 参照幅/390fixture、製品デモ写真読込/本文/読書+休憩保存 | 原本の写真と独立素材は異なる。製品の気分は未取得 | fullscreen | 気分契約、場所付き通常状態 |
| visit-confirm | 08_07_57 左428×930 | 参照幅/390fixture: 行っていない選択と写真 | fixture内部地図は接続待ち。原本の地図未再現 | fullscreen | 実訪問データと地図/保存 |
| interpretation-correction | 08_07_57 右426×930 | 参照幅/390fixture: 原文/解釈/読書+休憩/理由 | 390幅で末尾一文字だけ改行 | fullscreen・見出しをbalanceで自然な2行へ | 製品demoの記録/解釈対応IDと保存 |
| record-delete | 08_17_53 右512×1024 | 参照幅/390fixture: 写真/削除対象/残る内容 | 原本の内容構造あり。書出しは未対応 | fullscreen | 実削除/書出し。破壊操作は行っていない |
| growth-result | 08_12_03 右512×1024 | 参照幅/390fixture: 保存表示/写真/用途/原文 | 原本上部の建物表現に対してfixtureは地図接続待ち | fullscreen | 実成長データ・建物表示。fixtureを成功証拠にしない |
| daily-track | 07_40_51 853×1844（CSS426×922）/08_08_01 左440×866 | 参照幅/390fixture: 5カード/展開写真/3件calendar。製品デモ: 保存写真/編集本文をreload後表示 | fixture軌跡地図は接続待ち。製品テスト記録は位置日時未指定1件 | fullscreen、下部nav保持 | 実複数地点・軌跡・成長の統合表示 |

## 検証と境界

全体typecheckは既存のCORE/companion/exploration/friends/reflectionとrecord-flow.testのRecordCreate unknown型で失敗。今回追加したlayout設定の型エラーはない。依存はbun install --frozen-lockfileで導入。実機撮影・許可拒否・API保存の証拠はこの第一修復には含まない。7画面一致/全機能完了とはしない。

## カメラ連結の実ブラウザ確認

対象commit e45f43e（PR195入口5b886a0、PR188受取5b39f2d、今回56544b6を含む）。Vite127.0.0.1:5194 → 127.0.0.1:3002、data mode **demo**、2026-09-15。

1. 地図中央「写真を記録する」→「キャンセル」で#/mapへ戻る。
2. 再open→「端末の写真を選ぶ」で既存UI-RECORDS/visualの独立カフェ素材を `/tmp/record-camera-test.jpg` として選択。画像sourceは同preview.tsx記載Unsplash。私的写真や原本スクリーンショットは使わない。
3. `captureId=35337dfa-c7b8-403b-b0ff-b3ced227716f` のrecord-createへ遷移、画像表示。446×903、確認→編集で写真が同じまま保持。390×844でもinnerWidth/document scrollWidthとも390。
4. 写真のみ・場所日時未指定・自分だけで「記録を保存」。daily-trackへ遷移し`recordId=8dbb56fe-e9d9-4526-b1f5-9983473c786f` の写真表示。ページreload後もimg.complete=true/naturalWidth=800。
5. 「記録を編集」→本文「カメラ引継ぎの確認用記録。静かな席で読書しました。」、読書/休憩を選択→変更を保存。daily-trackで新本文と同じ写真を再表示。

これは正式画面を介したデモ領域の保存/再取得であり、live領域の保存や実機撮影の証拠ではない。ローカル5194にはMapbox設定を持ち込んでおらず「接続設定がありません」を明示する。地図タイルを含む入口確認はShell #172の5173証拠へ。

## 幅別の画像照合

`*-reference-fixture.png` / `*-390-fixture.png` は既存 `docs/evidence/UI-RECORDS/visual/index.html?screen=...` の実ブラウザ画像。UI fixture / 保存通信なし表示を保持。`width-checks.json` は7画面+calendar、参照幅/390幅の16条件すべて横はみ出しなし。画像を開いて写真・選択済み・カード配置を確認。原本の文字数上限/写真そのもの/地図表現との完全一致は主張しない。390幅で長い面は通常スクロールする。

`record-edit-390-demo.png` / `daily-track-390-demo.png` は製品デモの保存後再表示。vite build成功（192 modules）。typecheckは前記既存エラーで未通過。新テストの追加や同一テストの反復はしない。

## 残作業の引継ぎ

Shell #172へ通常状態不足を一括連絡済み: 既存schemaのgetRecords/getVisits/getTrackPoints/getMapGrowthと関連Place/Record/Insightの対応IDが必要。新モック基盤や契約は追加していない。7画面完全一致は未完。デモ補完後の地図/複数地点と実機撮影/OS拒否は別途QAへ引き継ぐ。
