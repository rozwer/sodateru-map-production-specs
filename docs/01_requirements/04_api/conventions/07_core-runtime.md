# COREの起動・本人・再送契約 v0.3.0

CORE #3が提供するローカル実行の具体契約。Q01の人物削除・プロフィール公開範囲はSETTINGS/COMMUNITYに残る。各業務APIの契約が存在しても、その機能の実装完了を意味しない。

## 起動

```sh
mise exec -- bun install --frozen-lockfile
mise exec -- bun run dev
```

APIは既定 `127.0.0.1:3001`。UIのindex.htmlが統合されていれば同じコマンドでViteも起動する。Viteの `/api` proxyはUI-BASEのvite.config.tsからAPIへ向ける。UI統合前はAPIだけを起動したことを端末に明示する。

配信用UIをdistへビルドした後は `mise exec -- bun run start` でNodeがUI/APIを同一originで配信する。未ビルドのUIを成功ページに置換せず503にする。`/api`の不明なURLへHTMLを返さない。

| 環境変数 | 既定 |
|---|---|
| SODATERU_HOST / SODATERU_PORT | 127.0.0.1 / 3001 |
| SODATERU_WEB_HOST | 127.0.0.1（Vite） |
| SODATERU_DB_PATH | .local/app.sqlite |
| SODATERU_DEMO_DB_PATH | .local/demo.sqlite |
| SODATERU_PROFILES_PATH | .local/profiles.json |
| SODATERU_STATIC_ROOT | dist |

相対DBパスは起動ディレクトリを基準にする。同じ実体のDBをlive/demoへ設定すると起動失敗になる。両DBとも外部キー有効、WAL、busy timeout 5秒。起動ログのDBパスとoriginを接続先確認に使う。

## Q01：ローカルの本人選択

初回起動でprofiles.jsonに不変の本人IDとセッション発行用secretを作る。初期profileKeyはself、表示名は自分。設定ファイルを消すと別の本人になるため、既存保存先と一緒に保持する。秘密値をUIやIssueへ渡さない。

設定のprofiles配列は `{key,id,name}`。複数本人のローカル選択はサーバーで登録したkeyだけを受け入れる。このローカル方式はインターネット公開サービスのアカウント認証ではない。

初回登録とpeople作成は一括保存し、再起動で既存プロフィールを上書きしない。削除した本人も再作成しない。既存profileKeyを別IDへ暗黙に差し替える設定は拒否する。

すべてのAPIに `X-Request-Id: UUID` と `X-Data-Mode: live|demo` を送る。応答で同じ値を返す。mode別HttpOnly cookie（sodateru_session_live / sodateru_session_demo）から本人を解決する。モードとcookieが一致しない要求は401。他の本人IDを本文へ送っても本人は切り替わらない。

| operationId | 操作 | 入出力 |
|---|---|---|
| getSessionProfiles | GET /session/profiles | `{items:[{profileKey,name}]}` |
| postSession | POST /session | `{profileKey}` → `{data:{person,dataMode,version,expiresAt}}`、初回201/再送200 |
| getSession | GET /session | 同じdata形式、200 |
| deleteSession | DELETE /session | If-Matchを指定、204 |
| getMe | GET /me | 既存の`{data:Person}`、ETagはPerson.version |

セッション有効期間は開始から30日、GETでは延長しない。POSTの再送は元の期限を維持し、終了後に同じキーを再送しても再開しない（404）。期限切れは401で新しい開始操作を求める。本人未解決は401、開始時に人物が消えていれば403。

ブラウザはmode切替で `client.setDataMode(mode)`、そのmodeのgetSessionを呼び、401なら選択とpostSessionへ進む。本人開始/終了とモード切替は旧要求を取消し、遅着した旧世代の結果も共通クライアントが拒否する。

## Q02：永続再送

core_requestsは選択したmodeのDBに置く。一意キーはpersonId・HTTP method/具体path・Idempotency-Key。同じ入力の再送は同じ結果へ収束し、異入力は409 IDEMPOTENCY_CONFLICT。入力ハッシュは正規化済み本文/queryのcanonical JSONをSHA-256化する。オブジェクトのキーはUnicodeコードポイント順、順序付き配列は保持。ID集合の重複拒否・整列は各operationで行ってから渡す。

- DB内完結のPOSTは `idempotentMutation(db, identity, {execute,replay})`。受付・業務更新・結果を同一transactionでcommitする。失敗時は全体rollback。
- `resource:{type,id}`を保存した受付は本文を保存しない。replayが現在の権限・版・存在を再検査し、削除済みなら404。現在の資源を返す既存creation_receipts/messagesの規則を維持する。
- 非同期処理は `beginRequest`・業務の実行ID保存・`completeRequest`による202受付を同じ同期transactionで確定し、外部処理をtransaction外で実行する。再送時は保存した実行IDから現在状態を返す。外部処理を再実行する理由に受付再送を使わない。
- pending受付が残る場合は409 BUSY。クラッシュ後も勝手に削除・再実行しない。機能担当が保存した業務実行状態を照合し、元receiptで結果を確定する。外部APIの完了までDB transactionを保持しない。
- 受付キー/hashは自動失効しない。本人の削除処理時に関連受付も削除する。一時結果はexpiresAtを指定し、期限後410。結果本文は起動中の定期清掃と要求時清掃で消去する。temporaryな取得元データを無期限受付へ保存しない。

更新/削除はIf-Match必須。欠落428 VERSION_REQUIRED、不一致412 VERSION_CONFLICT、形式不正400。機能SQLのWHEREにも本人とversionを入れ、関連更新と版増加を同時commitする。

## 機能登録と型

機能の `server/<機能>/register.ts` が次をdefault exportする。CORE起動が登録ファイルを収集する。登録時は外部通信を実行しない。

```ts
import { defineFeature } from '../core/features.ts';
export default defineFeature({
  id: 'my-feature',
  migrations: [{ id: 'my-feature/001', sql: 'CREATE TABLE my_feature (id TEXT PRIMARY KEY);' }],
  register(api, services) {
    // apiは/api/v1配下。c.get('context')、c.get('db')、c.get('input')を使用。
    // services.transactionは同期処理のみ。業務routerとDTO変換はこの機能が持つ。
  },
});
```

SQLにtransaction制御を含めない。migration IDは機能名で一意化。適用済みSQLのhash変更は停止し、追加変更には新しいmigrationを足す。DB初期表は000-base.sqlに17表と既定追加DDLをまとめる。

`fragments/<Task-ID>.json` は `{taskId,version,schemas,operations}`。operationsはmethod/pathとOpenAPI operation。既存置換はreplaceOperation:true、Schema置換はreplaceSchemasに名前を宣言し、共有反映担当とIssueで調整する。未知の重複は生成失敗にする。

```sh
mise exec -- bun run contracts:build
mise exec -- bun run contracts:check
```

合成OpenAPIから入力検査と `packages/api-client/types.generated.ts`、operations.generated.tsを生成する。生成済み型を手編集しない。

```ts
import { createApiClient } from './packages/api-client/index.ts';
const client = createApiClient(); // /api/v1、same-origin cookie
const profiles = await client.request('getSessionProfiles', {});
await client.request('postSession', {
  body: { profileKey: profiles.items[0]!.profileKey },
  idempotencyKey: crypto.randomUUID(), // 再送では同じキーを保持
});
const me = await client.request('getMe', {});
```

path/query/bodyはoperationIdで型付けし、version→If-Match、idempotencyKey→Idempotency-Keyへ変換。成功はdataやitemsを含むHTTP本文全体。失敗はApiErrorのstatus/code/message/requestId/details。自動再試行は行わず、入力と操作キーは呼出側が保持する。multipartはFormData、バイナリ応答はBlobを使う。
