# CONNECT-KNOWLEDGE｜実接続：地域の知の検索・絞込・詳細と投稿

<!-- task-id: CONNECT-KNOWLEDGE -->

初期担当枠：A。担当者：rozwer。[GitHub #143](https://github.com/rozwer/sodateru-map-production-specs/issues/143)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-KNOWLEDGE](UI-KNOWLEDGE.md)の対象操作が整った画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### local-knowledge

place詳細/voicesとPLACES地域検索を実接続し、選択地点と地域条件・取得元の一致を確認する。

取消・失敗：測位失敗で勝手に中心を変えず、読取失敗で別地点の声を残さない。閲覧だけでは投稿しない。

既存binding：`getPlacesPlaceId`、`getPlacesPlaceIdVoices`。

### knowledge-list

COMMUNITY v1.1の分類/目的/bboxと生成clientを接続し、100件超のcursor一覧・全件地図・場所不明数・413を照合する。しおりの保存/再取得/削除/再送を確認する。

取消・失敗：一覧/地図で条件を変えず、読取0件と413/取得失敗を区別する。別本人/dataModeの投稿/しおりを混ぜない。

既存binding：`getSharedRecords`、`getSharedRecordsMap`、`getPeople`。契約補完：bookmark / knowledge。

### knowledge-filter

適用時だけ同じ地域/目的/期間/audienceを一覧と全件地図の実queryへ渡し、PLACES地域検索の選択ID/座標を使う。

取消・失敗：取消では適用済みqueryを変えず、遅着した旧条件を新しい一覧へ混ぜない。

既存binding：ページ定義に既存bindingなし。契約補完：knowledge。

### knowledge-detail

共有単体と本人/dataMode付き実媒体を接続し、404/公開取消で旧本文と再生を止める。投稿作成→公開→別本人読取→公開取消をRECORDS/COMMUNITYとつなぐ。

取消・失敗：読めない一媒体だけを失敗表示し本文/別媒体は保持する。取消/本人切替で実媒体要求を止め、古い非公開本文をcacheから復活させない。

既存binding：`getSharedRecords`、`getMediaMediaIdContent`。契約補完：shared-detail。

### ページをまたぐ受入・現状の残件

- COMMUNITY v1.1の分類/目的/bboxと合成済み生成client、100件超一覧/全件地図/場所不明数/413、共有単体404、しおり再送、本人/mode別媒体取消、PLACES地域検索、投稿→公開→別本人読取→公開取消を確認する。

## 通過条件

- 対象操作のUI証拠・既存API契約版・統合commitを引継ぎ、必要pathのlockが空いた範囲だけ取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-KNOWLEDGE)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [local-knowledge](../../01_requirements/03_pages/local-knowledge/README.md) | `local-knowledge-R1`, `local-knowledge-F01`, `local-knowledge-F02`, `local-knowledge-F03` | `local-knowledge-C1`, `local-knowledge-FC01`, `local-knowledge-FC02`, `local-knowledge-FC03` |
| [knowledge-list](../../01_requirements/03_pages/knowledge-list/README.md) | `knowledge-list-R1`, `knowledge-list-F01`, `knowledge-list-F02`, `knowledge-list-F03`, `knowledge-list-F04` | `knowledge-list-C1`, `knowledge-list-FC01`, `knowledge-list-FC02`, `knowledge-list-FC03`, `knowledge-list-FC04` |
| [knowledge-filter](../../01_requirements/03_pages/knowledge-filter/README.md) | `knowledge-filter-R1`, `knowledge-filter-F01`, `knowledge-filter-F02`, `knowledge-filter-F03` | `knowledge-filter-C1`, `knowledge-filter-FC01`, `knowledge-filter-FC02`, `knowledge-filter-FC03` |
| [knowledge-detail](../../01_requirements/03_pages/knowledge-detail/README.md) | `knowledge-detail-R1`, `knowledge-detail-F01`, `knowledge-detail-F02`, `knowledge-detail-F03` | `knowledge-detail-C1`, `knowledge-detail-FC01`, `knowledge-detail-FC02`, `knowledge-detail-FC03` |

## 依存と提供物

- 着手前：元UI全体のdoneは不要。[UI-KNOWLEDGE](UI-KNOWLEDGE.md)の対象操作について[接続handoff](../connect-start.md)の統合済み証拠を揃え、必要pathだけ取得する。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[COMMUNITY](COMMUNITY.md)、[INFORMATION](INFORMATION.md)、[RECORDS](RECORDS.md)、[PLACES](PLACES.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [COMMUNITY](COMMUNITY.md)：`COMMUNITY.knowledge`。地域の声・分類/範囲・しおり・共有単体。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.sharing`。記録検索・実効日時/場所・現在の閲覧条件／共有検索・地図検索・媒体閲覧。
- [RECORDS](RECORDS.md)：`RECORDS.save`、`RECORDS.lifecycle`。記録の作成・単体取得・編集・削除／共有変更・削除影響・書出し。
- [PLACES](PLACES.md)：`PLACES.search`、`PLACES.detail`。保存場所/外部候補の検索・候補採用／場所詳細と本人/共有記録の合成。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/knowledge/`、`docs/evidence/CONNECT-KNOWLEDGE/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
