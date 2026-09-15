# UI-COMPANION｜既存相棒の取込・管理・動作確認と選択

<!-- task-id: UI-COMPANION -->

初期担当枠：A。担当者：rozwer。[GitHub #19](https://github.com/rozwer/sodateru-map-production-specs/issues/19)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-COMPANION](CONNECT-COMPANION.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### companion-settings

既存Codexペットの選択・表示ON/OFF・サイズ・reduced motion・取込導線を操作する。実atlasを描画し、非表示でもAI入口を残し主要操作を塞がない。新規制作入口は今回表示しない。

### companion-import

実ZIP選択・v2形式結果・有効atlasの動作previewと登録/現在選択の別操作を実装する。上限/壊れた構造の失敗を表示する。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-COMPANION](CONNECT-COMPANION.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。

## ユーザー指定の今回対象外

新規相棒の制作・生成は、制作入口/画面・下書き・指示持出し・生成先設定・生成/採用ごと今回対象外（`user-excluded`）。元5要件/5受入とcompanion-settings-F03の制作部分は原文を保持する。既存Codexペットの取込・実atlas表示・管理・選択は対象。対象外は未実施であり実装済みではない。[承認と対応](../ui-connections.json#/user_exclusions/companion-create)。

## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-COMPANION)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [companion-settings](../../01_requirements/03_pages/companion-settings/README.md) | `companion-settings-R1`, `companion-settings-F01`, `companion-settings-F02`, `companion-settings-F03`, `companion-settings-F04` | `companion-settings-C1`, `companion-settings-FC01`, `companion-settings-FC02`, `companion-settings-FC03`, `companion-settings-FC04` |
| [companion-import](../../01_requirements/03_pages/companion-import/README.md) | `companion-import-R1`, `companion-import-F01`, `companion-import-F02`, `companion-import-F03` | `companion-import-C1`, `companion-import-FC01`, `companion-import-FC02`, `companion-import-FC03` |
| [companion-create](../../01_requirements/03_pages/companion-create/README.md) | `companion-create-R1`, `companion-create-F01`, `companion-create-F02`, `companion-create-F03`, `companion-create-F04` | `companion-create-C1`, `companion-create-FC01`, `companion-create-FC02`, `companion-create-FC03`, `companion-create-FC04` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/companion/`、`docs/evidence/UI-COMPANION/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
