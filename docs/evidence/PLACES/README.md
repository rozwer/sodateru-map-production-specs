# PLACES 提供状況

## 先行実装（未検証・未完成）

- 専用worktree: `kaiya-5-places`、branch: `kaiya/5-places`。
- 検索: 保存済み優先、Nominatim名前検索、Mapbox周辺検索。期限15分・本人/mode別メモリ。temporary保存拒否。
- 採用: `creation_receipts` を期限より先に照合。同一再送は現在資源、異内容409、削除後404。業務変更とreceiptをCORE transactionに接続する。
- HTTP Candidateは `position:{longitude,latitude}`、内部は `coordinates:[longitude,latitude]`。既存仕様の変換を維持。
- 場所詳細: INFORMATIONの公開された署名へ接続を実装中。共有権限処理は複製しない。

## 外部接続設定の実確認

`provider-connectivity.json` に2026-09-15の実取得結果を保存。Nominatim 東京駅3件・Mapbox coffee5件がHTTP 200。トークン、Mapbox候補本文は保存していない。これは接続設定だけの検証で、実装adapter・CORE・DBの統合受入とは別。

`mise exec -- bun` のTranspilerで固有TypeScript全ファイルの構文解析が成功。型検査・実行検証の代替とはしない。

## 未達

CORE/INFORMATION未統合のため実API/実DB検証未実施。実装adapter経由の実取得、永続化・再起動後再取得、失敗検証、Q03編集権限の確定、営業時間/入口追加属性と更新処理の実接続、短い独立レビューが残る。Issueを完了扱いにしない。

## Provider参照

[Nominatim Search](https://nominatim.org/release-docs/latest/api/Search/)、[Mapbox Search Box](https://docs.mapbox.com/api/search/search-box/)。実取得時の認証値はログや証拠へ保存しない。
