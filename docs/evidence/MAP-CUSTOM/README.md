# MAP-CUSTOM 検証証拠

## 実装範囲

Task #27 / `kaiya/27-map-custom`。取得4 path内の装飾CRUD、本人・モード別地図設定、PLUGINS状態照合、共通AI mapstyle登録と明示採用。UI/Mapbox/Three.jsはA担当。

- API断片v1.1.0: 15 Schema / 11 operation。共通mapstyleのテーマ・光・表示3項目・4色を維持。
- 6色はAが指定画像08_18_05で確認したteal/pink/orange/yellow/green/blue。描画値は順に #2aa5a5/#fac3cd/#ffc79f/#ffe48a/#c1dfa2/#a9cdf7。
- `layers`は保存する表示希望。`effectiveLayers`と`pluginDisplays`は読取時/保存直前のPLUGINS状態から算出。設定保存はプラグインを変更しない。
- AI生成時の設定版/プラグインsnapshotを保存。プレビューでは設定を変更しない。採用は設定とmessagesの採用参照を同じCORE transactionで更新。

## 実確認済み

| 確認 | 結果 |
|---|---|
| Ajvで契約参照を含む15 Schema、11 operation、画像準拠6色 | PASS |
| `node --experimental-strip-types --test server/features/map-custom/effective.test.ts` | 2 PASS: 停止/削除/競合後も希望保持、明示非表示優先 |
| `node --experimental-transform-types --test server/features/map-custom/persistence.test.ts` | 1 PASS: 実CORE SQLiteファイル保存/再open、本人/モード分離、既存建物・体験データ不変 |
| `manual.e2e.mjs prepare` → サーバー正常終了・別OSプロセス起動 → `manual.e2e.mjs verify` | PASS: 実HTTPで装飾/設定保存・再取得、再送、412/428/422/409、削除後再送404 |
| `plugins.e2e.ts` | PASS: 実PluginService導入/停止/削除後、設定HTTPで希望保持/実効表示のみ無効。保存から再有効化しない |
| `node --experimental-transform-types --test server/features/map-custom/adoption.test.ts` | 1 PASS: 固定AI結果によるプレビュー/取消/412/409/二重適用防止、採用参照書込失敗時の全体rollback |

すべて `mise exec --` から実行。HTTPの記録は [object-http.json](object-http.json) / [settings-plugin-http.json](settings-plugin-http.json)。

HTTP検証は実COREの `createApp/openDatabases/seedProfiles/contractValidation` と各担当の実機能を `http-harness.ts` から使用。共通基盤のコピーはない。共有生成物反映前のため、公式 `merge_fragments` で既存OpenAPIと担当断片を一時ディレクトリへ合成し、COREのcontract引数へ渡した。検証DB・本人設定・cookieは一時ディレクトリだけに置き、証拠へ秘密値を保存していない。

PLUGINS確認の宣言は検証専用fixtureであり、実BIKEデータやPLUGINS lifecycle HTTPの完成証拠ではない。採用テストのAI結果も固定fixtureであり、実AI生成の成功ではない。

## 依存・未達

- CORE: 正式統合 `413598b9379be040be6d4ddbe3d802485911a716`を使用。
- PLUGINS: 公開 `a4820c1`を接続検証用に取込。PR #46の正式統合/後続修正確認は別。
- AI: 公開engine `6275ac1`を取込、C側に型エラーなし。実AI生成→保存→再取得とAI HTTP/SETTINGS許可接続は未確認。
- 共有OpenAPI/型付きclientへの最新版断片反映、正式起動経路での接続、UI実操作と短い独立レビュー/PR統合は未完了。
- 旧claim-base guard問題は正式PR #63（57591b1）を通常mergeして対処。receipt/既存変更を保持しhookは無効化していない。未統合の依存commitを含むbranchのpushは、それらの正式統合を待つ。

部分提供のためIssue #27は閉じない。実AI未確認を完成扱いにしない。
