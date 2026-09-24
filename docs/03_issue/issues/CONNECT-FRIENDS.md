# CONNECT-FRIENDS｜実接続：友達との共有・地図・比較とおすすめルート

<!-- task-id: CONNECT-FRIENDS -->

初期担当枠：A。担当者：rozwer。[GitHub #142](https://github.com/rozwer/sodateru-map-production-specs/issues/142)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-FRIENDS](UI-FRIENDS.md)の対象操作が整った画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### community-home

共有対象/条件/本人scopeを保持してCOMMUNITY/INFORMATIONの実データへつなぐ。

取消・失敗：共有0件を相手の活動なしと断定せず、閲覧で共有や友達関係を変更しない。

既存binding：ページ定義に既存bindingなし。

### friends-map

friendships/people/shared-records/mapを同じpersonIds/条件で実取得し、相手の実記録/ルートを比較と自分用経路へ渡す。

取消・失敗：相手用途で自分の成長を上書きしない。友達解除/共有取消後に相手の本文/媒体/比較引用を再表示しない。

既存binding：`getFriendships`、`getPeople`、`getSharedRecordsMap`、`getSharedRecords`。

### friend-profile

people/shared-records/shared-routesとfriendshipsのPOST/PATCH/DELETEを接続し、二本人で相互承認だけacceptedになることを保存再取得する。

取消・失敗：閲覧/申請だけでは友達成立にせず、片方向followを追加しない。友人解除と指定共有解除を別々に確認する。

既存binding：`getPeoplePersonId`、`getSharedRecords`、`getSharedRoutes`、`getFriendships`、`postFriendships`、`patchFriendshipsFriendshipId`、`deleteFriendshipsFriendshipId`。契約補完：follow。

### friend-compare

共有可能なrecordと本人recordを取得し、REFLECTION.compareとSourceRefで比較結果と現在の閲覧条件を照合する。

取消・失敗：共有取消/削除後の古い比較引用を消し、情報不足を共通点なしと断定しない。相手データで本人用途を変更しない。

既存binding：`getSharedRecords`、`getSharedRecordsMap`、`getRecords`。契約補完：comparison。

### shared-route

shared-routes/saved-routeを実取得し、同じ地点列をROUTESへ自分起点/条件で再検索、必要な採用結果だけ本人へ保存再取得する。

取消・失敗：原作者ルートを変更せず、非公開化した行程を旧cacheから復元しない。条件未対応を成立扱いしない。

既存binding：`getSharedRoutes`、`getSavedRoutesRouteId`。

### sharing

record PATCHのvisibility/sharedWithを保存再取得し、二本人の本文・媒体・一覧・地図で範囲の反映と解除を確認する。

取消・失敗：picker完了/選択変更だけでは共有せず、0人をpublicへ変換しない。診断/非公開履歴を同時公開せず、失敗時は旧範囲を維持する。

既存binding：`getRecordsRecordId`、`patchRecordsRecordId`。

### friend-picker

acceptedのfriendships/peopleを実取得し、共有画面に渡したsharedWithと確定PATCHの対象を照合する。

取消・失敗：pickerから共有mutationを発生させず、申請中/解除済み相手を共有可能な友達として採用しない。

既存binding：`getFriendships`、`getPeople`。

## 通過条件

- 対象操作のUI証拠・既存API契約版・統合commitを引継ぎ、必要pathのlockが空いた範囲だけ取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


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

- 着手前：元UI全体のdoneは不要。[UI-FRIENDS](UI-FRIENDS.md)の対象操作について[接続handoff](../connect-start.md)の統合済み証拠を揃え、必要pathだけ取得する。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[INFORMATION](INFORMATION.md)、[RECORDS](RECORDS.md)、[REFLECTION](REFLECTION.md)、[THEMES](THEMES.md)、[ROUTES](ROUTES.md)、[COMMUNITY](COMMUNITY.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`、`INFORMATION.sharing`。記録検索・実効日時/場所・現在の閲覧条件／根拠解決・閲覧判定・版/更新/削除照合／共有検索・地図検索・媒体閲覧。
- [RECORDS](RECORDS.md)：`RECORDS.lifecycle`。共有変更・削除影響・書出し。
- [REFLECTION](REFLECTION.md)：`REFLECTION.compare`。体験/友達比較と本人判断。
- [THEMES](THEMES.md)：`THEMES.manual`。テーマ所属・表示属性・由来付きメモの保存。
- [ROUTES](ROUTES.md)：`ROUTES.basic`。基本道路経路の取得・保存・再取得。
- [COMMUNITY](COMMUNITY.md)：`COMMUNITY.social`。人物・友達関係・共有ルート/テーマ。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/friends/`、`docs/evidence/CONNECT-FRIENDS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
