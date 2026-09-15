# 技術スタック

React UI → HTTP/JSON → Node.js・Hono → SQLite。AIはサーバー側からCodex SDKで実行する。
版の正本は [mise.toml](../../../mise.toml)・[package.json](../../../package.json)・[bun.lock](../../../bun.lock)。依存は完全一致で固定する。

| 対象 | 採用技術 |
|---|---|
| 実行・依存管理 | Node.jsで実行、Bunで依存管理 |
| 言語・UI | TypeScript（strict）、React、Vite、CSS / CSS Modules |
| 地図・3D | Mapbox GL JS / Standard、独自造形のみThree.js |
| API・検証 | Hono / Node adapter、Ajv / ajv-formats（JSON Schema） |
| 保存 | Node組込み `node:sqlite`、媒体実体はローカルファイル |
| AI | `@openai/codex-sdk` |
| テスト | Vitest、UI部品はjsdom |

## 実装上の契約

- 開発時はViteから `/api` をAPIへ転送し、配信時はNodeでUIとAPIを同一originに置く。
- UI文言・翻訳は `messages.ts`、見た目は共通トークン、通信は共通APIクライアントに集約する。
- 共通地図部品は初期化・終了、カメラ、レイヤー、地点、経路、選択を扱う。共通チャット部品は会話・入力・送信・処理中・取消・再試行を扱い、相談目的と参照データを受け取る。
- APIはJSON、媒体アップロードはmultipart。入出力・エラー・保存スキーマ・再送時の挙動を契約で定義する。
- DBは単一SQLiteファイル（外部キー有効・WAL）。保存済みデータの正本とし、ブラウザ保存はカメラ/タブ等の端末表示状態と下書きのみ。本人の保存済みレイヤー/地図スタイル/飾りはMAP-CUSTOMのAPIでSQLiteへ保存する。媒体の対応・保存先・種別・表示順はDBに置く。詳細は [DB索引](../01_DB/README.md)。
- DBトランザクション内でAI・外部APIを呼ばない。
- 共通AI処理は機能別のプロンプト・参照データ・結果構造を受け取る。モデル・provider・出力形式は機能仕様で固定し、会話はDBに保存する。記録への反映は内容確認後の保存操作とする。
- Search Boxを使う街歩き相談は一時CLI実行にする。固定SDKのThreadOptionsにephemeralがないため、[共通AIの実行仕様](../02_common/01_ai/02_execution.md)に定めたCodex CLIを使う。
- 地図・AI・保存の失敗をそれぞれ表示する。実接続とテスト・デモ応答は明示的に切り替え、接続失敗をモックで隠さない。テスト応答も実APIと同じ契約に従う。

## 環境変数

| 変数 | 用途・既定値 |
|---|---|
| `VITE_MAPBOX_ACCESS_TOKEN` | ブラウザ用公開トークン（origin・権限制限） |
| `MAPBOX_ACCESS_TOKEN` | サーバー用Mapboxトークン |
| `SODATERU_DB_PATH` | `.local/app.sqlite` |
| `SODATERU_ASSET_ROOT` | `.local/assets/` |
| `CODEX_AI_WORKDIR_ROOT` | `.local/codex-ai/` |

`.local/`・`.env`・依存実体・ビルド出力はGit対象外。
iOS・Capacitor・HealthKit、別DBサーバー、独立ジョブ基盤は基本スタックに含めない。
環境構築は [Skill](../../../.agents/skills/sodateru-setup/SKILL.md)、データの意味は [共通用語](../02_common/CONTEXT.md) を参照する。
