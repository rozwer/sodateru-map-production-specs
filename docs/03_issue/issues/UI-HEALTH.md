# UI-HEALTH｜主要UI後の未実施項目：健康の画面・許可・状態操作

<!-- task-id: UI-HEALTH -->

初期担当枠：A。担当者：rozwer。[GitHub #146](https://github.com/rozwer/sodateru-map-production-specs/issues/146)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## 主要UIの後に着手する範囲

主要UIの後に着手する未実施の主要UI後の未実施項目。恒久除外でも完了でもない。非健康設定・記録/訪問/軌跡の統計と取得元は必須。

元[UI-SETTINGS](UI-SETTINGS.md)の3健康画面とその入口、activity-stats/data-sources/settingsの健康面だけを引き受ける。非健康面は元UIと[CONNECT-SETTINGS](CONNECT-SETTINGS.md)に残す。健康の画面未達を接続へ隠してUI合格にしない。

## 具体的な受入

### health-connect

対応アプリ連携とXML選択・未連携/連携中の画面導線を用意し、ブラウザからHealthKitを直接読めると表示しない。

取消・失敗：端末file選択取消/無効XML/未接続を区別する。健康の対象範囲・着手時期は時間余り枠の未実施として保持し、未確認を完了扱いしない。

### health-permissions

歩数/距離/活動時間・期間・保存とAI利用を別々に選び、許可/何も取込まず戻るを操作する。

取消・失敗：取消で実取込0件。健康値を訪問や性格へ変換せず、同意外のデータを保存/送信しない。未実施を保持する。

### health-status

取得元/最終時点/欠測と0、新規停止/アプリ内削除の違いを表示して操作する。

取消・失敗：iPhone原本を削除せず、失敗/取消を停止・削除成功にしない。健康の未実施状態を保持する。

### settings

このページの健康の入口・状態・数値・取得元の面だけ。記録/訪問/軌跡や非健康設定は移管しない。

プロフィール/位置/写真マイク/AI/提案/健康/データ/表示入口を実shellへ組み込み、未連携・権限なし・OFFを区別する。

取消・失敗：実端末権限と保存済み設定を同一視せず、本人切替で旧概要を混ぜない。

### activity-stats

このページの健康の入口・状態・数値・取得元の面だけ。記録/訪問/軌跡や非健康設定は移管しない。

今日/週/月/年、単位/取得元/欠測と0、可変グラフ/合計・活動内訳・元記録導線を操作する。

取消・失敗：GPS距離を歩数に置換/混算せず、欠測を0にしない。健康未実施部分は明示して保留し、非健康集計と区別する。

### data-sources

このページの健康の入口・状態・数値・取得元の面だけ。記録/訪問/軌跡や非健康設定は移管しない。

歩数/訪問の取得方法・最終時点・権限なし/未連携/失敗を表示し、設定と日付別訪問へ操作する。

取消・失敗：取得失敗や未連携を0/取得成功にせず、健康未実施とGPS/訪問提供を混同しない。

## 通過条件

- 指定画像をDOM/CSSと実rendererで再現し、異なる2組のデータ・全表示状態で照合する。画像貼付けや透明な操作領域で代用しない。
- 今回対象のUI面について、全操作・遷移・入力/選択・下書き・取消・失敗表示を実shellで確認する。Mapbox実描画、媒体/マイク/位置/方位/ファイル等の端末操作はこのUIで行う。明示除外・余力移管の原IDは別枠で未実施を保持する。
- 320×740・390×844・1440×900・文字200%・ソフトキーボード・reduced motionで操作へ到達し、重なり・切れ・二重header・戻りscroll/focusを確認する。
- API提供前の応答は画面と証拠にmockと明記する。loading/empty/editing/saving/error/conflict/unavailableと遅着・取消の表示を制御可能な応答で確認し、実保存成功とは扱わない。

## 元IDの保持

健康3画面の13要件/13受入と共有ページの健康部分を[対応表](../ui-connections.json#/health_deferral)に原文付きで保持する。未実施はdeferredのまま残し、他機能の完了条件へ戻さない。

対象元要件：`settings-R1`, `settings-F01`, `settings-F02`, `health-connect-R1`, `health-connect-F01`, `health-connect-F02`, `health-connect-F03`, `health-permissions-R1`, `health-permissions-F01`, `health-permissions-F02`, `health-permissions-F03`, `health-permissions-F04`, `health-status-R1`, `health-status-F01`, `health-status-F02`, `health-status-F03`, `activity-stats-R1`, `activity-stats-R2`, `activity-stats-F01`, `activity-stats-F02`, `activity-stats-F03`, `data-sources-R1`, `data-sources-F01`, `data-sources-F02`, `data-sources-F03`。

対象元受入：`settings-C1`, `settings-FC01`, `settings-FC02`, `health-connect-C1`, `health-connect-FC01`, `health-connect-FC02`, `health-connect-FC03`, `health-permissions-C1`, `health-permissions-FC01`, `health-permissions-FC02`, `health-permissions-FC03`, `health-permissions-FC04`, `health-status-C1`, `health-status-FC01`, `health-status-FC02`, `health-status-FC03`, `activity-stats-C1`, `activity-stats-C2`, `activity-stats-FC01`, `activity-stats-FC02`, `activity-stats-FC03`, `data-sources-C1`, `data-sources-FC01`, `data-sources-FC02`, `data-sources-FC03`。

## 依存と提供物

- 着手前：[UI-SETTINGS](UI-SETTINGS.md)。
- 実接続・完了前：[UI-BASE](UI-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。

CONNECT-SETTINGSと同じfeature pathを使う場合は現行lockで取得待ちとする。二重claimや他者のlock解除はしない。UI-INTEGRATIONの完了をhard gateに追加しない。

## 編集範囲

提案path：`src/features/settings/`、`src/features/health/`、`docs/evidence/UI-HEALTH/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
