# PLACES 提供・検証

## PLACES.search: 実接続確認済み

- branch: `kaiya/5-places`、PR: [#52](https://github.com/rozwer/sodateru-map-production-specs/pull/52)。
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
- INFORMATION.read/sharingは未統合のため、本人/共有記録を含む実接続検証が残る。
- Q03の営業時間/入口、手動訂正優先、明示Nominatim lookup、訂正解除、If-Matchの固有処理/fragment v0.2.0を実装。共有場所の編集主体はユーザー回答待ちでPATCH HTTP公開は保留。
- 共通Schema/生成器へのv0.2.0反映はCOREへ依頼済み。UI実操作/独立レビュー/全体統合は未完了。Issue #5を閉じない。

## Provider参照

[Nominatim Search](https://nominatim.org/release-docs/latest/api/Search/)、[Address Lookup](https://nominatim.org/release-docs/latest/api/Lookup/)、[Mapbox Search Box](https://docs.mapbox.com/api/search/search-box/)。
