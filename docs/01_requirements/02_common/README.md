# 共通基盤

AI実行、場所・経路検索、情報取得の実装仕様を置く。
各基盤のREADMEに使途と結果の戻し先、その配下に入出力・処理・保存・画面連携・確認例を定める。

| 基盤 | 最初に読む文書 | その中で定める内容 |
|---|---|---|
| AI | [AIとのやり取り](01_ai/README.md) | 体験整理、日記、相談、比較、傾向説明、テーマ名、発見、地図設定 |
| 場所・経路 | [場所と道順を探す](02_places-routes/README.md) | 地図検索、投稿の場所選択、提案の移動時間、街歩き、バイク・聖地巡り |
| 情報取得 | [記録・共有・根拠を読む](03_information/README.md) | 場所詳細、日記、傾向、共有検索、地域の声、分析の根拠 |
| HTTP接続 | [既存APIへの対応](references/http-bindings.md) | URL・queryから共通関数への変換 |
| 共通通信 | [値・要求・エラー](00_protocol.md) | 本人の受渡し、単位、要求ID、ページ分割、エラー |
| 照合記録 | [実装との対応](references/implementation-map.md) | リハーサルから継承する処理、本番DBへ変更する処理 |

## 文書と検査データの役割

説明文の項目名と、各基盤のschemas.jsonにある項目名を一致させる。
examples.jsonには具体的な入力と期待する結果を置く。
確認例の表は、同じケースIDで検査データを参照する。

実装時は基盤のREADME→入出力→処理→保存・画面連携→確認例の順に読む。
外部情報を必要とする処理は、取得先・必須設定・失敗時の扱いまで対応する文書に記載する。

[DB設計](../01_DB/README.md)を保存先の基本とし、共通AIで必要な追加列は[AIの保存](01_ai/03_storage-ui.md)に定義する。
[技術スタック](../00_stacks/README.md)の固定版を使う。

文書・スキーマ・具体例を確認するコマンド：

```sh
mise exec -- node docs/01_requirements/02_common/verify.mjs
```

## ディレクトリ

```text
02_common/
├── README.md / CONTEXT.md / 00_protocol.md
├── 01_ai/                 用途・入出力・実行・保存・街歩き・確認例
├── 02_places-routes/      場所・経路・地図連携・確認例
├── 03_information/        検索・媒体権限・根拠・確認例
└── references/            HTTP接続・実装照合・保存の追加DDL
```

各基盤のschemas.jsonは共通関数の入出力形式、examples.jsonはその具体値。verify.mjsはこれらと文書リンクをまとめて検査する。
