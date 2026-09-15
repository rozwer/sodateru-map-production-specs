# VISUAL-RECORDS-CAMERA #189

## 第一修復: 画面外側の地図露出

基点 daa6326（PR188の媒体受渡し5b39f2dを含む）。worktree `/Users/roz/.codex/worktrees/visual-records-camera-189`、branch `rozwer/189-visual-records-camera`。原本は `docs/01_requirements/03_pages/<page>/page.json` の参照regionと同梱画像をすべて開いて目視した。common.jsonの例示値を固定の製品データにはしない。

共通Shell PR181のpresentationを利用。記録4画面、訪問、成長は原本に外側地図なし。今日の軌跡は自身の上部地図/カレンダーを持つため外側の地図を重ねない。各登録にのみfullscreenを選択。全ページへの共通変更はない。

実ブラウザ: Codex in-app browser、修正前 localhost:5173、修正後127.0.0.1:5194（API3002、デモ）。446×903の空の記録editorでは修正前右端に地図が露出、修正後に解消。写真付き既存UI-RECORDS/visualのeditorも446×903で表示、写真/動画が読込まれることを目視した（保存通信なし）。

| 画面 | 参照 | 実状態 | 差分 | 修正 | 未確認 |
|---|---|---|---|---|---|
| record-create | 08_07_53 editor/場所/確認 446/432/445×903 | 空editorと写真動画付き既存fixture446幅 | 外側地図露出、製品デモの通常写真不足 | fullscreen・PR188媒体引継ぎを継承 | 地図カメラ連結、390幅、保存 |
| record-edit | 08_07_57 中426×930 | 既存feature/原本確認 | 外側地図が原本にない | fullscreen | 今回の写真付き実データ操作 |
| visit-confirm | 08_07_57 左428×930 | 既存feature/原本確認 | 地図はカード内部のみ | fullscreen | 非訪問選択・実データ操作 |
| interpretation-correction | 08_07_57 右426×930 | 既存feature/原本確認 | 外側地図が原本にない | fullscreen | 用途選択済み状態・保存 |
| record-delete | 08_17_53 右512×1024 | 既存feature/原本確認 | 外側地図が原本にない | fullscreen | 写真/削除対象/残る内容の実データ |
| growth-result | 08_12_03 右512×1024 | 既存feature/原本確認 | 外側地図が原本にない | fullscreen | 成長表示と実データ |
| daily-track | 07_40_51 853×1844 / 08_08_01 左440×866 | 既存feature/原本確認 | 自前地図に外側地図が重なる | fullscreen、下部nav保持 | 複数写真カード/軌跡/カレンダー |

## 検証と境界

全体typecheckは既存のCORE/companion/exploration/friends/reflectionとrecord-flow.testのRecordCreate unknown型で失敗。今回追加したlayout設定の型エラーはない。依存はbun install --frozen-lockfileで導入。実機撮影・許可拒否・API保存の証拠はこの第一修復には含まない。7画面一致/全機能完了とはしない。
