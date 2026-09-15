# 相棒をファイルから追加

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

- v2ペット形式を読み、形式検査とプレビュー後に登録する。登録と現在の相棒への選択は別。画像指定のZIP上限50MBと元仕様6MiBは差分として解決する。壊れたファイルで現在の相棒を変更しない。

[全画面共通の状態・API・レイアウト検査](../common.json)を適用する。

APIとの差分: pet。詳細は [API不足一覧](../api-gaps.json)。

実装形式は `components.json` の `implementation` を使う。[画像を貼らない実装の指定](../component-audit.md)を適用する。
