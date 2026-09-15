# BIKE実release 1.0.0 / 1.1.0

ユーザー採用指示に従い、既統合#166の共通地点候補・採用を1.1.0の公開機能として明示する。1.0.0のmanifest、settingsSchema、defaultSettings、trial、適用宣言は原定義を保持し、通常registerで1.0.0→1.1.0の順に登録する。仮manifestではない。

| 項目 | 1.0.0 | 1.1.0 |
|---|---|---|
| 地点検索・BIKE表示・経路評価 | 維持 | 維持 |
| 設定schema / defaults | 元定義 | 元定義の独立コピー |
| 適用宣言 | layer:bike / visibility=true | 左記 + feature:bike:place-candidates / enabled=true |
| 新規共通候補登録 | STATE_CONFLICT（1.1.0への更新を案内） | 解決済み宣言が有効なら正式PLACES登録口へ接続 |
| 試用 | 明示mock | 同じ明示mock＋新機能の適用宣言 |

これまで版番号未分割の1.0.0に追加されていた候補登録を、今回1.1.0の公開宣言に連動させる。既存1.0.0利用者は更新後に候補登録できる。旧版の既存宣言は書き換えない。HTTP入力や共通Schema/DBは変更しない。

## 旧版へ戻したとき

- 1.0.0の元manifest・設定・宣言へ戻る。新規共通候補登録を停止する。
- BIKE検索snapshot・評価・採用履歴、共通PLACESの採用済み地点は削除しない。地点表示も維持する。
- 既発行の共通候補はPLACESの本人/mode・有効期限に従う。rollbackで共通候補を横断的に失効させない。採用済み地点の削除操作もしない。
- 更新/rollbackはPLUGINSの保存版を進めるため、以前の保存版に紐づく検索からの再登録はINPUT_CHANGEDになる。候補登録を再開するときは現版で新規検索・新規操作IDを使用する。
- 停止すると従来どおりBIKE表示と操作を停止し、保存結果を保持する。

## 限定確認

```sh
mise exec -- node --experimental-transform-types docs/evidence/BIKE/release-check.ts
mise exec -- node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --allowImportingTsExtensions server/plugins/bike/register.ts docs/evidence/BIKE/release-check.ts
```

[release-check.json](release-check.json) に実registry、実PluginService/createBikeService/PlacesService、実SQLite保存・開き直しの結果を保存した。地点入力は明示したfixture。外部provider取得は0回で、実provider取得成功の追加証拠とはしない。旧版登録拒否→実1.1.0への更新→共通候補登録/採用→rollbackによる元宣言/設定復元→検索/採用済み地点保持→SQLite再openで一致、限定確認PASS。strict型検査PASS。

通常mainの実HTTP更新/rollback・別OSプロセス復元は、正式merge後にPLUGINS #28が確認する。既存live.e2e.tsの試用/導入版は1.1.0へ合わせたが、成功済みprovider呼出しは再実行していない。

#91の日本車種・全区間規制根拠不足は維持する。1.1.0は全条件適合経路の成功を主張しない。
