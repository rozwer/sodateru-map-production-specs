# PLACES｜場所検索・候補採用・場所詳細

<!-- task-id: PLACES -->

初期担当枠：C。GitHub未登録。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

保存場所と外部候補を探し、保存可能な候補を一度だけ採用して場所詳細を返せる。

## 実装範囲

- Nominatim/Mapboxの検索・retention・期限・分類・出典、保存場所の更新権限/優先順位を実装する。
- 建物キーと同居施設、場所詳細の部分失敗、営業時間/入口の未確認状態を扱う。

## 通過条件

- 検索だけではDBへ場所を増やさず、採用時のみ永続化する。
- 期限後の同一採用再送は既存結果、別内容は衝突、削除後はNOT_FOUNDとなる。
- 実providerの候補と取得時刻/出典を確認し、本人/共有記録は共通読取に従う。

## 参照と契約

[地図](../../01_requirements/03_pages/map/README.md)、[体験を残す](../../01_requirements/03_pages/record-create/README.md)、[わたしの地図](../../01_requirements/03_pages/personal-map/README.md)。

[01_places.md](../../01_requirements/02_common/02_places-routes/01_places.md)、[03_map-ui.md](../../01_requirements/02_common/02_places-routes/03_map-ui.md)、[04_acceptance.md](../../01_requirements/02_common/02_places-routes/04_acceptance.md)。

実装する既存operationId：`getPlaces`、`postPlaces`、`getPlaceCandidates`、`getPlacesPlaceId`、`patchPlacesPlaceId`。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)、[INFORMATION](INFORMATION.md)。

担当の契約補完、業務処理、SQL/保存、外部adapterと固有の失敗確認を機能内で進める。未提供の共通処理は固定済みの署名で差し替え可能にし、実接続時は共通実装へ切り替える。

先行提供：PlaceCandidate・adopt・getPlaceDetailとprovider adapterの接続例を先に共有する。

## 編集範囲

提案path：`server/features/places/`、`server/db/migrations/places/`、`docs/evidence/PLACES/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
