# COMMUNITY v1 接続契約

実装中。API接続・永続化の通過証拠は検証後に追記する。

## 人物・友達

既存 `/people` と `/friendships` のoperationId・入出力を維持する。
人物検索は登録済みpeopleの公開プロフィール（name/bio/avatarUrlと共通ID/版）を返す。
本人登録/セッションはCOREのQ01を使用する。検索から個人設定や非公開記録を返さない。
followは独立した一方向関係を追加せず、既定の友達申請→受信者承認へ統一する。
友達解除はaccepted行を削除し、friends検索へ即反映する。selected共有は保持し、共有取消は記録/ルートの共有更新で別に操作する。

## 地域の知

- `GET /knowledge/topics` (`getKnowledgeTopics`) は分類辞書を返す。food=食事、rest=休憩、walk=散歩。各topicKeyと同じ画面分類キー、対応する日本語purposeを持つ。
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
- `GET /bookmarks/{bookmarkId}` (`getBookmarksBookmarkId`) は最新の対象を再解決。共有取消/削除は404 NOT_FOUND、候補の期限切れは410 EXPIRED。保存済み実体として古い本文を返さない。
- `DELETE /bookmarks/{bookmarkId}` (`deleteBookmarksBookmarkId`) は本人とIf-Matchを検証し204。元の記録/場所/候補は削除しない。期限切れ・対象削除後も解除できる。

画面はexpiredで「期限切れ・再検索」、unavailableで「現在利用できません」を表示し、本文/写真を空にする。削除と非公開を区別する情報は返さない。

## 共有テーマ

テーマ本体はTHEMES正本を使用する。COMMUNITY固有の共有設定表をthemeIdへ関連付け、既定private。
`PATCH /themes/{themeId}/sharing` は所有者と共有設定のIf-Matchでpublic/selected/privateを更新する。
`GET /shared-themes` と単体読出しはテーマ共有条件と、所属記録それぞれの現在の共通閲覧条件を検証する。非公開の所属記録IDや媒体を出さない。
共有テーマの名前/説明を無断で公開しないため、共有投稿を含むだけではテーマ全体を公開しない。
