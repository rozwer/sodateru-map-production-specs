# PLUGINS 提供状況

対象Issue: #28。branch: `kaiya/28-plugins`。基点: `26a25329111af5e72ee42c3120c06993adbeae91`。

## 提供済みコード

- `server/features/plugins/index.ts` の `getPluginState(db, context)` は同期読取。COREの `DatabaseSync` と解決済み `{personId,dataMode,requestId,signal}` を受ける。
- `plugins[]` は `pluginId/installId/ownerKey/installedVersion/version/enabled/resolvedDeclarations`。`revision` は本人/モードと状態を束縛したhash。MAP-CUSTOMの同じDB transaction内で読める。
- `registerPlugin(release)` は各機能の `manifest/settingsSchema/defaultSettings/sources/usageInfo/trialConditions`、`declarations(settings)`、`trial(settings)`、任意の非保存 `prepare(settings,context)` を受ける。版は登録順で最後がカタログの最新版。過去版も保持する。
- 宣言: `{targetKey,property,value}`。標準レイヤー入口は `layer:bike` / `layer:disaster` / `layer:pilgrimage` と `visibility=true`。色等は別property。情報取得自体は各機能が担当し、試用結果は `dataKind:mock` とラベルを必須にする。
- 同じ対象/項目でも同じ値なら競合しない。異なる値の競合は版と宣言を含むhashへ選択を保存。`prefer` は一つ、`coexist` は列挙した機能を独立ownerレイヤーとして扱う。単一値の暗黙上書きはしない。
- 確認後導入、Schema検証、更新準備失敗時の旧版維持、前版snapshotへの復帰、アイコン変更、停止/削除時の設定保持を実装。
- 本人は `person_id`、モードはCOREの別DBで分離。削除は `installed=0` として公開一覧から除外する。`plugin_settings_legacy` に旧owner不明行を保持し、現在本人への暗黙移管をしない。

## CORE接続

CORE 0.3.0の正式develop提供物をmergeして接続。`register.ts` は11ルートと固有migrationを登録し、本人context・入力検証・版ヘッダー・共通エラー・`idempotentMutation` を利用する。非保存のprepareをawaitした後、同期の業務保存と再送受付を同一CORE transactionで確定する。実HTTP検証は `http-integration.md`。

## 確認

- `mise exec -- node --experimental-transform-types --test server/features/plugins/plugins.test.ts`
- `mise exec -- bun x tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --esModuleInterop server/features/plugins/index.ts`
- 実SQLiteのファイル保存→接続終了→再接続→再取得、別本人/別mode分離、試用非保存、未確認導入拒否、同値非競合/異値競合、解決再取得、古い版/設定不正、更新準備失敗、更新/版戻し、停止/削除後の設定/場所/体験保持を確認。カタログのtest fixtureは製品プラグインではない。
- 試用v2の本文・cursor・GeoJSON/凡例/出典参照の3テストを含め計10テスト成功。レビュー指摘の停止/削除後の競合選択保持を追加確認（1件成功）。CORE登録を含むstrict型検査成功。
- 個別結果は `sqlite-results.txt`。COREの代用品は作成していない。テストの基底表は固有migration検査用の最小fixture。

## 未達・接続待ち

- 共通Schema/生成物へのPLUGINS v3の正式反映、各BIKE/DISASTER/PILGRIMAGEの実登録、通常地図での表示/停止の実操作は未確認。HTTP検証は正式COREのcreateAppを使用し、共有fragment生成器で一時合成した契約と明示した検証用プラグインを接続した。製品カタログや通常起動入口まで完成とは扱わない。
- 本PRは固有の先行提供。上記が揃うまではIssueを閉じず、全受入完了とは扱わない。

補足: 固有全TSファイル（テストを含む）は本番と同じstrict/noUncheckedIndexedAccessで型検査成功。iconはカタログの固定候補IDを保存する（trial-contract.md）。
