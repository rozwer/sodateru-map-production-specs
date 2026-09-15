# UI-EXPLORE｜街歩き相談・履歴・音声と探索候補

<!-- task-id: UI-EXPLORE -->

初期担当枠：A。担当者：rozwer。[GitHub #10](https://github.com/rozwer/sodateru-map-production-specs/issues/10)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-EXPLORE](CONNECT-EXPLORE.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### ai-explore

共通チャットで文章・起点選択、候補/確認事項・処理中/取消/失敗/再試行を操作し、同じ候補を実地図へ表示する。

### voice-consultation

実端末でマイク許可・録音開始/停止・録音時間を扱い、文字起こし結果の編集/消去・送信確認を操作する。

### ai-consent

送る本文と場所のpreview、場所の変更/解除、有効化して送信・取消を操作する。取消でも原入力を残す。

### conversation-history

日付/検索・会話一覧/発言展開・新規相談を操作し、選択conversation IDと表示を保つ。

### mist-detail

もやを未形成候補として描き、写真・入口・理由・出典・しおり・道路経路/コンパスを操作する。

### quest-compass

実測位/方位の許可・方向・直線距離・精度・取得時点を表示し、道路案内との区別、地図復帰と明示終了を操作する。

### ページをまたぐ受入・現状の残件

- 別都市への体験移転の入口・二案比較・本人採用の画面操作も元UIに残す。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-EXPLORE](CONNECT-EXPLORE.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-EXPLORE)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [ai-explore](../../01_requirements/03_pages/ai-explore/README.md) | `ai-explore-R1`, `ai-explore-R2`, `ai-explore-F01`, `ai-explore-F02`, `ai-explore-F03`, `ai-explore-F04` | `ai-explore-C1`, `ai-explore-C2`, `ai-explore-FC01`, `ai-explore-FC02`, `ai-explore-FC03`, `ai-explore-FC04` |
| [voice-consultation](../../01_requirements/03_pages/voice-consultation/README.md) | `voice-consultation-R1`, `voice-consultation-F01`, `voice-consultation-F02`, `voice-consultation-F03` | `voice-consultation-C1`, `voice-consultation-FC01`, `voice-consultation-FC02`, `voice-consultation-FC03` |
| [ai-consent](../../01_requirements/03_pages/ai-consent/README.md) | `ai-consent-R1`, `ai-consent-F01`, `ai-consent-F02`, `ai-consent-F03` | `ai-consent-C1`, `ai-consent-FC01`, `ai-consent-FC02`, `ai-consent-FC03` |
| [conversation-history](../../01_requirements/03_pages/conversation-history/README.md) | `conversation-history-R1`, `conversation-history-F01`, `conversation-history-F02`, `conversation-history-F03` | `conversation-history-C1`, `conversation-history-FC01`, `conversation-history-FC02`, `conversation-history-FC03` |
| [mist-detail](../../01_requirements/03_pages/mist-detail/README.md) | `mist-detail-R1`, `mist-detail-F01`, `mist-detail-F02`, `mist-detail-F03` | `mist-detail-C1`, `mist-detail-FC01`, `mist-detail-FC02`, `mist-detail-FC03` |
| [quest-compass](../../01_requirements/03_pages/quest-compass/README.md) | `quest-compass-R1`, `quest-compass-F01`, `quest-compass-F02`, `quest-compass-F03` | `quest-compass-C1`, `quest-compass-FC01`, `quest-compass-FC02`, `quest-compass-FC03` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/exploration/`、`src/features/transfer/`、`docs/evidence/UI-EXPLORE/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
