# CONNECT-HEALTH｜主要UI後の未実施項目：健康の取込・保存・停止/削除の実接続

<!-- task-id: CONNECT-HEALTH -->

初期担当枠：A。担当者：rozwer。[GitHub #148](https://github.com/rozwer/sodateru-map-production-specs/issues/148)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## 主要UIの後に着手する範囲

主要UIの後に着手する未実施の主要UI後の未実施項目。恒久除外でも完了でもない。非健康設定・記録/訪問/軌跡の統計と取得元は必須。

元[UI-SETTINGS](UI-SETTINGS.md)の3健康画面とその入口、activity-stats/data-sources/settingsの健康面だけを引き受ける。非健康面は元UIと[CONNECT-SETTINGS](CONNECT-SETTINGS.md)に残す。健康の画面未達を接続へ隠してUI合格にしない。

## 具体的な受入

### health-connect

HEALTHの実対応アプリまたは本人XMLを取込条件へ渡し、取得元付きの取込結果を再取得する。

取消・失敗：端末file選択取消/無効XML/未接続を区別する。健康の対象範囲・着手時期は時間余り枠の未実施として保持し、未確認を完了扱いしない。

### health-permissions

選択項目/期間/保存/AI同意だけをHEALTH取込へ適用して保存再取得し、AI利用OFFの境界を確認する。

取消・失敗：取消で実取込0件。健康値を訪問や性格へ変換せず、同意外のデータを保存/送信しない。未実施を保持する。

### health-status

停止後は新規取込を止め既存値を再取得し、削除後はこのアプリ内保存分だけが消えることを確認する。

取消・失敗：iPhone原本を削除せず、失敗/取消を停止・削除成功にしない。健康の未実施状態を保持する。

### settings

このページの健康の入口・状態・数値・取得元の面だけ。記録/訪問/軌跡や非健康設定は移管しない。

getMeとSETTINGS.preferences/dataを接続し、各設定画面の保存結果を本人/dataMode別の概要へ再取得する。

取消・失敗：実端末権限と保存済み設定を同一視せず、本人切替で旧概要を混ぜない。

### activity-stats

このページの健康の入口・状態・数値・取得元の面だけ。記録/訪問/軌跡や非健康設定は移管しない。

INSIGHTS summary/recordsとHEALTHの数値を同期間/timeZoneで実取得し、元記録と集計を一致させる。

取消・失敗：GPS距離を歩数に置換/混算せず、欠測を0にしない。健康未実施部分は明示して保留し、非健康集計と区別する。

### data-sources

このページの健康の入口・状態・数値・取得元の面だけ。記録/訪問/軌跡や非健康設定は移管しない。

ACTIVITY visitsとHEALTHの実取得元/時点を読取り、該当集計と同じ原データへ戻る。

取消・失敗：取得失敗や未連携を0/取得成功にせず、健康未実施とGPS/訪問提供を混同しない。

## 通過条件

- UI-HEALTHのdoneとlock返却後に同じfeature pathを取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

## 元IDの保持

健康3画面の13要件/13受入と共有ページの健康部分を[対応表](../ui-connections.json#/health_deferral)に原文付きで保持する。未実施はdeferredのまま残し、他機能の完了条件へ戻さない。

対象元要件：`settings-R1`, `settings-F01`, `settings-F02`, `health-connect-R1`, `health-connect-F01`, `health-connect-F02`, `health-connect-F03`, `health-permissions-R1`, `health-permissions-F01`, `health-permissions-F02`, `health-permissions-F03`, `health-permissions-F04`, `health-status-R1`, `health-status-F01`, `health-status-F02`, `health-status-F03`, `activity-stats-R1`, `activity-stats-R2`, `activity-stats-F01`, `activity-stats-F02`, `activity-stats-F03`, `data-sources-R1`, `data-sources-F01`, `data-sources-F02`, `data-sources-F03`。

対象元受入：`settings-C1`, `settings-FC01`, `settings-FC02`, `health-connect-C1`, `health-connect-FC01`, `health-connect-FC02`, `health-connect-FC03`, `health-permissions-C1`, `health-permissions-FC01`, `health-permissions-FC02`, `health-permissions-FC03`, `health-permissions-FC04`, `health-status-C1`, `health-status-FC01`, `health-status-FC02`, `health-status-FC03`, `activity-stats-C1`, `activity-stats-C2`, `activity-stats-FC01`, `activity-stats-FC02`, `activity-stats-FC03`, `data-sources-C1`, `data-sources-FC01`, `data-sources-FC02`, `data-sources-FC03`。

## 依存と提供物

- 着手前：[UI-HEALTH](UI-HEALTH.md)。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[HEALTH](HEALTH.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [HEALTH](HEALTH.md)：`HEALTH.complete`。健康取込・期間許可・停止/削除・集計。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。

CONNECT-SETTINGSと同じfeature pathを使う場合は現行lockで取得待ちとする。二重claimや他者のlock解除はしない。UI-INTEGRATIONの完了をhard gateに追加しない。

## 編集範囲

提案path：`src/features/settings/`、`src/features/health/`、`docs/evidence/CONNECT-HEALTH/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
