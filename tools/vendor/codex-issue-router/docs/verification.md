# 検証記録

2026-09-15 JST。macOS、Node.js 22.22.1、GitHub CLI 2.97.0、Desktop内蔵Codex CLI 0.153.4。

- 単体・CLIテスト14件: 宛先の完全一致、引用やコード除外、許可送信者、登録前コメント除外、自己メンション取得、宛先重複、登録解除、再起動後重複抑止、送信結果不明時の保留、二重配送役、オフライン登録を確認。
- [検証Issue #604](https://github.com/rozwer/sodateru-map-rehearsal/issues/604) を新規作成。製品Taskやファイルロックは変更していない。
- [メンションコメント5667256556](https://github.com/rozwer/sodateru-map-rehearsal/issues/604#issuecomment-5667256556) を `tick` で取得し、登録された既存Desktopセッションへ `send_message_to_thread` で送信。実行中のモデル入力として受信した。
- 受信側から [ROUTER_E2E_20260915_RECEIVED](https://github.com/rozwer/sodateru-map-rehearsal/issues/604#issuecomment-5667266146) を返信。`sent` 保存、👀、再取得後 `pending=[]` を確認。
- 実測は同一PC・同一アカウントの自己配送。別アカウント3台への配送、アイドル受信、スリープ復帰後の配送、スケジューラ発火からの自動配送は未検証。

外部CLIからDesktop内の実行中セッションへ、別App Serverを起動して同じthreadIdをresumeする方式は採用していない。異なるプロセスから同じセッションを二重実行する危険を避け、Desktop標準の配送ツールを使う。

## 担当登録の負荷

初版に残っていた登録時のGitHub Issue確認を除去した。現在のregisterはローカルJSONだけを使う。登録の成功はIssueの実在や通信成功を保証せず、取得時にアクセス障害を検出する。

macOS arm64 / Node.js 22.22.1、各条件ウォームアップ5回＋50回。`node scripts/benchmark-register.mjs` で再現できる。テスト専用一時ディレクトリを使用し、PATHにghがない環境で実行した。ツール呼出しのモデル待ち時間・mise起動時間はこの表に含めない。

| 別Issueの登録数 | 登録 | Node起動込み中央値 | p95 |
| --- | --- | --- | --- |
| 0 | 初回 | 40.97 ms | 42.16 ms |
| 0 | 同じ登録の再実行 | 39.45 ms | 41.02 ms |
| 1,000 | 初回 | 40.60 ms | 42.03 ms |
| 1,000 | 同じ登録の再実行 | 39.35 ms | 40.57 ms |

- JSON書込部分のみ: 中央値0.32 ms、p95 0.54 ms。検体の永続ファイル146バイト（リポ名・threadIdの長さで変動）。初回は一時ファイル作成＋rename、繰返し登録は書込ゼロ。
- 実登録済みのリハーサル#604で `/usr/bin/time -l mise exec -- node ... register` を追加実行: mise込み0.05秒、最大RSS約45 MiB、終了後は常駐しない。これは1回の補助測定。
- GitHub/AI/DB呼出しゼロ、常駐プロセスなし、配送役のPIDロック待ちなし、他Issueの全件走査なし。
- CLI回帰テストでは、ghのないPATH・配送役ロック保持・他Issueに不正なJSONという状態でも登録が成功。再登録前後のmtimeとinodeが同一、同一Issueの別セッション登録は拒否されることを確認。
- 判断: claim時に1回、解除時に1回の登録処理は、このPCでは実用上ほぼ無影響。物理的なゼロ負荷ではなく、各PCのディスク・セキュリティソフト等による差は未測定。CodexがCLIを呼ぶtool call、および定期配送役のモデル利用量は別途発生する。
