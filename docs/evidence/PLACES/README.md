# PLACES 提供・検証

## PLACES.search: 実接続確認済み

- branch: `kaiya/5-places`、先行PR: [#52](https://github.com/rozwer/sodateru-map-production-specs/pull/52)、実接続PR: [#61](https://github.com/rozwer/sodateru-map-production-specs/pull/61)。
- CORE正式統合 `413598b`（v0.3.0）を取り込み、登録口・SQLite migration・共通idempotentMutation/requestHashを利用。共通基盤は複製しない。
- `live-search.json`: 実Nominatim検索→DB増加なし→候補採用201→同一再送200→異内容409→Mapbox実候補のtemporary採用409→サーバー再起動→現在資源再取得→削除後404。live/demo別DBも確認。
- 再起動後は候補メモリなしで同一placeIdを再取得。現在値の更新と削除はサーバー停止中の隔離テストDBへ直接設定し、HTTP再送で確認した。PATCHのHTTP確認としては扱わない。
- 外部source URL・attribution・fetchedAt、候補resultId/candidateId、保存placeIdを証拠へ記録。Mapbox一時候補本文・認証値は保存しない。

### 再現

```sh
mise exec -- bun install --frozen-lockfile
mise exec -- node --experimental-transform-types --test server/features/places/service.test.ts
mise exec -- node docs/evidence/PLACES/live-smoke.mjs
mise exec -- bun run typecheck
```

外部検証は主worktreeの.envを既定で読み、`PLACES_ENV_FILE`で明示変更できる。実検証用SQLite/profileは一意のOS一時ディレクトリ。通常の本人DBを使わない。

## 固有SQLテスト

実CORE CommonError/requestHashとNode DatabaseSyncで、保存場所優先/Unicode・期限後の同一採用再送・DB再オープン・削除後NOT_FOUND・外部候補検索時DB無変更・本人/mode照合・provider同一場所再利用・temporary保存拒否・cursor条件拘束・訂正権限/版/解除を確認。HTTP検証と区別した小さい表fixtureを使用。

## PLACES.detail / Q03: 未達あり

- INFORMATIONの実serviceを動的接続。読取基盤不在・取得元失敗時は該当sectionをfailedとして返す。場所本体を保持し、空readyで代替しない。
- INFORMATION PR #48の正式統合cc71000を使用。`live-information.json`で実CORE/RECORDS HTTPによる本人訪問記録・共有記録の保存、PLACES詳細経由の実INFORMATION読取、非公開除外、共有解除即時反映、再起動後一致、live/demo分離が成功。
- Q03の営業時間/入口、手動訂正優先、明示Nominatim lookup、訂正解除、If-Matchの固有処理/fragment v0.4.0を実装。共有場所は同じdataModeの開始済み本人による共同訂正とする[委任決定](https://github.com/rozwer/sodateru-map-production-specs/issues/5#issuecomment-5673814786)を確認し、PATCHを公開。`live-corrections.json` で別本人による共同訂正・未認証401・428/412・同居施設・再起動後の詳細再取得・訂正者保存を実HTTP確認済み。
- 共通Schema/生成器への最新fragment反映はCOREへ依頼済み。先行実装は独立レビュー後に統合済み。拡張PATCH実HTTPは後述のlive-refresh.jsonで確認済み。UI実操作は未完了。Issue #5を閉じない。

## Provider参照

[Nominatim Search](https://nominatim.org/release-docs/latest/api/Search/)、[Address Lookup](https://nominatim.org/release-docs/latest/api/Lookup/)、[Mapbox Search Box](https://docs.mapbox.com/api/search/search-box/)。

## 詳細の後続補完

UI-MAP #8の依頼でdescriptionとphotosを追加。Nominatim lookupのextratags.description/imageから有効な値が得られる場合だけ返し、出典・取得時刻・unverifiedを保持する。説明未取得はnull、写真未取得は[]。徒歩所要時間は現在originに依存するためROUTESのpreview、近隣は既存temporary候補検索を使う。

migration 002と外部再取得の訂正優先/失敗時保持を含む7件の固有SQLテスト、および型検査が成功。外部応答の故障注入はfixtureであることをテストに明記し、実provider検証はlive-search.jsonに分離している。

建物キーが非nullのcolocatedは同じキーの全施設を名前・ID順に返し、現在選択中の施設も含む。UIが選択中placeIdを強調できる。

## 最新の詳細接続検証

`mise exec -- node --experimental-transform-types docs/evidence/PLACES/information-smoke.mjs` が成功（2026-09-15T03:32:40Z）。実サーバー、共通migration、RECORDS保存口、INFORMATION読取口をそのまま使用。テスト用に第二本人をprofileへ設定した以外はHTTP操作。本人/共有/訪問sectionがすべてreadyとなり、共有解除後は同じ詳細URLから除外された。

正式共通生成済みdevelop d264c15上で`refresh-smoke.mjs`成功（2026-09-15T03:51:39Z）。`live-refresh.json`に実Nominatim lookup、拡張PATCH、手動訂正優先、最新外部値への解除、再起動後一致の証拠を記録。本人/共有/訪問sectionもready。残る#118受入はUI操作。

`information-source-fault.mjs`は隔離smokeサーバーにだけpreloadする故障注入。実INFORMATIONが行う本人記録SQLを失敗させ、実HTTP詳細200/本人section failed/共有と訪問ready/診断非露出を確認する。共通serviceのコピーや完成用代替ではない。
