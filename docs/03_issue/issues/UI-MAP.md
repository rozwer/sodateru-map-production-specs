# UI-MAP｜場所検索・自分の地図・表示と装飾の編集

<!-- task-id: UI-MAP -->

初期担当枠：A。担当者：rozwer。[GitHub #8](https://github.com/rozwer/sodateru-map-production-specs/issues/8)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-MAP](CONNECT-MAP.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### map

Mapbox実地図の検索入力・候補一覧/詳細・保存/経路導線を操作し、2D/3D・レンズ・時間・追従・カメラ・選択を独立保持する。帰属と未確認の表示を残す。

### personal-map

テーマID切替、地図/詳細の場所・記録・用途対応、元記録/テーマ編集の導線を実Mapbox上で操作する。切替後の次元・カメラ・選択を保持する。

### map-layers

テーマ・探索候補・友達・バイクの個別表示と地図の即時previewを実装する。ON/OFF操作で選択・カメラを保ち、非表示と削除を区別する。

### object-edit

本人の飾りだけを編集する画面で名前20文字・メモ200文字・6色・小中大・配置preview・保存/取消/削除を操作する。成長建物には元記録/用途の訂正導線を出す。

### object-place

実Mapboxを移動/ズーム/現在地移動して中央マーカーの配置点を選ぶ。確定は編集下書きへ座標を返し、取消は旧位置へ戻る。

### ページをまたぐ受入・現状の残件

- AI地図設定の提案・preview・本人採用/取消も実地図で操作する。手動装飾と成長建物の表示を区別する。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-MAP](CONNECT-MAP.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-MAP)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [map](../../01_requirements/03_pages/map/README.md) | `map-R1`, `map-R2`, `map-R3`, `map-F01`, `map-F02`, `map-F03`, `map-F04`, `map-F05` | `map-C1`, `map-C2`, `map-C3`, `map-FC01`, `map-FC02`, `map-FC03`, `map-FC04`, `map-FC05` |
| [personal-map](../../01_requirements/03_pages/personal-map/README.md) | `personal-map-R1`, `personal-map-R2`, `personal-map-F01`, `personal-map-F02`, `personal-map-F03` | `personal-map-C1`, `personal-map-C2`, `personal-map-FC01`, `personal-map-FC02`, `personal-map-FC03` |
| [map-layers](../../01_requirements/03_pages/map-layers/README.md) | `map-layers-R1`, `map-layers-F01`, `map-layers-F02`, `map-layers-F03` | `map-layers-C1`, `map-layers-FC01`, `map-layers-FC02`, `map-layers-FC03` |
| [object-edit](../../01_requirements/03_pages/object-edit/README.md) | `object-edit-R1`, `object-edit-F01`, `object-edit-F02`, `object-edit-F03`, `object-edit-F04`, `object-edit-SCOPE` | `object-edit-C1`, `object-edit-FC01`, `object-edit-FC02`, `object-edit-FC03`, `object-edit-FC04`, `object-edit-SCOPE-C` |
| [object-place](../../01_requirements/03_pages/object-place/README.md) | `object-place-R1`, `object-place-F01`, `object-place-F02`, `object-place-F03`, `object-place-SCOPE` | `object-place-C1`, `object-place-FC01`, `object-place-FC02`, `object-place-FC03`, `object-place-SCOPE-C` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/map/`、`src/map/`、`docs/evidence/UI-MAP/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
