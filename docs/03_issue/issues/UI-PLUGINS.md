# UI-PLUGINS｜拡張機能の試用・導入・更新と機能要望

<!-- task-id: UI-PLUGINS -->

初期担当枠：A。担当者：rozwer。[GitHub #18](https://github.com/rozwer/sodateru-map-production-specs/issues/18)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-PLUGINS](CONNECT-PLUGINS.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### plugin-store

名前/実現したいこと/分類検索、見つける/管理する、詳細・要望・GitHubガイドを操作する。

### plugin-detail

機能・作者・更新日・利用情報・表示例と試用入口を操作する。

### plugin-trial

地域/車種/高速条件の入力と引継ぎ、同一範囲の実Mapbox上の自動before/afterを操作する。模擬previewを明示する。

### plugin-install

条件・利用情報・追加表示・未確認の確認、導入/成功地図/取消の連続UI操作を実装する。

### plugin-manage

ON/OFF・条件・アイコン6 glyph候補の選択/preview・地図・更新/相棒/検索への連続操作を実装する。

### plugin-update

現在/次版の比較と実地図preview、更新/取消/版戻し/削除を別操作にする。

### plugin-conflict

同一対象で競合する双方の表示を実地図で比較し、併用・片方OFF・戻るを操作する。

### feature-requests

公開/自分の下書き・共感件数/タグ・投稿/編集/削除・開発guide/依頼フォームを連続操作する。

### feature-request-edit

固定表示名の確認と200文字本文、private下書き/公開投稿・保存/取消を操作する。依頼相手/API/技術情報/完成基準の入力を増やさない。

### ページをまたぐ受入・現状の残件

- 現状回収：アイコン選択/preview画像確定、試用条件引継ぎ、導入/更新/取消/削除、要望投稿編集削除の連続UI操作は未達として元UIに残す（PR #73、docs/evidence/UI-PLUGINS/implementation.md）。成功済み主表示幅・自動Mapbox previewは変更等がなければ再検査しない。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-PLUGINS](CONNECT-PLUGINS.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-PLUGINS)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [plugin-store](../../01_requirements/03_pages/plugin-store/README.md) | `plugin-store-R1`, `plugin-store-F01`, `plugin-store-F02`, `plugin-store-F03`, `plugin-store-F04` | `plugin-store-C1`, `plugin-store-FC01`, `plugin-store-FC02`, `plugin-store-FC03`, `plugin-store-FC04` |
| [plugin-detail](../../01_requirements/03_pages/plugin-detail/README.md) | `plugin-detail-R1`, `plugin-detail-F01`, `plugin-detail-F02` | `plugin-detail-C1`, `plugin-detail-FC01`, `plugin-detail-FC02` |
| [plugin-trial](../../01_requirements/03_pages/plugin-trial/README.md) | `plugin-trial-R1`, `plugin-trial-F01`, `plugin-trial-F02`, `plugin-trial-F03` | `plugin-trial-C1`, `plugin-trial-FC01`, `plugin-trial-FC02`, `plugin-trial-FC03` |
| [plugin-install](../../01_requirements/03_pages/plugin-install/README.md) | `plugin-install-R1`, `plugin-install-F01`, `plugin-install-F02`, `plugin-install-F03` | `plugin-install-C1`, `plugin-install-FC01`, `plugin-install-FC02`, `plugin-install-FC03` |
| [plugin-manage](../../01_requirements/03_pages/plugin-manage/README.md) | `plugin-manage-R1`, `plugin-manage-F01`, `plugin-manage-F02`, `plugin-manage-F03`, `plugin-manage-F04` | `plugin-manage-C1`, `plugin-manage-FC01`, `plugin-manage-FC02`, `plugin-manage-FC03`, `plugin-manage-FC04` |
| [plugin-update](../../01_requirements/03_pages/plugin-update/README.md) | `plugin-update-R1`, `plugin-update-F01`, `plugin-update-F02`, `plugin-update-F03`, `plugin-update-F04` | `plugin-update-C1`, `plugin-update-FC01`, `plugin-update-FC02`, `plugin-update-FC03`, `plugin-update-FC04` |
| [plugin-conflict](../../01_requirements/03_pages/plugin-conflict/README.md) | `plugin-conflict-R1`, `plugin-conflict-F01`, `plugin-conflict-F02`, `plugin-conflict-F03` | `plugin-conflict-C1`, `plugin-conflict-FC01`, `plugin-conflict-FC02`, `plugin-conflict-FC03` |
| [feature-requests](../../01_requirements/03_pages/feature-requests/README.md) | `feature-requests-R1`, `feature-requests-F01`, `feature-requests-F02`, `feature-requests-F03`, `feature-requests-F04`, `feature-requests-FORM` | `feature-requests-C1`, `feature-requests-FC01`, `feature-requests-FC02`, `feature-requests-FC03`, `feature-requests-FC04`, `feature-requests-FORM-C` |
| [feature-request-edit](../../01_requirements/03_pages/feature-request-edit/README.md) | `feature-request-edit-R1`, `feature-request-edit-F01`, `feature-request-edit-F02`, `feature-request-edit-F03`, `feature-request-edit-FORM` | `feature-request-edit-C1`, `feature-request-edit-FC01`, `feature-request-edit-FC02`, `feature-request-edit-FC03`, `feature-request-edit-FORM-C` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/plugins/`、`src/features/feature-requests/`、`docs/evidence/UI-PLUGINS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
