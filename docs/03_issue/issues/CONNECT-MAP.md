# CONNECT-MAP｜実接続：場所検索・自分の地図・表示と装飾の編集

<!-- task-id: CONNECT-MAP -->

初期担当枠：A。担当者：rozwer。[GitHub #134](https://github.com/rozwer/sodateru-map-production-specs/issues/134)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-MAP](UI-MAP.md)の対象操作が整った画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### map

getPlaceCandidates/getPlaces→getPlacesPlaceId→postPlacesを同じ候補/search IDで接続し、採用後のplaceIdを再読込して開く。getMapGrowthの実材料を地図へ渡し、候補閲覧/次元変更で訪問・記録が増えないことを確認する。

取消・失敗：期限切れ/0件/取得失敗を分ける。再送は同じ採用IDへ収束し、既保存placeIdでpostPlacesを呼ばない。取消は保存対象を変えない。

既存binding：`getPlaceCandidates`、`getPlaces`、`getPlacesPlaceId`、`postPlaces`、`getMapGrowth`。契約補完：bookmark。

### personal-map

getThemes/getRecords(themeId)/getPlaces/getMapGrowthで同じ所属を表示し、テーマ編集保存後の再取得と地図絞込を一致させる。名称や件数でIDを代用しない。

取消・失敗：テーマ/記録の変更・削除後に古い所属を復活させず、閲覧では記録を変更しない。

既存binding：`getThemes`、`getRecords`、`getPlaces`、`getMapGrowth`。

### map-layers

MAP-CUSTOMの本人/dataMode別表示設定とPLUGINS.stateを共通clientで取得・保存・再取得し、現在有効なpluginだけ実効表示へ反映する。layers補完を利用し既存plugin設定と重複保存しない。

取消・失敗：取消/版競合では保存済みを維持し、非表示や停止で元記録・友達関係・保存スポットを削除しない。

既存binding：`getPluginSettings`、`patchPluginSettingsPluginId`。契約補完：layers。

### object-edit

MAP-CUSTOM.manualへ名前/メモ/色/表示サイズ/座標を保存し、同じobject IDを再取得して地図に表示する。削除と取消後のDB値を確認する。

取消・失敗：実建物の高さ・訪問・体験由来の成長を変更しない。版競合で下書きを残し、別本人/dataModeの飾りを書き換えない。

既存binding：ページ定義に既存bindingなし。契約補完：object。

### object-place

配置確定だけでは保存APIを呼ばず、object-editの明示保存だけで座標を永続化する。再取得した位置が同じ地図位置になる。

取消・失敗：位置取得拒否/失敗を表示し、取消/再選択で保存位置や訪問・成長材料を変更しない。

既存binding：ページ定義に既存bindingなし。契約補完：object。

### ページをまたぐ受入・現状の残件

- MAP-CUSTOM.adoptへ設定版とplugin状態を渡し、採用時だけ設定と採用参照を保存する。再読込/別本人・dataMode/プラグイン停止/版競合を確認する。

## 通過条件

- 対象操作のUI証拠・既存API契約版・統合commitを引継ぎ、必要pathのlockが空いた範囲だけ取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


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

- 着手前：元UI全体のdoneは不要。[UI-MAP](UI-MAP.md)の対象操作について[接続handoff](../connect-start.md)の統合済み証拠を揃え、必要pathだけ取得する。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[PLACES](PLACES.md)、[ACTIVITY](ACTIVITY.md)、[THEMES](THEMES.md)、[MAP-CUSTOM](MAP-CUSTOM.md)、[PLUGINS](PLUGINS.md)、[COMMUNITY](COMMUNITY.md)、[CONNECT-BASE](CONNECT-BASE.md)、[INFORMATION](INFORMATION.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [PLACES](PLACES.md)：`PLACES.search`、`PLACES.detail`。保存場所/外部候補の検索・候補採用／場所詳細と本人/共有記録の合成。
- [ACTIVITY](ACTIVITY.md)：`ACTIVITY.growth`。訪問確認・訂正・地図の成長材料。
- [THEMES](THEMES.md)：`THEMES.manual`。テーマ所属・表示属性・由来付きメモの保存。
- [MAP-CUSTOM](MAP-CUSTOM.md)：`MAP-CUSTOM.manual`、`MAP-CUSTOM.adopt`。手動装飾・本人の地図設定のAPI保存/再取得／AI地図設定のプレビューと採用。
- [PLUGINS](PLUGINS.md)：`PLUGINS.state`。本人別の導入・有効状態・版・適用宣言。
- [COMMUNITY](COMMUNITY.md)：`COMMUNITY.knowledge`。地域の声・分類/範囲・しおり・共有単体。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`。記録検索・実効日時/場所・現在の閲覧条件。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/map/`、`src/map/`、`docs/evidence/CONNECT-MAP/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
