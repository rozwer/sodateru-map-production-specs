# 今日の軌跡

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

- 対象日とタイムゾーンを共通にして軌跡・訪問・記録を表示する。候補・確認済み・否定済み・欠測を区別し、欠測区間を線で補わない。
- 日付変更・カレンダー・記録展開を同じ面で扱い、編集や振り返りから日付・展開行・スクロール位置へ戻る。

[全画面共通の状態・API・レイアウト検査](../common.json)を適用する。

実装形式は `components.json` の `implementation` を使う。[画像を貼らない実装の指定](../component-audit.md)を適用する。
