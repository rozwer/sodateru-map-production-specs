# CORE: 確定済み断片の共有カタログ反映

## 対象

起点 `df5e5073085eddda1e6598664e00881e12b25d81` の `origin/develop` に統合済みの全断片を合成。変更commitは本書を含むPRを参照。

- HTTP共通parameter/response参照を展開してから断片を合成し、省略されたparameter.requiredをfalseとして扱う。
- 操作ごとに異なるヘッダー定義を共通文書の同一定義assertで止めない。
- 既存の自動生成サンプルに、差替えSchemaの必須項目を補う。断片が独自に指定したサンプルは保持し、全サンプルを検証する。
- 187操作・265SchemaのOpenAPI、共有client、文書を再生成。入力契約・機能実装・UIは変更していない。

## 検証

Node 22.22.1、Bun 1.3.14、macOS arm64。いずれも担当worktreeで `mise exec --` を使用。

1. `bun run contracts:build` 成功。
2. `bun run contracts:check` 成功: 187操作、265Schema、1171例、8拒否条件、20Markdown。Schema参照・例・カタログ一致・ローカルリンクを検証。
3. `node --experimental-transform-types docs/evidence/CORE/catalog-probe.ts` 成功。実際の `server/app/main.ts` を起動し、自動探索した全機能registryと新規の分離SQLiteを使用。生成clientで本人開始後、`listCompanions` と `getSharedThemes` が `{items:[],nextCursor:null}` を返した。`postSelfCheckins` はtimezone・timeBudget等を含む入力を保存し、GETで再取得できた。既存QA DB・ブラウザーには触れていない。

## 適用と残作業

統合commitを取り込み、実行中APIを再起動する（OpenAPIは起動時に読み込む）。UIの開発サーバーも最新clientで再読み込みする。

- COMPANIONの `listCompanions` は共有clientへ登録済み。
- FRIENDSの共有テーマ型は確定断片の `CommunitySharedTheme` / `CommunitySharedThemePage`。`SharedTheme` というexportは断片に存在しない。画面が旧名をimportしている場合はUI担当範囲の修正が必要。
- SUGGESTIONSのチェックイン保存と再取得を確認。候補生成・外部provider・画面一連の操作までは今回の証拠に含まない。
- REFLECTION新規採用の428は別件。断片のoptional If-Matchに対して現行client generator/runtime validatorが必須扱いするため、再生成だけでは解消しない（既存追跡Issue #111）。
- 全機能の製品受入、CORE親Issueの完了を意味しない。統合担当へ引継ぎ後、本作業のclaimを返却する。
