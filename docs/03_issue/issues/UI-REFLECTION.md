# UI-REFLECTION｜日記・振り返り回答・体験比較とメモ

<!-- task-id: UI-REFLECTION -->

初期担当枠：A。担当者：rozwer。[GitHub #12](https://github.com/rozwer/sodateru-map-production-specs/issues/12)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-REFLECTION](CONNECT-REFLECTION.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### self-home

今日の軌跡・タイプ診断・わたしの地図の3入口を実shellに組み込み、未許可/0件でも導線と戻り状態を保つ。

### diary

対象日移動・本文編集・実媒体選択/削除・AI下書きの確認/採用・明示保存を操作し、生成中の本人追記を保持する。

### reflection-question

一度に1問、元記録への戻り、自由文・回答/あとで/スキップ、原文保存とAI整理の別状態を操作する。

### reflection-history

すべて/回答済み/あとで/スキップの切替と質問回答展開、元記録・解釈更新を操作する。

### experience-compare

異なる2件のIDを選び、場所/日時/言葉・共通点/違いを並べ、各100文字の入力・保存/取消を操作する。

### memo-edit

名前20文字・本文200文字・由来・キーワード・提案ON/OFFの入力と保存/取消/削除を操作する。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-REFLECTION](CONNECT-REFLECTION.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-REFLECTION)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [self-home](../../01_requirements/03_pages/self-home/README.md) | `self-home-R1`, `self-home-R2`, `self-home-F01`, `self-home-F02`, `self-home-F03` | `self-home-C1`, `self-home-C2`, `self-home-FC01`, `self-home-FC02`, `self-home-FC03` |
| [diary](../../01_requirements/03_pages/diary/README.md) | `diary-R1`, `diary-R2`, `diary-F01`, `diary-F02`, `diary-F03` | `diary-C1`, `diary-C2`, `diary-FC01`, `diary-FC02`, `diary-FC03` |
| [reflection-question](../../01_requirements/03_pages/reflection-question/README.md) | `reflection-question-R1`, `reflection-question-R2`, `reflection-question-F01`, `reflection-question-F02`, `reflection-question-F03` | `reflection-question-C1`, `reflection-question-C2`, `reflection-question-FC01`, `reflection-question-FC02`, `reflection-question-FC03` |
| [reflection-history](../../01_requirements/03_pages/reflection-history/README.md) | `reflection-history-R1`, `reflection-history-F01`, `reflection-history-F02`, `reflection-history-F03` | `reflection-history-C1`, `reflection-history-FC01`, `reflection-history-FC02`, `reflection-history-FC03` |
| [experience-compare](../../01_requirements/03_pages/experience-compare/README.md) | `experience-compare-R1`, `experience-compare-F01`, `experience-compare-F02`, `experience-compare-F03` | `experience-compare-C1`, `experience-compare-FC01`, `experience-compare-FC02`, `experience-compare-FC03` |
| [memo-edit](../../01_requirements/03_pages/memo-edit/README.md) | `memo-edit-R1`, `memo-edit-F01`, `memo-edit-F02`, `memo-edit-F03`, `memo-edit-F04` | `memo-edit-C1`, `memo-edit-FC01`, `memo-edit-FC02`, `memo-edit-FC03`, `memo-edit-FC04` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/reflection/`、`docs/evidence/UI-REFLECTION/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
