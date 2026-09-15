# API仕様

共通規約と機能別のHTTP契約を定める。
配置先は `docs/01_requirements/04_api/`。
既存の[DB仕様](../01_DB/README.md)・[共通基盤](../02_common/README.md)に基づく設計案であり、実装済みAPIの報告ではない。

## 何を再現できるか

操作ごとにパス・メソッド・パラメータ・本文の型・必須条件・成功応答・失敗応答・保存条件を記載した。
JSON例は契約の形を示す合成例であり、実サーバーの応答ではない。
空のコレクション等も省略せずに示す。

各一覧の型からHTTPクライアントや応答の検証を作れる。
ただし、人物管理、集計の判定規則、別都市への体験転用など未確定の依存があるため、**この仕様だけで全機能の動作を再現できる状態にはまだない**。ローカル本人識別と再送・機能登録は[CORE契約](conventions/07_core-runtime.md)へ具体化した。
操作固有の依存を各一覧、全体の不足を[機能対応表](coverage.md)と[未確定事項](conventions/03_open-questions.md)に記載する。
画面仕様は[67画面](../03_pages/README.md)に整備済み。[画面側のAPI不足](../03_pages/api-gaps.json)を参照する。全画面の実動作との対応は未検証。

## 共通規約

| 文書 | 内容 |
|---|---|
| [通信・データ形式](conventions/01_http.md) | URL、入力、応答、一覧、上限 |
| [共通ヘッダーとエラー](conventions/06_shared-http.md) | 各操作が参照する型・制約・エラー条件 |
| [保存・権限・エラー](conventions/02_mutations.md) | 再送、版、権限、部分失敗、原文の保持 |
| [CORE起動・本人・再送](conventions/07_core-runtime.md) | ローカルsession、DB、機能登録、生成クライアント |
| [共通関数との接続](conventions/05_common-bindings.md) | HTTP名と共通Schemaの明示的な変換 |
| [状態遷移](conventions/04_state-transitions.md) | 訪問、提案、案内、AI、友人関係 |
| [未確定事項](conventions/03_open-questions.md) | 未決定内容と解消済み事項 |
| [機能対応表](coverage.md) | 既存文書の操作との対応、漏れ、修正理由 |

## 機能別契約

| 文書 | 対象 |
|---|---|
| [地図・場所](endpoints/01_places.md) | 保存場所、一時候補、建物との対応、成長材料 |
| [訪問・記録・媒体](endpoints/02_records.md) | 訪問確認、原文保存、添付、位置観測 |
| [会話・AI](endpoints/03_conversations.md) | 受付、用途別入出力、取消、再試行、状態取得 |
| [振り返り・分析・テーマ](endpoints/04_reflection.md) | 日別、回答、期間集計、結果評価、根拠照合 |
| [提案・経路](endpoints/05_routes.md) | 候補、達成、経路取得、保存、案内、定期券 |
| [人物・共有](endpoints/06_sharing.md) | 本人、人物、友人、共有検索、地域の声 |
| [拡張機能](endpoints/07_plugins.md) | 導入、設定、無効化、削除、機能要望 |
| [機能別契約断片](endpoints/08_fragments.md) | COREセッション等、担当が追加した操作 |

## 型定義と整合確認

- [入出力の型](schemas/models.md)：フィールド、型、必須、値域と内部構造。
- [DTOとDBの対応](schemas/README.md)：DBへの変換と保存しない項目。
- [openapi.json](openapi.json)：全操作の入力・成功／失敗応答を機械可読で保持する。
- [入出力例と確認条件](examples.md)：保存・競合・取消・権限・空結果。

同じ定義から機能別文書・型一覧・OpenAPIを生成する。同一のヘッダー・応答はOpenAPIの `components.parameters` / `components.responses` を `$ref` で参照する。操作の例はOpenAPIに集約し、機能別文書から該当操作へリンクする。
機能固有の追加はfragments/<Task-ID>.jsonへ記録し、[build_contracts.py](tools/build_contracts.py)で合成する。共有Schema/既存操作の変更はCORE担当へ連絡する。
説明文書の共通規約・対応表・未確定事項は直接編集する。

```sh
mise exec -- bun run contracts:build
mise exec -- bun run contracts:check
```

契約検査は参照・重複・Schema・掲載例を確認する。
API実装、DB保存、画面再表示の合格とは分ける。
