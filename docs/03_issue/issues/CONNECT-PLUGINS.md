# CONNECT-PLUGINS｜実接続：拡張機能の試用・導入・更新と機能要望

<!-- task-id: CONNECT-PLUGINS -->

初期担当枠：A。担当者：rozwer。[GitHub #144](https://github.com/rozwer/sodateru-map-production-specs/issues/144)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-PLUGINS](UI-PLUGINS.md)で完成した画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### plugin-store

getPluginsの実catalog/guideUrlと本人導入状態を接続し、検索結果と同じpluginIdで試用・管理へ進む。

取消・失敗：閲覧だけで導入/保存を変更せず、未取得catalogを架空の実機能として埋めない。

既存binding：`getPlugins`。

### plugin-detail

実catalogのid/版/出典/利用情報を試用へ渡す。

取消・失敗：紹介を見るだけでは導入せず、未確認情報を確定として表示しない。

既存binding：`getPlugins`。

### plugin-trial

PLUGINSの確定版trial snapshot/条件を取得し、導入確定時だけ採用snapshotを保存へ渡す。

取消・失敗：試用では導入設定を保存せず、未確認道路を走行可能としない。失効snapshot/取消は採用せず条件を保持する。

既存binding：`getPlugins`。契約補完：plugin-version。

### plugin-install

本人scopeでpostPluginSettingsを呼び、試用snapshotと同じ設定を保存再取得して通常地図へ適用する。

取消・失敗：取消で導入状態を変えず、stateRevision/If-Match/応答不明再送を確認する。失敗を導入済みにしない。

既存binding：`getPluginSettings`、`postPluginSettings`。

### plugin-manage

確定生成clientでplugin設定とiconOptionsを取得し、glyph IDだけを保存する。ownerKeyに対応する地図適用/停止と再取得を確認する。

取消・失敗：OFFで体験/保存場所を消さず、任意URL/絵文字本文をicon値にしない。競合/失敗で旧設定を保つ。

既存binding：`getPlugins`、`getPluginSettings`、`patchPluginSettingsPluginId`。契約補完：plugin-version。

### plugin-update

PLUGINS.lifecycleで版/設定/snapshotを保存再取得し、更新失敗で旧版・設定・保存スポットを保持する。

取消・失敗：版戻しを削除扱いせず、削除時は該当適用だけ外す。再送/競合で他機能や体験を壊さない。

既存binding：`getPlugins`、`getPluginSettings`、`deletePluginSettingsPluginId`。契約補完：plugin-version。

### plugin-conflict

確定した競合解決を版付き設定へ保存し、ownerKeyごとの実効表示を再取得する。

取消・失敗：戻る/取消は両設定を維持し、選んでいない機能を勝手に削除しない。

既存binding：`getPluginSettings`、`patchPluginSettingsPluginId`。契約補完：plugin-version。

### feature-requests

FEATURE-REQUESTSの実一覧・共感・固定表示名/タグ/guideUrl・CRUDを保存再取得し、二本人のprivate分離を確認する。

取消・失敗：フォームを開いただけでは依頼を送らず、投稿でコード生成/GitHub Issue作成を始めない。削除/失敗/再送でも他者の下書きを公開しない。

既存binding：`getFeatureRequests`、`deleteFeatureRequestsRequestId`。契約補完：feature-request。

### feature-request-edit

getMe/getRequestとPOST/PATCHで同じrequest ID・本文・表示名・公開範囲を保存再取得する。

取消・失敗：取消/失敗では既存投稿を変えず、再送で二重投稿しない。投稿だけでコード生成やGitHub Issueを作らない。

既存binding：`getMe`、`getFeatureRequestsRequestId`、`postFeatureRequests`、`patchFeatureRequestsRequestId`。契約補完：feature-request。

### ページをまたぐ受入・現状の残件

- BIKE/DISASTER/PILGRIMAGEの実データ・出典・保存結果・GeoJSON/画像を通常地図へ適用し、ownerKeyごとに停止する。確定したPLUGINS v2以降/生成clientの本人scope・stateRevision・If-Match・再送を確認する。

## 通過条件

- 元UIのdoneとlock返却後に同じfeature pathを取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


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

- 着手前：[UI-PLUGINS](UI-PLUGINS.md)。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[PLUGINS](PLUGINS.md)、[BIKE](BIKE.md)、[DISASTER](DISASTER.md)、[PILGRIMAGE](PILGRIMAGE.md)、[FEATURE-REQUESTS](FEATURE-REQUESTS.md)、[CORE](CORE.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [PLUGINS](PLUGINS.md)：`PLUGINS.state`、`PLUGINS.lifecycle`。本人別の導入・有効状態・版・適用宣言／試用・導入・更新・競合解決・版戻し。
- [BIKE](BIKE.md)：`BIKE.complete`。車種/高速条件付き地点と経路。
- [DISASTER](DISASTER.md)：`DISASTER.complete`。防災情報・出典/時点付き表示材料。
- [PILGRIMAGE](PILGRIMAGE.md)：`PILGRIMAGE.complete`。作品/地点の出典・巡回計画・保存。
- [FEATURE-REQUESTS](FEATURE-REQUESTS.md)：`FEATURE-REQUESTS.complete`。機能要望・共感・公開範囲・編集。
- [CORE](CORE.md)：`CORE.runtime`。同一origin起動・本人context・DB・再送/版。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/plugins/`、`src/features/feature-requests/`、`docs/evidence/CONNECT-PLUGINS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
