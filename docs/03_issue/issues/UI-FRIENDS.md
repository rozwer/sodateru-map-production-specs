# UI-FRIENDS｜友達との共有・地図・比較とおすすめルート

<!-- task-id: UI-FRIENDS -->

初期担当枠：A。担当者：rozwer。[GitHub #14](https://github.com/rozwer/sodateru-map-production-specs/issues/14)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-FRIENDS](CONNECT-FRIENDS.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### community-home

地域の知/友達の地図の入口、同じ共有情報から一覧/地図への遷移を実shellで操作する。

### friends-map

友達検索/選択と実地図・投稿・比較を同期し、持ち主ごとの用途/原文・共有0件・経路への導線を操作する。

### friend-profile

紹介・共有テーマ/最近の記録、申請/受信承認/解除の状態、地図/比較/ルート/共有記録選択を操作する。

### friend-compare

双方の用途/理由・共通点/違い/情報不足と元記録、持ち主が識別できる実地図重ね合わせを操作する。

### shared-route

作者・テーマ・地点順・説明・移動/滞在時間、元行程と自分条件の変更案を実地図で比較する。

### sharing

写真本文previewとprivate/selected/public、複数友達、明示共有/取消を操作する。選択0人と未保存を表示する。

### friend-picker

検索・プロフィール確認・複数選択・完了/取消を操作し、選択IDだけを共有下書きへ返す。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-FRIENDS](CONNECT-FRIENDS.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-FRIENDS)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [community-home](../../01_requirements/03_pages/community-home/README.md) | `community-home-R1`, `community-home-F01`, `community-home-F02` | `community-home-C1`, `community-home-FC01`, `community-home-FC02` |
| [friends-map](../../01_requirements/03_pages/friends-map/README.md) | `friends-map-R1`, `friends-map-R2`, `friends-map-F01`, `friends-map-F02`, `friends-map-F03`, `friends-map-F04` | `friends-map-C1`, `friends-map-C2`, `friends-map-FC01`, `friends-map-FC02`, `friends-map-FC03`, `friends-map-FC04` |
| [friend-profile](../../01_requirements/03_pages/friend-profile/README.md) | `friend-profile-R1`, `friend-profile-F01`, `friend-profile-F02`, `friend-profile-F03`, `friend-profile-F04` | `friend-profile-C1`, `friend-profile-FC01`, `friend-profile-FC02`, `friend-profile-FC03`, `friend-profile-FC04` |
| [friend-compare](../../01_requirements/03_pages/friend-compare/README.md) | `friend-compare-R1`, `friend-compare-F01`, `friend-compare-F02`, `friend-compare-F03` | `friend-compare-C1`, `friend-compare-FC01`, `friend-compare-FC02`, `friend-compare-FC03` |
| [shared-route](../../01_requirements/03_pages/shared-route/README.md) | `shared-route-R1`, `shared-route-F01`, `shared-route-F02`, `shared-route-F03` | `shared-route-C1`, `shared-route-FC01`, `shared-route-FC02`, `shared-route-FC03` |
| [sharing](../../01_requirements/03_pages/sharing/README.md) | `sharing-R1`, `sharing-R2`, `sharing-F01`, `sharing-F02`, `sharing-F03`, `sharing-F04` | `sharing-C1`, `sharing-C2`, `sharing-FC01`, `sharing-FC02`, `sharing-FC03`, `sharing-FC04` |
| [friend-picker](../../01_requirements/03_pages/friend-picker/README.md) | `friend-picker-R1`, `friend-picker-F01`, `friend-picker-F02`, `friend-picker-F03` | `friend-picker-C1`, `friend-picker-FC01`, `friend-picker-FC02`, `friend-picker-FC03` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/friends/`、`docs/evidence/UI-FRIENDS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
