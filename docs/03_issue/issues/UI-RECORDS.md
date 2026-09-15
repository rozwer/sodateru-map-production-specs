# UI-RECORDS｜体験記録・訪問確認・訂正と地図の成長

<!-- task-id: UI-RECORDS -->

初期担当枠：A。担当者：rozwer。[GitHub #11](https://github.com/rozwer/sodateru-map-production-specs/issues/11)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-RECORDS](CONNECT-RECORDS.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### record-create

本文のみ/写真動画のみ、場所日時未指定の入力、実端末の媒体選択・順番、確認面、private既定、本人訪問確認、部分失敗表示を操作する。

### record-edit

本文・感想・気分・滞在時刻・複数用途、媒体追加/削除/並替え、しおりの編集下書きと保存/取消を操作する。

### visit-confirm

候補地点を実地図と詳細で確認し、行った/行っていない/まだ分からないを選択して表示を更新する。

### interpretation-correction

アプリ推定と本人原文を並べ、用途選択と理由の編集先を別表示する。保存/取消と入力保持を操作する。

### record-delete

本文・媒体・派生・共有の削除範囲と残る独立情報を確認し、書出し・削除確定・取消・処理中/失敗を操作する。

### growth-result

実地図で確認済み訪問/用途による建物変化を描画し、元体験・次候補・地図への導線を操作する。

### daily-track

日付/カレンダー・展開行・scrollを保持し、軌跡・候補/確認/否定・欠測、写真本文を実地図と時系列で操作する。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-RECORDS](CONNECT-RECORDS.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-RECORDS)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [record-create](../../01_requirements/03_pages/record-create/README.md) | `record-create-R1`, `record-create-R2`, `record-create-R3`, `record-create-F01`, `record-create-F02`, `record-create-F03`, `record-create-F04` | `record-create-C1`, `record-create-C2`, `record-create-C3`, `record-create-FC01`, `record-create-FC02`, `record-create-FC03`, `record-create-FC04` |
| [record-edit](../../01_requirements/03_pages/record-edit/README.md) | `record-edit-R1`, `record-edit-R2`, `record-edit-F01`, `record-edit-F02`, `record-edit-F03`, `record-edit-F04` | `record-edit-C1`, `record-edit-C2`, `record-edit-FC01`, `record-edit-FC02`, `record-edit-FC03`, `record-edit-FC04` |
| [visit-confirm](../../01_requirements/03_pages/visit-confirm/README.md) | `visit-confirm-R1`, `visit-confirm-R2`, `visit-confirm-F01`, `visit-confirm-F02`, `visit-confirm-F03` | `visit-confirm-C1`, `visit-confirm-C2`, `visit-confirm-FC01`, `visit-confirm-FC02`, `visit-confirm-FC03` |
| [interpretation-correction](../../01_requirements/03_pages/interpretation-correction/README.md) | `interpretation-correction-R1`, `interpretation-correction-R2`, `interpretation-correction-F01`, `interpretation-correction-F02`, `interpretation-correction-F03` | `interpretation-correction-C1`, `interpretation-correction-C2`, `interpretation-correction-FC01`, `interpretation-correction-FC02`, `interpretation-correction-FC03` |
| [record-delete](../../01_requirements/03_pages/record-delete/README.md) | `record-delete-R1`, `record-delete-R2`, `record-delete-F01`, `record-delete-F02`, `record-delete-F03` | `record-delete-C1`, `record-delete-C2`, `record-delete-FC01`, `record-delete-FC02`, `record-delete-FC03` |
| [growth-result](../../01_requirements/03_pages/growth-result/README.md) | `growth-result-R1`, `growth-result-F01`, `growth-result-F02`, `growth-result-F03` | `growth-result-C1`, `growth-result-FC01`, `growth-result-FC02`, `growth-result-FC03` |
| [daily-track](../../01_requirements/03_pages/daily-track/README.md) | `daily-track-R1`, `daily-track-R2`, `daily-track-F01`, `daily-track-F02`, `daily-track-F03`, `daily-track-F04` | `daily-track-C1`, `daily-track-C2`, `daily-track-FC01`, `daily-track-FC02`, `daily-track-FC03`, `daily-track-FC04` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/records/`、`src/features/activity/`、`docs/evidence/UI-RECORDS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
