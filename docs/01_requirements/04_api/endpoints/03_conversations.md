# 会話・AI

本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。

[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。全操作は本人識別Q01が前提。POSTの再送基盤Q02と操作固有の依存も[未確定事項](../conventions/03_open-questions.md)で確認する。

## 操作一覧

| ID | Method | パス | 操作 | 固有の未確定依存 |
|---|---|---|---|---|
| [03-01](#operation-03-01) | GET | `/conversations` | 会話一覧 | なし |
| [03-02](#operation-03-02) | POST | `/conversations` | 会話作成 | なし |
| [03-03](#operation-03-03) | GET | `/conversations/{conversationId}` | 会話単体取得 | なし |
| [03-04](#operation-03-04) | PATCH | `/conversations/{conversationId}` | 会話題名変更 | なし |
| [03-05](#operation-03-05) | DELETE | `/conversations/{conversationId}` | 会話削除 | なし |
| [03-06](#operation-03-06) | GET | `/conversations/{conversationId}/messages` | 発言一覧 | なし |
| [03-07](#operation-03-07) | POST | `/conversations/{conversationId}/messages` | AI送信受付 | なし |
| [03-08](#operation-03-08) | GET | `/messages/{messageId}` | 発言状態と用途別結果 | なし |
| [03-09](#operation-03-09) | POST | `/messages/{messageId}/cancel` | AI取消 | なし |
| [03-10](#operation-03-10) | POST | `/messages/{messageId}/retry` | AI再試行 | なし |
| [03-11](#operation-03-11) | POST | `/map-dialogues` | 街歩き相談 | なし |
| [03-12](#operation-03-12) | POST | `/map-dialogues/select` | 街歩き候補の選択 | なし |
| [03-13](#operation-03-13) | POST | `/map-dialogues/cancel` | 街歩き相談の取消 | なし |
| [03-14](#operation-03-14) | GET | `/map-dialogues/results/{resultId}` | 街歩き結果の再取得 | なし |

<a id="operation-03-01"></a>

## 03-01 会話一覧

`GET /api/v1/conversations`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`updatedAt DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `purpose` | consult / reflection / analysis / comparison | 省略可 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[ConversationPage](../schemas/models.md#conversationpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1conversations/get)。

<a id="operation-03-02"></a>

## 03-02 会話作成

`POST /api/v1/conversations`

権限：本人。保存先・更新範囲：conversations。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### リクエスト本文

[ConversationCreate](../schemas/models.md#conversationcreate)

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Conversation](../schemas/models.md#conversation) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `OUTPUT_INVALID` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1conversations/post)。

<a id="operation-03-03"></a>

## 03-03 会話単体取得

`GET /api/v1/conversations/{conversationId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Conversation](../schemas/models.md#conversation) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1conversations~1{conversationId}/get)。

<a id="operation-03-04"></a>

## 03-04 会話題名変更

`PATCH /api/v1/conversations/{conversationId}`

権限：本人。保存先・更新範囲：conversations。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[ConversationPatch](../schemas/models.md#conversationpatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Conversation](../schemas/models.md#conversation) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `OUTPUT_INVALID` / 409 `REQUEST_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED` / 413 `INPUT_TOO_LARGE` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1conversations~1{conversationId}/patch)。

<a id="operation-03-05"></a>

## 03-05 会話削除

`DELETE /api/v1/conversations/{conversationId}`

権限：本人。保存先・更新範囲：conversations、messages。

会話とmessagesを削除。保存済みinsightsは保持。実行中の応答は取消信号を送り、削除後の遅着書込みを防ぐ。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1conversations~1{conversationId}/delete)。

<a id="operation-03-06"></a>

## 03-06 発言一覧

`GET /api/v1/conversations/{conversationId}/messages`

権限：本人。保存先・更新範囲：なし。

listMessagesで本人の会話をposition昇順に取得。構造化カードは各assistantのGET /messages/{id}から取得。引用元が読めない発言を本文として返さない。

並び順：`message.position ASC, message.id ASC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[CommonAIMessagePage](../schemas/models.md#commonaimessagepage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1conversations~1{conversationId}~1messages/get)。

<a id="operation-03-07"></a>

## 03-07 AI送信受付

`POST /api/v1/conversations/{conversationId}/messages`

権限：本人。保存先・更新範囲：messages、conversations、分析・比較時はinsights。

body→text、use→task、context→input、expectedRefsを共通startRunへ。会話IDはパスから。user/assistant IDは異なる値。同じ会話にpending/runningがあれば409 BUSY。原文・入力・参照・モデル・promptVersionをmessages.request_jsonへ、応答はresult_jsonへ保存。共通AIの用途別検査と同一入力ハッシュを使う。街歩きはこの入口に混在させずmap-dialoguesへ。analysisは計算済みinsightIdを受け取る。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[MessageSend](../schemas/models.md#messagesend)

### 成功応答

HTTP 202。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [MessageAccepted](../schemas/models.md#messageaccepted) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `OUTPUT_INVALID` / 429 `RATE_LIMITED` / 502 `UPSTREAM_FAILED` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1conversations~1{conversationId}~1messages/post)。

<a id="operation-03-08"></a>

## 03-08 発言状態と用途別結果

`GET /api/v1/messages/{messageId}`

権限：本人。保存先・更新範囲：なし。

本人のMessageとRunを読む。userはrun/output=null。assistantはRunを返し、completeならtaskをuseへ変換しresultをvalueへそのまま返す。message.bodyは表示文。sourceRefs・根拠の現在権限を照合する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `messageId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [MessageResult](../schemas/models.md#messageresult) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1messages~1{messageId}/get)。

<a id="operation-03-09"></a>

## 03-09 AI取消

`POST /api/v1/messages/{messageId}/cancel`

権限：本人。保存先・更新範囲：messages。

If-Match→expectedVersion、attempt→expectedAttempt。pending/runningのみcancelledへ更新して取消信号を送る。completeは409。cancelledの応答喪失後はGETで確認する。古い試行はid/attempt/runningに一致せず保存しない。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `messageId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[MessageRetry](../schemas/models.md#messageretry)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Message](../schemas/models.md#message) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `OUTPUT_INVALID` / 409 `REQUEST_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED` / 413 `INPUT_TOO_LARGE` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1messages~1{messageId}~1cancel/post)。

<a id="operation-03-10"></a>

## 03-10 AI再試行

`POST /api/v1/messages/{messageId}/retry`

権限：本人。保存先・更新範囲：messages。

If-Match→expectedVersion、attempt→expectedAttempt。failed/cancelledのみ。同じIDでattemptを1増やす。元のtext/input/model/promptVersionを再利用し、sourceRefsの版が変更済みなら409 SOURCE_CHANGEDで停止。新しい材料では新しい発言IDを使う。保存前にid/attempt/runningを照合。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `messageId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[MessageRetry](../schemas/models.md#messageretry)

### 成功応答

HTTP 202。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [RetryAccepted](../schemas/models.md#retryaccepted) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `OUTPUT_INVALID` / 429 `RATE_LIMITED` / 502 `UPSTREAM_FAILED` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT` / 409 `REQUEST_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED` / 413 `INPUT_TOO_LARGE`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1messages~1{messageId}~1retry/post)。

<a id="operation-03-11"></a>

## 03-11 街歩き相談

`POST /api/v1/map-dialogues`

権限：本人。保存先・更新範囲：なし。

runDialogue。本人・dataModeにつき同時1件。最大180秒、検索2回・経路3回・AI6回。起点固定。履歴は一時保持のみ。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### リクエスト本文

[CommonAIDialogueRequest](../schemas/models.md#commonaidialoguerequest)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [CommonAIDialogueResult](../schemas/models.md#commonaidialogueresult) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `OUTPUT_INVALID` / 429 `RATE_LIMITED` / 502 `UPSTREAM_FAILED` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1map-dialogues/post)。

<a id="operation-03-12"></a>

## 03-12 街歩き候補の選択

`POST /api/v1/map-dialogues/select`

権限：本人。保存先・更新範囲：なし。

selectDialogueCandidate。本人・dataMode・期限・AI設定版・候補IDを照合。候補の位置と保存された起点で徒歩経路を返す。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### リクエスト本文

[CommonAIDialogueSelect](../schemas/models.md#commonaidialogueselect)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [CommonAIDialogueResult](../schemas/models.md#commonaidialogueresult) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `OUTPUT_INVALID` / 429 `RATE_LIMITED` / 502 `UPSTREAM_FAILED` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1map-dialogues~1select/post)。

<a id="operation-03-13"></a>

## 03-13 街歩き相談の取消

`POST /api/v1/map-dialogues/cancel`

権限：本人。保存先・更新範囲：なし。

cancelDialogue。active.requestIdが同じ本人の対象と一致すれば取消。取消済み・実行なしも204。新しい要求IDはヘッダーで区別。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### リクエスト本文

[CommonAIDialogueCancel](../schemas/models.md#commonaidialoguecancel)

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `OUTPUT_INVALID` / 429 `RATE_LIMITED` / 502 `UPSTREAM_FAILED` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1map-dialogues~1cancel/post)。

<a id="operation-03-14"></a>

## 03-14 街歩き結果の再取得

`GET /api/v1/map-dialogues/results/{resultId}`

権限：本人。保存先・更新範囲：なし。

getDialogueResult。本人・dataMode・期限を検査。期限15分、本人ごとに直近6件。期限切れ・再起動後は410。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `resultId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [CommonAIDialogueResult](../schemas/models.md#commonaidialogueresult) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `OUTPUT_INVALID` / 429 `RATE_LIMITED` / 502 `UPSTREAM_FAILED` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1map-dialogues~1results~1{resultId}/get)。
