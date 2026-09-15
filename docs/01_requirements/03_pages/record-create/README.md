# 体験を残す

[このページでできること・機能要件](requirements.md)。

画像の対応は [page.json](page.json)。画面内の表示モードを表すIDであり、独立したURLの新設を要求しない。

| 分割 | 内容 |
|---|---|
| [components.json](components.json) | 要素・操作名・data-testid |
| [states.json](states.json) | 画像に対応する表示・操作可能な要素 |
| [interactions.json](interactions.json) | 各操作の結果・遷移先・持ち越す入力・API |
| [api.json](api.json) | operationId・method/path・入力元・契約参照 |
| [requirements.json](requirements.json) | 機能の意味と保存・再表示要件 |
| [acceptance.json](acceptance.json) | 未実行の受入シナリオ |

## 機能要件

- 写真・動画だけ、本文だけ、日時や場所が不明な体験も保存できる。撮影時刻や現在地を無断で体験日時・訪問場所に確定しない。
- 確認画面で媒体・本文・場所・日時・公開範囲を見直す。行きましたの本人確認と記録保存を区別し、閲覧や場所選択だけで訪問を作らない。
- 媒体の順番と失敗した項目を保持し、本文保存済み・媒体処理中・一部失敗を区別する。既定は自分だけ。

[全画面共通の状態・API・レイアウト検査](../common.json)を適用する。

実装形式は `components.json` の `implementation` を使う。[画像を貼らない実装の指定](../component-audit.md)を適用する。
