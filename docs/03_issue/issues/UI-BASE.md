# UI-BASE｜共通UI・ナビゲーションと画面復帰

<!-- task-id: UI-BASE -->

初期担当枠：A。担当者：rozwer。[GitHub #4](https://github.com/rozwer/sodateru-map-production-specs/issues/4)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-BASE](CONNECT-BASE.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### navigation

最新メニュー/下部ナビ、単一Sheet/side panel、戻る/Escape、呼出元の地図範囲・選択ID・日付・下書き・scroll・focusを実shellで保持する。記録/案内の継続状態と画面の開閉を分ける。

### ページをまたぐ受入・現状の残件

- 地図/チャット/画面登録の境界と共通部品を実shellとして先行提供する。API接続なしでも画面構成と状態取消を確認する。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-BASE](CONNECT-BASE.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-BASE)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [navigation](../../01_requirements/03_pages/navigation/README.md) | `navigation-R1`, `navigation-R2`, `navigation-F01`, `navigation-F02`, `navigation-F03` | `navigation-C1`, `navigation-C2`, `navigation-FC01`, `navigation-FC02`, `navigation-FC03` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：なし。


提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/app/`、`src/ui/`、`src/messages.ts`、`index.html`、`vite.config.ts`、`docs/evidence/UI-BASE/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
