# CORE.runtime / CORE.integration 先行提供の証拠

2026-09-15。Issue #3、担当koshiro。対象コードcommit `e76a76e`、契約版 `0.3.0`。
作業branch `koshiro/3-core`、起点 `26a2532`。正式worktreeは `/Users/roz/Desktop/sodateru-worktrees/koshiro-3-core`。

## 提供したもの

- Hono/Node起動と同一origin静的配信。開発起動からAPI/Viteを起動する入口。
- 17基本表・既定追加DDL・適用履歴、live/demo別SQLite、初回登録と再起動後の本人解決。
- mode別ローカルsession、getMe、統一エラー、If-Match、永続再送受付。
- 機能のregister.ts収集、migration登録、契約断片の衝突検査と合成。
- 合成OpenAPIの108操作・148 Schemaから生成した型付きクライアント。入力契約検査、モード/本人変更時の取消と遅着除外。

## 実施結果

| コマンド | 結果と範囲 |
|---|---|
| `mise exec -- bun run typecheck` | PASS、strict TypeScript |
| `mise exec -- bun run contracts:check` | PASS、108操作/148 Schema/1002例/8不正入力確認、参照・文書との一致 |
| `mise exec -- bun run test:core` | PASS、5 tests。下記の実HTTP・DB操作を含む |
| `mise exec -- node --experimental-transform-types tools/local/smoke-core.ts` | PASS、実main.tsのOSプロセスを2回起動。live/demoのpeople/session/受付/migrationを再取得 |

実HTTPテストは127.0.0.1の動的portと、テストごとに作成する別々の空SQLiteを使った。同じテスト内の再起動では同じ保存先とcookieを使用し、完了後にその一時領域だけ削除する。既存利用者DBは使用していない。

1. 空DBでgetMe→401、profile取得→session作成→getMe。
2. 型付きクライアントで保存し、同一入力の並行2要求が同じ資源へ収束。DBの行数1を確認。異入力は409 IDEMPOTENCY_CONFLICT。
3. demoへ切替するとlive cookieを使えず401。demo本人開始後もlive資源は404。同じ資源ID/再送キーでも異なる内容を別DBへ保存。
4. サーバーとDB接続を閉じて再作成し、両モードから各々の本文と同じ本人を再取得。元POST再送も既存結果を返す。
5. version 1→2の更新、古い版は412、版欠落は428。未知の本文項目は422、未知queryは400。別本人の資源取得は404。
6. 削除後のPOST再送は404。session終了後は401、終了したsessionの元キー再送は404。外部キー不整合0件。
7. migration失敗のrollback、適用済みSQL変更の拒否、同じDBを両modeへ指定したときの拒否。pending受付は再起動後BUSY、一時結果の期限後410と結果本文清掃。
8. 単独register.tsの自動検出、追加migrationの一度適用。通信がAbortを無視してもモード切替後の遅着成功をAbortErrorで拒否。

保存・版の検証にはテスト限定のFeatureRequest型adapterと専用表を使用した。これは機能登録と共通更新の証拠であり、FEATURE-REQUESTS業務機能の実装・完了を示さない。静的配信のHTMLも明示した検証fixtureであり、製品UIの見た目・操作受入ではない。

実プロセス検証の出力：

```json
{
  "result": "PASS",
  "entry": "server/app/main.ts",
  "processStarts": 2,
  "modes": ["live", "demo"],
  "persisted": ["people", "core_sessions", "core_requests", "core_migrations"],
  "fixture": "temporary empty databases; local self profile; no product UI claimed"
}
```

## 接続手順

[COREの起動・本人・再送契約](../../01_requirements/04_api/conventions/07_core-runtime.md)を使う。
統合後の同じdevelopで、起動ログのorigin・live/demo DBパスを確認する。UIは `packages/api-client/index.ts` を使い、getSessionProfiles→postSession→getMeの順で本人を解決する。

## 残る受入

- この提供commitを含むdevelopでUI-BASEのVite proxy/画面からsession・mode切替を接続する。
- PLACES/AI等の実際の機能register.ts/migration/契約断片を取り込み、同じ起動・本人・DBで保存と再取得を確認する。
- 各機能の業務SQL・DTO・外部providerの成功/失敗検証。COREのfixtureを代用しない。
- Q01の人物削除/プロフィール公開範囲はSETTINGS/COMMUNITYで引き続き扱う。

先行提供のPRでIssue #3を自動closeしない。統合・利用側接続・CORE全体のboard終了はそれぞれ確認する。
