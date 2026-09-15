# UI-ROUTES｜経路条件・候補比較・徒歩案内

<!-- task-id: UI-ROUTES -->

初期担当枠：A。担当者：rozwer。[GitHub #9](https://github.com/rozwer/sodateru-map-production-specs/issues/9)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-ROUTES](CONNECT-ROUTES.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### route-conditions

地点順・出発/帰着・移動手段・階段回避・屋根優先の入力と条件保持、候補検索・戻りを操作する。

### route-results

実Mapboxの候補線とカード選択を同期し、移動＋滞在の合計・距離・成立/違反/不明を表示する。条件復帰・採用/取消を操作する。

### route-navigation

実地図・実測位で曲がる地点/方向・残距離/時間・精度を表示し、案内継続中の地図/一覧復帰と明示終了を操作する。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-ROUTES](CONNECT-ROUTES.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-ROUTES)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [route-conditions](../../01_requirements/03_pages/route-conditions/README.md) | `route-conditions-R1`, `route-conditions-F01`, `route-conditions-F02`, `route-conditions-F03` | `route-conditions-C1`, `route-conditions-FC01`, `route-conditions-FC02`, `route-conditions-FC03` |
| [route-results](../../01_requirements/03_pages/route-results/README.md) | `route-results-R1`, `route-results-F01`, `route-results-F02`, `route-results-F03`, `route-results-F04` | `route-results-C1`, `route-results-FC01`, `route-results-FC02`, `route-results-FC03`, `route-results-FC04` |
| [route-navigation](../../01_requirements/03_pages/route-navigation/README.md) | `route-navigation-R1`, `route-navigation-F01`, `route-navigation-F02`, `route-navigation-F03`, `route-navigation-F04` | `route-navigation-C1`, `route-navigation-FC01`, `route-navigation-FC02`, `route-navigation-FC03`, `route-navigation-FC04` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/routes/`、`docs/evidence/UI-ROUTES/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
