# 1. フォルダ構成

[入口へ戻る](../../README.md) · [次：担当と作業単位](02-ownership.md)

## 分割の基準

仕様とコードは機能別に置きます。同じ機能の中を `ui/` と `server/` に分け、Aさんと処理側の担当が同じファイルを編集せずに進められる構造にします。複数機能が使うUI・地図・チャット・AI実行・経路取得は共通化します。

フォルダは読みやすさと変更箇所のまとまり、Issueは完成させる仕事、担当者は作業量と依存に基づいて決めます。三つを同じ単位に揃えません。

## 作成する構成案

以下は実装時の配置案です。現在は `README.md` と `docs/plan/` のレビュー文書だけを作成しています。

```text
README.md
AGENTS.md                         確定した短い開発規約

docs/
  plan/                           この構成案
  requirements/                   機能別の目的・採用範囲
  specs/<機能名>/
    ui.md                         画面・状態・操作・遷移
    behavior.md                   処理・保存・失敗時の仕様
    acceptance.md                 入力例と通過条件
    images/                       その仕様の画像
  issues/                         新規Issue本文
  future.md                       今回扱わない機能

contracts/
  common.ts                       ID・時刻・共通エラー
  map.ts                          地図の入力と選択イベント
  chat.ts                         チャットの入出力・状態
  <機能名>/
    api.ts                        APIの入出力
    schema.sql                    初期の保存スキーマ
    examples.json                 UI・APIの共用入出力例

src/
  web/
    app/                          起動・ナビ・画面状態
    api/                          共通APIクライアント
    ui/
      messages.ts                 UI文言・全言語を1ファイルで管理
      tokens.css
      components/
      templates/
      map/                        共通Mapbox描画
      chat/                       共通チャット表示・操作
  server/
    runtime/                      起動・DB接続の薄い共通処理
    ai/                           共通AI実行
    geo/                          共通の場所・経路取得
  features/<機能名>/
    ui/                           Aさん側の実装
    server/                       機能担当のAPI・処理・保存・テスト
    migrations/                   その機能の追加スキーマ変更

tests/
  journeys/                       実接続での利用シナリオ
```

`contracts/` のAPIと初期スキーマはIssueと一緒に渡します。仕様書へ同じ型・SQLを転記せず、該当ファイルを参照します。実装後の変更は機能別migrationにし、初期スキーマと変更の対応を残します。

## 機能フォルダ

| フォルダ | 含めるもの |
|---|---|
| `startup`、`settings` | 利用開始、本人領域、設定、復帰、データ管理 |
| `records`、`growth` | 訪問・体験・媒体、履歴、訂正・削除、成長 |
| `places`、`routes`、`exploration` | 地点・建物、検索、経路、探索候補、案内 |
| `self/reflection` | 質問・回答・振り返り・日記 |
| `self/insights`、`self/suggestions` | 期間別分析、根拠、本人ルール、提案 |
| `self/library` | テーマ、メモ、保存済み比較 |
| `social`、`local-knowledge` | 友人、共有、比較、地域情報 |
| `extensions/store`、`extensions/requests` | 導入・利用管理、要望 |
| `extensions/map-style` | 手動・AIによる地図設定 |
| `plugins/disaster`、`plugins/bike`、`plugins/pilgrimage` | 3種の固有処理と利用画面 |

例えば `self/insights` と `self/suggestions` は同じ親フォルダでも別の機能Issue・担当にできます。一方、記録→訂正→成長の更新は複数フォルダにまたがっても、一つの機能Issueにまとめられます。

## 共通ファイルを増やしすぎない

サーバーは一つのアプリとDBを基本とし、機能間は通常の関数呼出しでつなぎます。担当別のサーバーやDB、機能ごとの独自AI接続・地図生成を作りません。

起動ファイルでは機能ごとのrouterを登録し、各APIの追加は機能内で完結させます。旧リポのentry台帳・capability・統合receiptを新しい製品の前提にしません。

同じ体験を地図・共有・自己理解で使う場合、保存処理は `records` を使います。画面ごとに体験テーブルや更新APIを増やしません。機能固有のデータは各機能が持ち、別機能の共通データを更新するときは、その提供関数を呼びます。
