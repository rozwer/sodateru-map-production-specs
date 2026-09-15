# ROUTESの画像照合用データ（モック）

受取先: VISUAL-SHELL #172。3地点・全2区間の2候補と保存/案内状態を、既存の実取得geometryから再現する。これは画面確認用モックであり、API保存や実画面の全受入証拠ではない。

## 生成・投入・再表示

```sh
mise exec -- node docs/evidence/ROUTES/visual-fixture.mjs > /tmp/routes-visual.json
```

repoのインストール済み依存だけを使う。ネットワーク・認証・Mapboxキー・DB投入は不要。実行時に現在の生成OpenAPIで5種類のDTOを照合し、不一致なら失敗する。確認済みSchemaはdevelop `537a15cc275b41ec98c1d25b9558ef9845fdcb07`（ROUTES fragment v1.2.0を合成済み）。

JSONのトップレベルはfixture情報であり、HTTP応答ではない。既存の画面確認用応答差替えへ、下表の対応プロパティを渡す。画面に「モック」を表示する。ROUTES製品APIに固定IDを送らない。既存のUI-ROUTES部品検証入口は `docs/evidence/UI-ROUTES/preview.tsx` / `preview.html`、起動方法は同ディレクトリのREADME。

| JSONプロパティ | operationId / Schema | 用途 |
|---|---|---|
| searchRequest | postRouteSearches / RouteSearchInput | 東京駅→経由地→目的地の3点（座標はlng,lat）。mode=driving |
| postRouteSearches | postRouteSearches / data:RouteSearchResult | 1候補のHTTP表示応答 |
| postRouteComparisons | postRouteComparisons / data:RouteComparisonResult | 同じ地点順の2候補・geometry/各leg/steps/距離/整数秒 |
| commonMapRoutePreview | CommonMapRoutePreview | 同じ第1候補。resultIdをpreviewIdへ置換した共通地図DTO |
| postSavedRoutes / getSavedRoutesRouteId | 各同名operationId / data:SavedRoute | 第1候補の保存済み表示、同じ固定routeId |
| getSavedRoutes | getSavedRoutes / items:SavedRoute[] | 保存一覧、1件・nextCursor=null |
| navigation / finished | patchSavedRoutesRouteIdまたはgetSavedRoutesRouteId / data:SavedRoute | currentLeg=1、navigating/version=2 と finished/version=3 |

地図の地点表示には `postRouteComparisons.data.items[0].waypoints`、線には同候補のgeometryを使う。別の場所一覧DTOへそのまま流用しない。再表示は同じ生成JSONとrouteId=`visual-saved-route`を使い、保存GETの応答を上記3状態のいずれかに固定する。候補選択・終了などの画面内確認は既存fixtureのコールバックを利用する。生成器自体は操作履歴や保存を実行しない。

## 出典と未提供

- 元JSON: `docs/evidence/ROUTES/live-comparison.json`、提供commit `19386893491c5a4a80c1bf6ecba4e47b5a55cd33`（PR #68 / develop merge ddb8614）。2候補は1617.807m/459秒と1645.75m/516秒。geometry/steps/距離/秒/取得時刻を改変せず再利用。
- ID・本人・ラベル・案内状態は表示用に構成。時刻は更新せず保持するため、previewは期限切れであり実サーバーには存在しない。モック表示をlive取得や採用成功として扱わない。
- 写真、作者の言葉、滞在時間/滞在込み合計、元記録ID、車種適格性・屋根・階段・公共交通評価は未提供。写真参照はなく、媒体投入も不要。
- app一覧/導入状態/装飾は担当外。ROUTESのfixtureへ架空のinstalled状態を混ぜない。
- 検証: 生成時のRouteSearchInput / RouteSearchResult / RouteComparisonResult / CommonMapRoutePreview / SavedRoute照合、2区間と区間秒合計一致が成功。外部APIの再テストは実施していない。
