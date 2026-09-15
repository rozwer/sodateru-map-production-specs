# CONNECT-RECORDS｜実接続：体験記録・訪問確認・訂正と地図の成長

<!-- task-id: CONNECT-RECORDS -->

初期担当枠：A。担当者：rozwer。[GitHub #135](https://github.com/rozwer/sodateru-map-production-specs/issues/135)。[一覧](../README.md) · [完了の扱い](../execution.md#完了の扱い)。

## このIssueの完成結果

[UI-RECORDS](UI-RECORDS.md)で完成した画面から実API・保存・再取得をつなぎ、以下の利用操作を同じIDで往復できる。元UIの未達をこのIssueへ押し出して完了にしない。

## 実接続する操作と失敗条件

### record-create

条件に応じpostPlaces/postVisits/postRecords/media uploadを呼び分け、確定した本文・媒体順・場所・日時精度・公開範囲を保存し、同じrecord IDを一覧/詳細で再取得する。

取消・失敗：本文成功と媒体部分失敗を分け、成功媒体と入力を保持して失敗分だけ再送する。候補選択だけでは訪問を作らず、応答不明で別IDを作らない。

既存binding：`getPlaceCandidates`、`getPlaces`、`getVisits`、`postPlaces`、`postVisits`、`postRecords`、`postRecordsRecordIdMedia`。

### record-edit

get/patchRecordsRecordIdとmedia GET/追加/対象mediaId削除/reorderを接続し、同じrecord IDの再取得と一覧・地図の更新を確認する。

取消・失敗：一媒体の失敗で他媒体/本文を消さず、感想/理由訂正で訪問事実を変えない。競合時の現行版と下書きを比較する。

既存binding：`getRecordsRecordId`、`patchRecordsRecordId`、`getRecordsRecordIdMedia`、`postRecordsRecordIdMedia`、`deleteMediaMediaId`、`postRecordsRecordIdMediaReorder`。

### visit-confirm

visitIdにconfirmed/rejected/candidateをPATCHし、再取得・訪問数・getMapGrowthの再集計を画面で確認する。

取消・失敗：候補表示だけではconfirmedにしない。否定/場所訂正/取消で記録本文や元の観測位置を捏造・削除しない。

既存binding：`getVisitsVisitId`、`patchVisitsVisitId`、`getMapGrowth`。

### interpretation-correction

purposesはrecord PATCH、推定理由への異議はinsight.reviewNoteへ保存し、再取得後の用途・根拠判断・地図成長を確認する。

取消・失敗：AI文章を本人原文へ上書きせず、否定した解釈の再利用を確認する。片方失敗を全体成功とせず同じ対象へ再試行する。

既存binding：`getRecordsRecordId`、`patchRecordsRecordId`、`getInsightsInsightId`、`patchInsightsInsightId`。

### record-delete

RECORDS.lifecycleのpreview/exportとDELETEを接続し、書出し成功後のファイル、削除後の一覧・詳細・地図・共有と独立メモの残存を再取得する。

取消・失敗：取消で全保存値を維持し、失敗を削除完了と表示しない。削除済み詳細への戻りや再送で復活させない。

既存binding：`getRecordsRecordId`、`deleteRecordsRecordId`。契約補完：export。

### growth-result

getMapGrowthと元recordの実取得を接続し、用途訂正・訪問取消・削除後の現在有効な材料から再集計された変化を再表示する。

取消・失敗：閲覧/候補保存だけで成長させず、欠測や読取失敗を成功材料で補わない。

既存binding：`getMapGrowth`、`getRecordsRecordId`。

### daily-track

同じlocalDate/timeZoneでreflection day/records/visits/track-pointsを取得し、編集・訪問取消後に軌跡/記録/成長を再取得する。

取消・失敗：欠測区間を線で補わず、遅着した別日を混ぜない。画面移動で位置記録を止めず、閲覧による保存mutationを発生させない。

既存binding：`getReflectionDaysDate`、`getRecords`、`getVisits`、`getTrackPoints`。

## 通過条件

- 元UIのdoneとlock返却後に同じfeature pathを取得し、提供済みの共通client・型・本人contextで実画面から呼ぶ。業務DTOや保存処理をUIへ複製しない。
- 操作→method/path/params/body/status/条件付き呼出回数→実API/DB→再起動/再取得→同じ画面の再表示を照合する。mockの成功はこの受入に使わない。
- 本人とlive/demoを分離し、取消は保存値不変、応答不明再送は同じID、版競合は現行値取得と入力保持、0件/部分失敗/利用不能/遅着を実通信で確認する。
- 共有変更/削除がある操作は別本人の本文・媒体・引用・地図にも反映し、旧cacheから復活させない。指定画像/Mapbox/端末操作の未達を引継いでUI完了にしない。

source/API要件ファイルを勝手に変更せず、各ページのapi.jsonとinteractions.jsonの条件付き呼出しを照合する。API不足の業務実装担当は[対応表](../coverage.md)どおりで、このIssueは画面からの接続責任を持つ。


## 元要件・受入の対応

元の要件/受入ID・原文・live条件は[機械可読対応](../ui-connections.json#/pairs/UI-RECORDS)に保持する。同じIDのUI面と実接続面の両方で確認し、片側の成功で元live受入をPASSにしない。

| ページ | 元要件ID | 元受入ID |
|---|---|---|
| [record-create](../../01_requirements/03_pages/record-create/README.md) | `record-create-R1`, `record-create-R2`, `record-create-R3`, `record-create-F01`, `record-create-F02`, `record-create-F03`, `record-create-F04` | `record-create-C1`, `record-create-C2`, `record-create-C3`, `record-create-FC01`, `record-create-FC02`, `record-create-FC03`, `record-create-FC04` |
| [record-edit](../../01_requirements/03_pages/record-edit/README.md) | `record-edit-R1`, `record-edit-R2`, `record-edit-F01`, `record-edit-F02`, `record-edit-F03`, `record-edit-F04` | `record-edit-C1`, `record-edit-C2`, `record-edit-FC01`, `record-edit-FC02`, `record-edit-FC03`, `record-edit-FC04` |
| [visit-confirm](../../01_requirements/03_pages/visit-confirm/README.md) | `visit-confirm-R1`, `visit-confirm-R2`, `visit-confirm-F01`, `visit-confirm-F02`, `visit-confirm-F03` | `visit-confirm-C1`, `visit-confirm-C2`, `visit-confirm-FC01`, `visit-confirm-FC02`, `visit-confirm-FC03` |
| [interpretation-correction](../../01_requirements/03_pages/interpretation-correction/README.md) | `interpretation-correction-R1`, `interpretation-correction-R2`, `interpretation-correction-F01`, `interpretation-correction-F02`, `interpretation-correction-F03` | `interpretation-correction-C1`, `interpretation-correction-C2`, `interpretation-correction-FC01`, `interpretation-correction-FC02`, `interpretation-correction-FC03` |
| [record-delete](../../01_requirements/03_pages/record-delete/README.md) | `record-delete-R1`, `record-delete-R2`, `record-delete-F01`, `record-delete-F02`, `record-delete-F03` | `record-delete-C1`, `record-delete-C2`, `record-delete-FC01`, `record-delete-FC02`, `record-delete-FC03` |
| [growth-result](../../01_requirements/03_pages/growth-result/README.md) | `growth-result-R1`, `growth-result-F01`, `growth-result-F02`, `growth-result-F03` | `growth-result-C1`, `growth-result-FC01`, `growth-result-FC02`, `growth-result-FC03` |
| [daily-track](../../01_requirements/03_pages/daily-track/README.md) | `daily-track-R1`, `daily-track-R2`, `daily-track-F01`, `daily-track-F02`, `daily-track-F03`, `daily-track-F04` | `daily-track-C1`, `daily-track-C2`, `daily-track-FC01`, `daily-track-FC02`, `daily-track-FC03`, `daily-track-FC04` |

## 依存と提供物

- 着手前：[UI-RECORDS](UI-RECORDS.md)。
- 実接続・完了前：[UI-BASE](UI-BASE.md)、[RECORDS](RECORDS.md)、[ACTIVITY](ACTIVITY.md)、[INFORMATION](INFORMATION.md)、[PLACES](PLACES.md)、[REFLECTION](REFLECTION.md)、[INSIGHTS](INSIGHTS.md)、[CONNECT-BASE](CONNECT-BASE.md)。

- [UI-BASE](UI-BASE.md)：`UI-BASE.shell`。共通画面・地図/チャットの受渡し。
- [RECORDS](RECORDS.md)：`RECORDS.save`、`RECORDS.media`、`RECORDS.lifecycle`。記録の作成・単体取得・編集・削除／媒体の追加・配信・部分失敗／共有変更・削除影響・書出し。
- [ACTIVITY](ACTIVITY.md)：`ACTIVITY.growth`、`ACTIVITY.track`。訪問確認・訂正・地図の成長材料／位置観測・日別軌跡・範囲削除。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.refs`。記録検索・実効日時/場所・現在の閲覧条件／根拠解決・閲覧判定・版/更新/削除照合。
- [PLACES](PLACES.md)：`PLACES.search`、`PLACES.detail`。保存場所/外部候補の検索・候補採用／場所詳細と本人/共有記録の合成。
- [REFLECTION](REFLECTION.md)：`REFLECTION.record`。体験整理・日記・質問/回答。
- [INSIGHTS](INSIGHTS.md)：`INSIGHTS.evidence`。傾向・評価・根拠付き結果の保存。
- [CONNECT-BASE](CONNECT-BASE.md)：`CONNECT-BASE.integration`。本人contextと共通clientを接続済みの実shell。

提供元全Issueのdoneを要求せず、必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellの実shell組込みはUI側で確認する。UI-INTEGRATION #98の全体doneを新しいhard gateにはしない。


## 編集範囲

提案path：`src/features/records/`、`src/features/activity/`、`docs/evidence/CONNECT-RECORDS/`。

取得範囲はclaimReceiptと現行lockを確認する。共有中央pathへ無断に広げず、着手前依存を満たしてから通常のTask手順で取得する。
