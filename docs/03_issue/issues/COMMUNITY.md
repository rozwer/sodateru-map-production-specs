# COMMUNITY｜友達関係・地域の声としおり

<!-- task-id: COMMUNITY -->

初期担当枠：B。担当者：koshiro。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

友達関係を管理し、共有された地図・ルート・地域投稿を探して、投稿・場所・候補をしおりへ保存できる。

## 実装範囲

- 人物検索/公開プロフィール、友達申請/承認/解除、共有テーマと共有ルート一覧を実装する。閲覧条件はINFORMATIONを使う。
- topicKey/用途/画面分類の辞書、bboxとの対応、地域の声と共有詳細を共通検索へ接続する。
- 他者投稿・場所・一時候補のしおり型/期限/再取得を追加し、record.bookmarkedと区別する。

## 通過条件

- 友達申請→承認→解除と指定共有の取消を実APIで別々に確認し、一覧・地図・媒体・比較の引用へ反映する。
- 地域の声は記録原文を参照し、投稿公開/取消を次の読出しに反映する。
- 一覧/地図/共有詳細が同じ対象を解決し、条件外・非公開の媒体を返さない。
- しおりを再送して一件を返し、対象期限切れ/削除時に保存済み実体を捏造しない。

## 参照と契約

[地域の知](../../01_requirements/03_pages/local-knowledge/README.md)、[地域の知を探す](../../01_requirements/03_pages/knowledge-list/README.md)、[地域の知の絞り込み](../../01_requirements/03_pages/knowledge-filter/README.md)、[地域投稿の詳細](../../01_requirements/03_pages/knowledge-detail/README.md)、[地図](../../01_requirements/03_pages/map/README.md)、[もやの探索候補](../../01_requirements/03_pages/mist-detail/README.md)、[提案候補の詳細](../../01_requirements/03_pages/suggestion-detail/README.md)。

[01_queries.md](../../01_requirements/02_common/03_information/01_queries.md)、[02_access-media.md](../../01_requirements/02_common/03_information/02_access-media.md)。

実装する既存operationId：`getPeople`、`getPeoplePersonId`、`getFriendships`、`postFriendships`、`getFriendshipsFriendshipId`、`patchFriendshipsFriendshipId`、`deleteFriendshipsFriendshipId`、`getSharedRoutes`、`getPlacesPlaceIdVoices`。

契約補完の担当：`bookmark`、`knowledge`、`shared-detail`、`follow`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[INFORMATION](INFORMATION.md)、[RECORDS](RECORDS.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

## 編集範囲

提案path：`server/features/community/`、`server/features/friends/`、`server/db/migrations/community/`、`docs/evidence/COMMUNITY/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
