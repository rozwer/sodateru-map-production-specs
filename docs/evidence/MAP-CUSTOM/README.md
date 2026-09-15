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

| `CODEX_AI_MODEL=gpt-5.6-luna node server/features/map-custom/live-ai.e2e.mjs` | PASS: 実SDK応答50,183ms、許可OFFのRun失敗、プレビュー未保存、明示採用、別プロセス再起動再取得、採用再送の二重適用防止 |

すべて `mise exec --` から実行。HTTPの記録は [object-http.json](object-http.json) / [settings-plugin-http.json](settings-plugin-http.json)。

HTTP検証は実COREの `createApp/openDatabases/seedProfiles/contractValidation` と各担当の実機能を `http-harness.ts` から使用。共通基盤のコピーはない。共有生成物反映前のため、公式 `merge_fragments` で既存OpenAPIと担当断片を一時ディレクトリへ合成し、COREのcontract引数へ渡した。検証DB・本人設定・cookieは一時ディレクトリだけに置き、証拠へ秘密値を保存していない。

PLUGINS確認の宣言は検証専用fixtureであり、実BIKEデータやPLUGINS lifecycle HTTPの完成証拠ではない。adoption.test.tsのAI結果は固定fixture。実AI生成からのHTTP採用は別の [live-ai-http.json](live-ai-http.json) に記録（実provider、合成入力と一時DBのみ使用）。共通GET /messagesは現時点でappliedRefsを返さないため、採用参照は実SQLiteのmessages.applied_refs_jsonで確認し、API補完を#7へ連絡済み。

## 依存・未達

- CORE: 正式統合 `413598b9379be040be6d4ddbe3d802485911a716`、契約v0.3.0の実runtimeを使用。
- PLUGINS: `625ff67`まで取得。正式統合PR #46 (`33a5021`)を保持して取り込み。
- AI: 実HTTP検証は `d48617d` の会話HTTP/SETTINGS接続・実SDKを使用。正式統合PR #96 (`0216502`)を保持して取り込み。
- 実AIの送信は新規一時DB内の検証本人・既定style・合成の日本語希望だけ。実本人の記録やcookie/秘密値は証拠へ含めない。
- 共通OpenAPI/型付きclientへの最新版断片反映、正式起動経路での接続、A担当UI実操作、短い独立レビュー/PR統合は未完了。
- 共通採用参照のHTTP再取得はAI担当へ補完依頼済み。現在の証拠は設定/AI結果/プレビューの実HTTP再取得と採用参照の実SQL再取得を区別する。
- 更新後の全体typecheckは担当外THEMES/DISASTER等のエラーが残る。MAP-CUSTOM fixtureのPLUGINS型追従後、採用/実効表示の3ケースはPASS。
- guard修正PR #63を適用、receiptと既存commitを保持しhook無効化・path拡大・release/reclaimは行っていない。

部分提供中のためIssue #27は閉じない。
