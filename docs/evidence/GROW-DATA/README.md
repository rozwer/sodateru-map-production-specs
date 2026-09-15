# GROW-DATA / Issue #216

## 対象と出典

起点: production `55a6ff215ceaf15e48729b06a08562c099e01324`。取得範囲は `src/features/plugins/reference-data.ts` / `src/features/plugins/assets/` / 本証拠のみ。

- ストア原本: rehearsal `docs/requirements/mockups/grow-app-store-v1.png` (853 x 1844)。防災→バイク→聖地、提供者・版・デモ・未導入・説明・権限の情報量を転記。原本は全件 v0.1 未導入。
- 管理/更新原本: `docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 08_23_21.png` (1536 x 1024)。管理部分はバイクON、聖地OFF、更新比較 v1.2.0→v1.3.0、変更3項目。
- 本番既存 `screens.tsx` の fixturePlugins/fixturePosts/conditionDefaults と PR #203、`0b0d02a` を利用。後者は表示告知とプレビュー操作の重なり修復であり、データ契約を変更していない。
- rehearsal 現在HEAD `39638eacd5ccb7bfec3a11fc0c5e683d7c73999d` の `src/features/extensions/entry.tsx` / `InstallPreview.tsx` を参照。現行リハは Extension/ExtensionVersion 型で、本番PluginDefinition/PluginSettingとは異なるためruntimeや保存データは移植していない。防災の現在の説明・取得権限も原本から変化しているため、ここでは指定ストア画像の表示例を扱う。

## exportと投入

`src/features/plugins/reference-data.ts`:

- `createReferencePlugins("store" | "manage")`: 既存PluginCardModel配列。省略時manage。fixture-* IDを維持。
- `createReferenceConditions()`: バイクの地域・車種・高速選択。返却値は独立コピー。別アプリへの流用は禁止。
- `createReferencePosts()`: 既存FeatureRequestModelの投稿3件。既存入口のsubmitted/下書き条件はscreens側で維持。
- `referenceVersions.bike`: current/next/previous/changeLog。
- `referencePhotos`: shrine/coffee/parkのurl/alt/source/attribution。
- `createReferenceCatalog(state)`: 現行PluginCatalog/PluginManifest/PluginSetting DTO。版履歴と6種の既定iconOptionsを含む。
- `createReferenceRequestDtos()`: 現行FeatureRequest DTO、JST投稿日時を数値timestampに変換。
- `createReferenceTrial(pluginId, "before" | "after")`: 現行PluginTrialPreview DTO。beforeは空overlay、bike afterは3種類の道と2地点、pilgrimage afterは未確認の作品関連地点表示例。すべてdataKind=mock・simulated・出典ID付き。
- 防災trialは実情報を含まない。DISASTER-DATAの提供物を接続し、本関数の空防災データで置き換えない。

GROW-UI #215が既存 `initialFixtureData` で取り込む。`#/plugin-store`から初期化する場合はstore、それ以外の管理比較はmanageを選び、その後の遷移は同じ既存storeを使って操作を保持する。新しい共通runtime・DB seed・Schemaは作成していない。fixture IDをlive APIへ送らない。

再表示は既存デモ入口から `#/plugin-store` / `#/plugin-manage` を開く。明示UI検査内での操作は同一storeで保持し、再読み込み時に参照初期状態へ戻る。UI検査表示と未保存告知を維持する。画面接続はGROW-UIの取得範囲であり、このPR単体では未接続。

## 写真

既存PR #203の素材を重複コピーせず利用。参照画面のスクリーンショットを製品画像へ貼っていない。

| 素材 | 実体 | 出典・制約 |
| --- | --- | --- |
| 神社 | plugins/assets/shrine.jpg (720 x 230) | [kaori kubota / Unsplash](https://unsplash.com/photos/path-leading-to-a-shrine-through-cherry-blossoms-RlMZukANJTQ)。青梅市の参考写真。本山の実スポットとして表示しない。exportのaltを使用。 |
| コーヒー | feature-requests/assets/coffee.jpg (160 x 160) | [shche_ team / Unsplash](https://unsplash.com/photos/heKg-V9yHwc)。模擬投稿のアイコン。 |
| 公園 | feature-requests/assets/park.jpg (160 x 160) | [Unsplash](https://unsplash.com/photos/lh_MesNhkbI)。模擬投稿のアイコン。 |

## 検証結果と残件

`mise exec -- bun docs/evidence/GROW-DATA/verify-data.ts` 成功。現行OpenAPIでカタログ2状態・投稿3件、既存validateTrialPreviewで6状態を検証。画像3点をsharpでデコード。最初の検査が検出したiconOptionsの6件制約を修正し成功。

`mise exec -- bun run typecheck` は範囲外の既存診断で失敗: core.test displayName、exploration requestId、records test unknown、reflection version、tools/local/dev ChildProcess未定義。reference-dataへの診断なし。

原本のデータ項目と状態は照合済み。実ブラウザ同幅（原本・390px）の最終表示と操作はGROW-UI #215 / 独立QA #217で確認する。このデータ提供の完了をAPI/DB保存、live防災受入、画面完全一致の完了としない。共有5173/3002は操作していない。
