# 共通ヘッダーとエラー

各操作に列記されたヘッダーとエラーを適用する。入出力例は [OpenAPI](../openapi.json) に保持する合成例であり、実サーバーの応答ではない。空コレクションも省略していない。

## ヘッダー

<a id="x-request-id"></a>

### X-Request-Id

string (uuid)。—。新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。

<a id="idempotency-key"></a>

### Idempotency-Key

string。minLength=1、maxLength=128。本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。

<a id="if-match"></a>

### If-Match

string。pattern=^"[1-9][0-9]*"$。対象の版。媒体添付・一括順序変更は親記録の版。

<a id="range"></a>

### Range

string。minLength=1、maxLength=200。単一bytes範囲。複数・不正・範囲外は416。

## 共通エラー

全操作は以下を返し得る。本文は [ErrorEnvelope](../schemas/models.md#errorenvelope)。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |

## 操作別エラー

各操作に列記したものだけを適用する。

| HTTP | code | 条件 |
|---|---|---|
| 409 | `INPUT_CHANGED` | 現在状態と操作が競合 |
| 409 | `NOT_READY` | 現在状態と操作が競合 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |
| 410 | `RESULT_EXPIRED` | 一時結果の期限切れ |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 413 | `PAYLOAD_TOO_LARGE` | 本文・ファイルが上限超過 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 媒体形式が対象外 |
| 416 | `RANGE_NOT_SATISFIABLE` | Range指定が範囲外または複数 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 501 | `MODE_UNSUPPORTED` | 移動種別などが未対応 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 503 | `UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。

全応答のX-Request-Id、操作ごとの追加ヘッダー・エラーcode列挙はOpenAPIに定義する。
