# CONNECT-ROUTES｜実接続：経路条件・候補比較・徒歩案内

<!-- task-id: CONNECT-ROUTES -->

初期担当枠：A。担当者：rozwer。[GitHub #138](https://github.com/rozwer/sodateru-map-production-specs/issues/138)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-ROUTES](UI-ROUTES.md)で完成した画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### route-conditions

getPlaceCandidatesとpostRouteSearchesへ入力した順序/時刻/交通/定期券/追加条件を渡し、実providerの候補を受け取る。

取消・失敗：目的地の屋根から全道中を推定しない。未対応/未確認・0件・部分区間失敗を区別し条件入力を保持する。

既存binding：`getPlaceCandidates`、`postRouteSearches`。契約補完：route。

### route-results

同じ検索結果の採用可能候補をpostSavedRoutes/PATCHへ渡し、routeId・全行程形状・地点順・距離/時間を保存再取得して案内へ進む。

取消・失敗：既知違反を採用せず不明を成立扱いしない。応答不明の再送は同じ資源に収束し、閲覧だけで案内を開始しない。

既存binding：`postSavedRoutes`、`patchSavedRoutesRouteId`。契約補完：route。

### route-navigation

getSavedRoutesRouteIdと案内状態更新を接続し、同じ保存経路で開始/進行/終了・再読込復帰を確認する。

取消・失敗：画面を閉じただけで終了せず、終了によって訪問を確定しない。取得不能/古い測位/経路読取失敗を分ける。

既存binding：`getSavedRoutesRouteId`、`patchSavedRoutesRouteId`。契約補完：route。

## 通過条件

- 元UIのdoneとlock返却後に同じfeature pathを取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-ROUTES)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [route-conditions](../../01_requirements/03_pages/route-conditions/README.md) | `route-conditions-R1`, `route-conditions-F01`, `route-conditions-F02`, `route-conditions-F03` | `route-conditions-C1`, `route-conditions-FC01`, `route-conditions-FC02`, `route-conditions-FC03` |
| [route-results](../../01_requirements/03_pages/route-results/README.md) | `route-results-R1`, `route-results-F01`, `route-results-F02`, `route-results-F03`, `route-results-F04` | `route-results-C1`, `route-results-FC01`, `route-results-FC02`, `route-results-FC03`, `route-results-FC04` |
| [route-navigation](../../01_requirements/03_pages/route-navigation/README.md) | `route-navigation-R1`, `route-navigation-F01`, `route-navigation-F02`, `route-navigation-F03`, `route-navigation-F04` | `route-navigation-C1`, `route-navigation-FC01`, `route-navigation-FC02`, `route-navigation-FC03`, `route-navigation-FC04` |

## 依存と提供物

- 着手前：[UI-ROUTES](UI-ROUTES.md)。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[PLACES](PLACES.md)、[ROUTES](ROUTES.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [PLACES](PLACES.md)：`PLACES.search`、`PLACES.detail`。保存場所/外部候補の検索・候補採用／場所詳細と本人/共有記録の合成。
- [ROUTES](ROUTES.md)：`ROUTES.basic`、`ROUTES.navigation`、`ROUTES.conditions`。基本道路経路の取得・保存・再取得／案内状態・ターン案内・復帰／追加経路条件・交通・定期券。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/routes/`、`docs/evidence/CONNECT-ROUTES/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
