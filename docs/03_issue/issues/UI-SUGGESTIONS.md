# UI-SUGGESTIONS｜今日の希望から候補選択・行き先へ

<!-- task-id: UI-SUGGESTIONS -->

初期担当枠：A。担当者：rozwer。[GitHub #15](https://github.com/rozwer/sodateru-map-production-specs/issues/15)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-SUGGESTIONS](CONNECT-SUGGESTIONS.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### self-checkin

今の状態/希望を任意入力し、15/30/60/120分以上・移動/同行者/負担を選び、回答のみ/候補生成/未回答地図の3操作を分ける。

### suggestions

理由・移動/滞在/合計・評価未実施/低評価を表示し、0件説明・条件変更・候補詳細を操作する。

### suggestion-detail

元希望・提案理由・公式情報/不明を別表示し、これにする/あとで・しおり/メモと地図復帰を操作する。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-SUGGESTIONS](CONNECT-SUGGESTIONS.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-SUGGESTIONS)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [self-checkin](../../01_requirements/03_pages/self-checkin/README.md) | `self-checkin-R1`, `self-checkin-R2`, `self-checkin-F01`, `self-checkin-F02`, `self-checkin-F03`, `self-checkin-F04`, `self-checkin-F05` | `self-checkin-C1`, `self-checkin-C2`, `self-checkin-FC01`, `self-checkin-FC02`, `self-checkin-FC03`, `self-checkin-FC04`, `self-checkin-FC05` |
| [suggestions](../../01_requirements/03_pages/suggestions/README.md) | `suggestions-R1`, `suggestions-R2`, `suggestions-F01`, `suggestions-F02`, `suggestions-F03` | `suggestions-C1`, `suggestions-C2`, `suggestions-FC01`, `suggestions-FC02`, `suggestions-FC03` |
| [suggestion-detail](../../01_requirements/03_pages/suggestion-detail/README.md) | `suggestion-detail-R1`, `suggestion-detail-F01`, `suggestion-detail-F02`, `suggestion-detail-F03`, `suggestion-detail-F04` | `suggestion-detail-C1`, `suggestion-detail-FC01`, `suggestion-detail-FC02`, `suggestion-detail-FC03`, `suggestion-detail-FC04` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/suggestions/`、`docs/evidence/UI-SUGGESTIONS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
