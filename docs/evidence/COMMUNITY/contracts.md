# COMMUNITY v1.1 接続契約

## 提出範囲と後続

Issue #22はユーザー承認により、検証済みの友達HTTP・しおり保存層と、地域の知・共有API実装/契約の統合を納品単位とする。元の受入条件全体や画面完成を意味しない。

- デモ必須の画面接続・通し確認: #106（koshiro担当、UI変更はrozwerと調整）。
- 共有ルート・比較引用・実候補期限の通し確認: #107（koshiro担当、デモ後）。
- PR: https://github.com/rozwer/sodateru-map-production-specs/pull/60

実API全体の通過証拠は依存INFORMATION統合後に追記する。

## 人物・友達

既存 `/people` と `/friendships` のoperationId・入出力を維持する。
人物検索はSETTINGSの最新profileVisibility（private/friends/public、既定private）を適用し、閲覧可能なpeopleのプロフィール（name/bio/avatarUrlと共通ID/版）を返す。friendsはaccepted関係のある本人だけ。非公開の他者は単体404、検索一覧から除外する。
本人登録/セッションはCOREのQ01を使用する。検索から個人設定や非公開記録を返さない。
followは独立した一方向関係を追加せず、既定の友達申請→受信者承認へ統一する。
友達解除はaccepted行を削除し、friends検索へ即反映する。selected共有は保持し、共有取消は記録/ルートの共有更新で別に操作する。

## 地域の知

- `GET /knowledge/topics` (`getKnowledgeTopics`) は話題/目的辞書itemsと画面分類categoriesを返す。itemsはfood=食事、rest=休憩、walk=散歩。categoriesはtips=休憩のコツ（topicKey=rest、purposes=[休憩]）、experiences=体験談（kind=experience）、people=人（getPeopleへ切替）。目的条件と画面分類を区別する。
- `GET /knowledge` (`getKnowledge`) と `GET /knowledge/map` (`getKnowledgeMap`) はINFORMATIONの同じ検索条件/閲覧条件を使用する。`category`は辞書のtopicKey/purposesへ正規化する。
- `bbox=minLon,minLat,maxLon,maxLat`は矩形内を判定し、中心/半径の近似には変換しない。全フィルタを適用後にページ分割/件数集計する。経度・緯度ともmin<=max。日付変更線を跨ぐ指定は422として分割検索を促す。
- `GET /shared-records/{recordId}` (`getSharedRecordsRecordId`) は共通getRecordで最新の原文/媒体を返す。地域の声は記録を複製しない。
- 投稿はRECORDSの`POST /records`、公開/取消は`PATCH /records/{recordId}`。topicKeyとpurposesを辞書から渡し、記録の最新versionで更新する。COMMUNITYは別の投稿実体を作らない。
- `GET /places/{placeId}/voices` は既存operationIdを維持し、placeId固定・topicKey必須で同じ検索へ接続する。

例: `category=rest&bbox=136.96,35.15,136.98,35.17` はtopicKey=rest、purposes=[休憩]、指定矩形の全条件を満たす現在閲覧可能な記録を返す。

## しおり

`record.bookmarked`（本人の記録の印）とは別表。`POST /bookmarks` (`postBookmarks`) は `{id,target}` を受ける。

| type | target | 保存するもの |
|---|---|---|
| record | `{type:"record",id}` | 記録IDへの参照 |
| place | `{type:"place",id}` | 採用済みplaceIdへの参照 |
| candidate | `{type:"candidate",resultId,candidateId}` | 元の結果と候補への期限付き参照 |

候補はしおり保存だけでは場所へ採用しない。元のprovider結果の期限を保持し、本文・写真・座標のスナップショットを保存しない。
本人/モード/対象型/対象キーで一意。再送や別IDで同じ対象を保存しても既存の一件を返す。
POST共通Idempotency-Key必須。同じキーの異なる入力は共通409。同じキーの再送でも現在の対象を再解決し、削除前の成功本文を再生しない。

- `GET /bookmarks` (`getBookmarks`) は保存参照一覧。状態はavailable/expired/unavailable、availableだけresourceを返す。
- `GET /bookmarks/{bookmarkId}` (`getBookmarksBookmarkId`) は最新の対象を再解決。共有取消/削除は404 NOT_FOUND、候補の期限切れは410 RESULT_EXPIRED。保存済み実体として古い本文を返さない。
- `DELETE /bookmarks/{bookmarkId}` (`deleteBookmarksBookmarkId`) は本人とIf-Matchを検証し204。元の記録/場所/候補は削除しない。期限切れ・対象削除後も解除できる。

画面はexpiredで「期限切れ・再検索」、unavailableで「現在利用できません」を表示し、本文/写真を空にする。削除と非公開を区別する情報は返さない。

## 共有テーマ

テーマ本体はTHEMES正本を使用する。COMMUNITY固有の共有設定表をthemeIdへ関連付け、既定private。
`PATCH /themes/{themeId}/sharing` は所有者と共有設定のIf-Matchでpublic/selected/privateを更新する。
`GET /shared-themes` と単体読出しはテーマ共有条件と、所属記録それぞれの現在の共通閲覧条件を検証する。非公開の所属記録IDや媒体を出さない。
共有テーマの名前/説明を無断で公開しないため、共有投稿を含むだけではテーマ全体を公開しない。
THEMES正本のcolorKeyを返し、coverMediaは現在閲覧可能なready媒体だけを返す。

## 検証経過

- 2026-09-15: fragment v1.1.0の10Schema・12operationを既存参照込みAJV2020でコンパイル成功。
- `mise exec -- node --experimental-transform-types --test server/features/community/bookmarks.test.ts`: 1 test passed。CORE本番DDL/SQLite/migration/永続再送を使い、対象一意、再起動後保持、live/demo分離、削除後再送404、期限切れ、解除を確認。保存表と再送表に対象本文を保存していないことも確認。
- 上記保存層テストの対象resolverは明示した制御用fixture。INFORMATION/PLACESをつないだ実HTTP・画面E2Eの代替ではない。
- `mise exec -- node --experimental-transform-types --test server/features/friends/http.test.ts`: 1 test passed。実CORE/SETTINGS/友達HTTPで本人選択→プロフィール公開→人物検索→申請→受信者承認→サーバー/SQLite再オープン→同じ関係再取得→解除を確認。削除後のPOST再送は404。
- 実HTTP用 `http-e2e.mjs` は二本人でseed→サーバー再起動→verifyを行う。実API接続後の実行結果は別途記録する。
