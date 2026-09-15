# UI-INSIGHTS｜傾向・根拠の訂正とテーマ管理

<!-- task-id: UI-INSIGHTS -->

初期担当枠：A。担当者：rozwer。[GitHub #13](https://github.com/rozwer/sodateru-map-production-specs/issues/13)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-INSIGHTS](CONNECT-INSIGHTS.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### type-diagnosis

今日/週/月/これまでの期間、仮の呼び名・可変グラフ・変化・反例/欠測・本人確認状態を表示し、根拠/訂正/探索へ操作する。

### trend-evidence

本人原文・観測・AI推定・反例・未知を別表示し、複数の元記録と訂正への導線を操作する。

### trend-review

agree/disagree/unsureと任意理由200文字、保存/取消・失敗時入力保持を操作する。

### themes

テーマ一覧の名前/写真/所属件数と新規作成・記録選択・地図への導線を操作する。

### theme-edit

名前20文字・説明100文字・7色・代表写真・複数記録の下書き、保存/取消/削除を操作する。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-INSIGHTS](CONNECT-INSIGHTS.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-INSIGHTS)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [type-diagnosis](../../01_requirements/03_pages/type-diagnosis/README.md) | `type-diagnosis-R1`, `type-diagnosis-R2`, `type-diagnosis-F01`, `type-diagnosis-F02`, `type-diagnosis-F03`, `type-diagnosis-F04` | `type-diagnosis-C1`, `type-diagnosis-C2`, `type-diagnosis-FC01`, `type-diagnosis-FC02`, `type-diagnosis-FC03`, `type-diagnosis-FC04` |
| [trend-evidence](../../01_requirements/03_pages/trend-evidence/README.md) | `trend-evidence-R1`, `trend-evidence-F01`, `trend-evidence-F02`, `trend-evidence-F03` | `trend-evidence-C1`, `trend-evidence-FC01`, `trend-evidence-FC02`, `trend-evidence-FC03` |
| [trend-review](../../01_requirements/03_pages/trend-review/README.md) | `trend-review-R1`, `trend-review-F01`, `trend-review-F02`, `trend-review-F03` | `trend-review-C1`, `trend-review-FC01`, `trend-review-FC02`, `trend-review-FC03` |
| [themes](../../01_requirements/03_pages/themes/README.md) | `themes-R1`, `themes-F01`, `themes-F02`, `themes-F03` | `themes-C1`, `themes-FC01`, `themes-FC02`, `themes-FC03` |
| [theme-edit](../../01_requirements/03_pages/theme-edit/README.md) | `theme-edit-R1`, `theme-edit-F01`, `theme-edit-F02`, `theme-edit-F03`, `theme-edit-F04` | `theme-edit-C1`, `theme-edit-FC01`, `theme-edit-FC02`, `theme-edit-FC03`, `theme-edit-FC04` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/insights/`、`src/features/themes/`、`docs/evidence/UI-INSIGHTS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
