# CONNECT-SETTINGS｜実接続：設定・プロフィール・活動統計と取得元（非健康）

<!-- task-id: CONNECT-SETTINGS -->

初期担当枠：A。担当者：rozwer。[GitHub #145](https://github.com/rozwer/sodateru-map-production-specs/issues/145)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-SETTINGS](UI-SETTINGS.md)で完成した画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### settings

getMeとSETTINGS.preferences/dataを共通clientへ接続し、非健康の設定と本人/dataMode別概要を保存再取得する。

取消・失敗：実端末権限と保存設定を区別し、取消/競合/本人切替で旧本人の値を反映しない。

既存binding：`getMe`。契約補完：settings。

### profile-settings

profile/表示設定・icon媒体を本人のAPIへ保存し、再起動後も同じ設定と媒体を取得して表示へ適用する。

取消・失敗：媒体だけ失敗した場合と設定保存失敗を分け、版競合時に入力を保持し別本人を変更しない。

既存binding：`getMe`、`patchMe`。契約補完：settings。

### suggestion-settings

SETTINGS.preferencesを保存再取得し、SUGGESTIONSの実生成条件で停止対象と通知/AI参照範囲の反映を確認する。

取消・失敗：解除するまで停止を維持し、低評価を全体停止に変換しない。取消では保存値を変更しない。

既存binding：ページ定義に既存bindingなし。契約補完：settings。

### activity-stats

INSIGHTS.summary/INFORMATION.read/ACTIVITYの同期間/timeZoneの非健康数値を実取得し、合計・グラフ・元記録を一致させる。

取消・失敗：GPS距離と歩数を混算/置換せず、欠測を0へ変換しない。健康未実施を非健康集計の失敗や完成と混同しない。

既存binding：`getReflectionSummary`、`getRecords`。契約補完：health。

### data-sources

ACTIVITY visitsと非健康集計の取得元/時点を実読取し、同じ日付の原記録へ戻る。

取消・失敗：取得失敗や未許可を0/成功と表示せず、本人/dataModeが異なる取得元を混ぜない。

既存binding：`getVisits`。契約補完：health。

### ページをまたぐ受入・現状の残件

- SETTINGS.dataの本人データ一覧・書出し・削除とAI送信範囲、非健康の記録/訪問/軌跡統計を実接続する。健康取込/保存/停止/削除と健康数値の面はCONNECT-HEALTHへ移管する。

## 通過条件

- 元UIのdoneとlock返却後に同じfeature pathを取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。

## 健康は別の余力枠

health-connect / health-permissions / health-statusの3画面・入口、統計/取得元の健康面は[UI-HEALTH](UI-HEALTH.md)と[CONNECT-HEALTH](CONNECT-HEALTH.md)へ移管した。時間が余れば着手する未実施の範囲として追跡し、この非健康UI/実接続のcloseに必須依存させない。settings/profile/suggestion-settings、記録/訪問/軌跡の統計と取得元は必須に残す。健康を恒久除外・実装済みにせず、未実施の健康UIを実接続へ隠してUI合格にしない。

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

- 着手前：[UI-SETTINGS](UI-SETTINGS.md)。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[SETTINGS](SETTINGS.md)、[ACTIVITY](ACTIVITY.md)、[INSIGHTS](INSIGHTS.md)、[CORE](CORE.md)、[CONNECT-BASE](CONNECT-BASE.md)、[INFORMATION](INFORMATION.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [SETTINGS](SETTINGS.md)：`SETTINGS.preferences`、`SETTINGS.data`。プロフィール・利用設定・AI送信範囲・提案停止／アイコン・本人データ一覧/書出し/削除。
- [ACTIVITY](ACTIVITY.md)：`ACTIVITY.track`。位置観測・日別軌跡・範囲削除。
- [INSIGHTS](INSIGHTS.md)：`INSIGHTS.summary`。記録/訪問に基づく期間集計。
- [CORE](CORE.md)：`CORE.runtime`。同一origin起動・本人context・DB・再送/版。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`。記録検索・実効日時/場所・現在の閲覧条件。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/settings/`、`src/features/health/`、`docs/evidence/CONNECT-SETTINGS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
