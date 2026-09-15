# UI-KNOWLEDGE｜地域の知の検索・絞込・詳細と投稿

<!-- task-id: UI-KNOWLEDGE -->

初期担当枠：A。担当者：rozwer。[GitHub #16](https://github.com/rozwer/sodateru-map-production-specs/issues/16)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-KNOWLEDGE](CONNECT-KNOWLEDGE.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### local-knowledge

同じplaceIdの声・作者原文/投稿日・店舗現在情報を区別し、地域再選択・実現在地移動と一覧への導線を操作する。

### knowledge-list

分類/文字検索・地域/目的/期間/範囲、媒体あり一覧・件数・詳細・実Mapboxを操作し、同じ条件と選択を保持する。

### knowledge-filter

中心/半径とbboxを区別するMapPreview、適用前下書き・cancel・クリア後適用を操作する。

### knowledge-detail

媒体ありの画像照合、実動画の再生/停止/音量/seek、作者/日時/場所/原文・出典導線を操作する。4画面の実shell組込み、二重header/余白、keyboard/戻りscrollも確認する。

### ページをまたぐ受入・現状の残件

- 現状回収：媒体あり画像比較、MapPreview中心/半径/bbox、4画面shell組込み/二重header余白、実shell keyboard/戻りscrollが未達。これらが残る間はUIをcloseしない（PR #45、docs/evidence/UI-KNOWLEDGE/progress.md）。成功済み幅・条件cancel・地域再選択・Escape・媒体active停止は変更等がなければ再検査しない。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-KNOWLEDGE](CONNECT-KNOWLEDGE.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-KNOWLEDGE)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [local-knowledge](../../01_requirements/03_pages/local-knowledge/README.md) | `local-knowledge-R1`, `local-knowledge-F01`, `local-knowledge-F02`, `local-knowledge-F03` | `local-knowledge-C1`, `local-knowledge-FC01`, `local-knowledge-FC02`, `local-knowledge-FC03` |
| [knowledge-list](../../01_requirements/03_pages/knowledge-list/README.md) | `knowledge-list-R1`, `knowledge-list-F01`, `knowledge-list-F02`, `knowledge-list-F03`, `knowledge-list-F04` | `knowledge-list-C1`, `knowledge-list-FC01`, `knowledge-list-FC02`, `knowledge-list-FC03`, `knowledge-list-FC04` |
| [knowledge-filter](../../01_requirements/03_pages/knowledge-filter/README.md) | `knowledge-filter-R1`, `knowledge-filter-F01`, `knowledge-filter-F02`, `knowledge-filter-F03` | `knowledge-filter-C1`, `knowledge-filter-FC01`, `knowledge-filter-FC02`, `knowledge-filter-FC03` |
| [knowledge-detail](../../01_requirements/03_pages/knowledge-detail/README.md) | `knowledge-detail-R1`, `knowledge-detail-F01`, `knowledge-detail-F02`, `knowledge-detail-F03` | `knowledge-detail-C1`, `knowledge-detail-FC01`, `knowledge-detail-FC02`, `knowledge-detail-FC03` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/knowledge/`、`docs/evidence/UI-KNOWLEDGE/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
