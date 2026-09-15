# API仕様

共通規約と機能別のHTTP契約を定める。
配置先は `docs/01_requirements/04_api/`。
既存の[DB仕様](../01_DB/README.md)・[共通基盤](../02_common/README.md)に基づく設計案であり、実装済みAPIの報告ではない。

## 何を再現できるか

操作ごとにパス・メソッド・パラメータ・本文の型・必須条件・成功応答・失敗応答・保存条件を記載した。
JSON例は契約の形を示す合成例であり、実サーバーの応答ではない。
空のコレクション等も省略せずに示す。

各一覧の型からHTTPクライアントや応答の検証を作れる。
ただし、認証、集計の判定規則、別都市への体験転用など未確定の依存があるため、**この仕様だけで全機能の動作を再現できる状態にはまだない**。
操作固有の依存を各一覧、全体の不足を[機能対応表](coverage.md)と[未確定事項](conventions/03_open-questions.md)に記載する。
画面仕様の `03_pages/` は監査時点で空であり、全画面との網羅性は未検証。

## 共通規約

| 文書 | 内容 |
|---|---|
| [通信・データ形式](conventions/01_http.md) | URL、入力、応答、一覧、上限 |
| [保存・権限・エラー](conventions/02_mutations.md) | 再送、版、権限、部分失敗、原文の保持 |
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

## 型定義と整合確認

- [入出力の型](schemas/models.md)：フィールド、型、必須、値域と内部構造。
- [DTOとDBの対応](schemas/README.md)：DBへの変換と保存しない項目。
- [openapi.json](openapi.json)：全操作の入力・成功／失敗応答を機械可読で保持する。
- [入出力例と確認条件](examples.md)：保存・競合・取消・権限・空結果。

同じ定義から機能別文書・型一覧・OpenAPIを生成し、記述の食い違いを防ぐ。
変更は [build_contracts.py](tools/build_contracts.py) に反映して再生成する。
説明文書の共通規約・対応表・未確定事項は直接編集する。

```sh
mise exec -- python3 docs/01_requirements/04_api/tools/build_contracts.py
mise exec -- node docs/01_requirements/04_api/tools/check_contracts.mjs
```

契約検査は参照・重複・Schema・掲載例を確認する。
API実装、DB保存、画面再表示の合格とは分ける。
