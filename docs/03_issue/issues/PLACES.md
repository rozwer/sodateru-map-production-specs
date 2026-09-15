# PLACES｜場所検索・候補採用・場所詳細

<!-- task-id: PLACES -->

初期担当枠：C。担当者：kaiya。[GitHub #5](https://github.com/rozwer/sodateru-map-production-specs/issues/5)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

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

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

先行提供：PlaceCandidate・adopt・getPlaceDetailとprovider adapterの接続例を先に共有する。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **PLACES.search**：保存場所/外部候補の検索・候補採用。実providerで候補を取得し、採用時のみ永続化。再読込で同じplaceIdを取得する。
- **PLACES.detail**：場所詳細と本人/共有記録の合成。場所本体と各記録の現在権限を保ち、取得元別の部分失敗を返す。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`。
- [INFORMATION](INFORMATION.md)：`INFORMATION.read`、`INFORMATION.sharing`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/places/`、`server/db/migrations/places/`、`docs/01_requirements/04_api/fragments/PLACES.json`、`docs/evidence/PLACES/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
