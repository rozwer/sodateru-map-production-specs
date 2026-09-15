# BIKE実release訂正: 旧版候補維持・新版区間評価

PR #260 / 60abd89は行き違いで0e1daa43へ統合された。本修正はその履歴を保持し、ユーザーの最新方針どおり旧1.0.0の候補登録・地点採用を維持する。候補機能を止める以前のrelease案は撤回済み。

## 公開される実差

| 項目 | 1.0.0 | 1.1.0 |
|---|---|---|
| 元manifest/settings/defaults/layer宣言 | 元定義を保持 | 元定義の独立コピー＋区間評価の案内 |
| 共通地点候補登録・採用 | 維持 | 維持 |
| Mapbox既存経路評価 | 維持 | 維持 |
| 新規の同一形状区間根拠評価 | unknown、部分評価を新規発行しない | `feature:bike:segment-evidence / enabled=true` の解決済み宣言が有効なら#231の照合/部分評価を提供 |
| 保存済み区間評価GET | 保持・再取得可 | 保持・再取得可 |

`register.ts`の`assessBikeReleaseRoute(db,context,route,settings)`が現在の解決済み宣言を読み、新規区間評価だけを制御する。旧版が区間根拠付き経路を受け取ってもMapbox根拠へ偽装せずunknownとする。`createBikeService`の共通PLACES接続は両版で元の正式登録口を使う。

新区間評価では同一geometry/hash・取得時刻・順序付き全区間被覆・ID/方向/道路属性を照合し、warning208の要求ignoredとmotorway結果検証を分離する。日本の車種/排気量・時間規制と高速条件全体の不足はunknownを維持し、適合採用の成功へ変えない。正式二輪ROUTES入口は未提供である。

## rollback / 既導入の誤版

- rollback後も旧版の候補登録・地点採用・BIKE表示を維持する。
- 保存検索、採用済み共通地点、既存の区間評価snapshotは削除せずGETできる。既発行候補は共通PLACESの本人/mode・有効期限に従う。
- 更新/rollback後の候補登録・評価は、PLUGINS保存版の更新に合わせ、新しい検索と操作IDを使用する。
- #260の旧宣言を持つ1.1.0が既に保存されている場合、共通PLUGINSの通常PATCHで現在のsettingsを再保存すると、現行release定義・宣言へ更新される（現在のIf-Matchを使用）。共通DBを直接書き換えない。候補登録の誤制限はこの修正後、宣言更新を待たず解除される。新区間評価は新宣言が有効になるまでunknown。

## 限定検証

```sh
mise exec -- node --experimental-transform-types docs/evidence/BIKE/release-check.ts
mise exec -- node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --allowImportingTsExtensions server/plugins/bike/register.ts docs/evidence/BIKE/release-check.ts
```

[release-check.json](release-check.json): 実registry/PluginService/createBikeService/PlacesService・実SQLiteで、旧版候補登録/採用→更新→新版候補登録/同一地点採用→区間評価保存→unknown採用拒否→rollback→旧版候補登録維持/新規区間評価停止→既存snapshot再取得→SQLite再openで設定/宣言/検索/地点/評価一致を確認。地点・区間入力は明示fixtureであり、追加の実provider成功証拠ではない。strict型検査PASS。

既存実Valhalla応答の全52edge評価/保存証拠は#231を再利用する。通常main実HTTPの版更新/戻し・別OS復元はPLUGINS #28の後続確認。追加provider呼出しは0回。#91/親#29は未完了のまま保持する。

## 選択commit

失敗したbranch切替の全差分は `/private/tmp/bike-selective-before.patch` に保存した。必要なBIKE release/評価/証拠ファイルだけを編集し、標準 `git commit --only -- <明示path>` で正式guardを通す。他pathのindex・内容は保持し、restore/resetやguard無効化は行わない。
