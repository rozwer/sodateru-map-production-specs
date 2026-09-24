# UI-SETTINGS｜設定・プロフィール・活動統計と取得元（非健康）

<!-- task-id: UI-SETTINGS -->

初期担当枠：A。担当者：rozwer。[GitHub #17](https://github.com/rozwer/sodateru-map-production-specs/issues/17)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

この画面群の指定画像・実描画・画面/端末操作・状態を完成させる。非UIの実API保存/再取得は[CONNECT-SETTINGS](CONNECT-SETTINGS.md)が持つ。UI単体のcloseは機能完成ではない。

## UIに残す具体的操作

### settings

プロフィール・位置・写真/マイク・AI・提案・本人データ・表示の入口と状態を実shellで操作する。健康の入口/状態はUI-HEALTHの主要UI後の未実施項目に明示移管する。

### profile-settings

実画像選択、名前20文字/紹介200文字、文字サイズ/reduced motion/通知時刻を操作し、大きな文字でもフォーム/地図/下部操作を重ねない。

### suggestion-settings

提案のタイミング・集計期間・場所＋活動の停止/解除を操作し、低評価との違いを表示する。

### activity-stats

期間切替と記録/訪問/軌跡由来の内訳・グラフ・単位・欠測/0、元記録への導線を操作する。健康由来の歩数/距離等の面はUI-HEALTHに残す。

### data-sources

記録/訪問/軌跡の取得方法・最終時点・権限/失敗、日付別訪問への導線を操作する。健康取得元と連携入口はUI-HEALTHへ移す。

### ページをまたぐ受入・現状の残件

- 健康3画面とその入口・健康統計/取得元の面はUI-HEALTHへ明示移管し、未実施の主要UI後の未実施項目として追跡する。settings/profile/suggestion-settingsと非健康の記録・訪問・軌跡統計は必須。未達の健康UIを接続Issueへ隠して合格にしない。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

同じsource IDの通信対象ID・永続保存・再起動/再取得・実取消/失敗の確認は後続の[CONNECT-SETTINGS](CONNECT-SETTINGS.md)へ移管する。UI側では確定済みの境界へ渡す入力/選択・表示・操作を確認し、mockの成功を実通信の証拠にしない。

## 健康は別の主要UI後の未実施項目

health-connect / health-permissions / health-statusの3画面・入口、統計/取得元の健康面は[UI-HEALTH](UI-HEALTH.md)と[CONNECT-HEALTH](CONNECT-HEALTH.md)へ移管した。主要UIの後に着手する未実施の範囲として追跡し、この非健康UI/実接続のcloseに必須依存させない。settings/profile/suggestion-settings、記録/訪問/軌跡の統計と取得元は必須に残す。健康を恒久除外・実装済みにせず、未実施の健康UIを実接続へ隠してUI合格にしない。

## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-SETTINGS)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [settings](../../01_requirements/03_pages/settings/README.md) | `settings-R1`, `settings-F01`, `settings-F02` | `settings-C1`, `settings-FC01`, `settings-FC02` |
| [profile-settings](../../01_requirements/03_pages/profile-settings/README.md) | `profile-settings-R1`, `profile-settings-F01`, `profile-settings-F02`, `profile-settings-F03`, `profile-settings-F04` | `profile-settings-C1`, `profile-settings-FC01`, `profile-settings-FC02`, `profile-settings-FC03`, `profile-settings-FC04` |
| [suggestion-settings](../../01_requirements/03_pages/suggestion-settings/README.md) | `suggestion-settings-R1`, `suggestion-settings-F01`, `suggestion-settings-F02`, `suggestion-settings-F03` | `suggestion-settings-C1`, `suggestion-settings-FC01`, `suggestion-settings-FC02`, `suggestion-settings-FC03` |
| [health-connect](../../01_requirements/03_pages/health-connect/README.md) | `health-connect-R1`, `health-connect-F01`, `health-connect-F02`, `health-connect-F03` | `health-connect-C1`, `health-connect-FC01`, `health-connect-FC02`, `health-connect-FC03` |
| [health-permissions](../../01_requirements/03_pages/health-permissions/README.md) | `health-permissions-R1`, `health-permissions-F01`, `health-permissions-F02`, `health-permissions-F03`, `health-permissions-F04` | `health-permissions-C1`, `health-permissions-FC01`, `health-permissions-FC02`, `health-permissions-FC03`, `health-permissions-FC04` |
| [health-status](../../01_requirements/03_pages/health-status/README.md) | `health-status-R1`, `health-status-F01`, `health-status-F02`, `health-status-F03` | `health-status-C1`, `health-status-FC01`, `health-status-FC02`, `health-status-FC03` |
| [activity-stats](../../01_requirements/03_pages/activity-stats/README.md) | `activity-stats-R1`, `activity-stats-R2`, `activity-stats-F01`, `activity-stats-F02`, `activity-stats-F03` | `activity-stats-C1`, `activity-stats-C2`, `activity-stats-FC01`, `activity-stats-FC02`, `activity-stats-FC03` |
| [data-sources](../../01_requirements/03_pages/data-sources/README.md) | `data-sources-R1`, `data-sources-F01`, `data-sources-F02`, `data-sources-F03` | `data-sources-C1`, `data-sources-FC01`, `data-sources-FC02`, `data-sources-FC03` |

## 依存と提供物

- 着手前：なし。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/settings/`、`src/features/health/`、`docs/evidence/UI-SETTINGS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
