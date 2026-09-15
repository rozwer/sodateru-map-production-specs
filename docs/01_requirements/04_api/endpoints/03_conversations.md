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

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `purpose` | consult / reflection / analysis / comparison | 省略可 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Conversation](../schemas/models.md#conversation)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

```json
{
  "items": [],
  "nextCursor": null
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-03-02"></a>

## 03-02 会話作成

`POST /api/v1/conversations`

権限：本人。保存先・更新範囲：conversations。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `purpose` | consult / reflection / analysis / comparison | 必須 | — | 会話の利用目的 |
| `title` | string | 必須 | minLength=1、maxLength=200 | 会話のタイトル |
| `recordId` | [Id](../schemas/models.md#id) または null | 必須 | — | 主な対象記録。記録削除時はNULL |

```json
{
  "id": "record-001",
  "purpose": "consult",
  "title": "散歩の記録",
  "recordId": null
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Conversation](../schemas/models.md#conversation) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "purpose": "consult",
    "title": "散歩の記録",
    "recordId": null
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-03-03"></a>

## 03-03 会話単体取得

`GET /api/v1/conversations/{conversationId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Conversation](../schemas/models.md#conversation) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "purpose": "consult",
    "title": "散歩の記録",
    "recordId": null
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-03-04"></a>

## 03-04 会話題名変更

`PATCH /api/v1/conversations/{conversationId}`

権限：本人。保存先・更新範囲：conversations。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `title` | string | 省略可 | minLength=1、maxLength=200 | 会話のタイトル |

```json
{
  "title": "散歩の記録"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Conversation](../schemas/models.md#conversation) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "purpose": "consult",
    "title": "散歩の記録",
    "recordId": null
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-03-05"></a>

## 03-05 会話削除

`DELETE /api/v1/conversations/{conversationId}`

権限：本人。保存先・更新範囲：conversations、messages。

会話とmessagesを削除。保存済みinsightsは保持。実行中の応答は取消信号を送り、削除後の遅着書込みを防ぐ。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-03-06"></a>

## 03-06 発言一覧

`GET /api/v1/conversations/{conversationId}/messages`

権限：本人。保存先・更新範囲：なし。

listMessagesで本人の会話をposition昇順に取得。構造化カードは各assistantのGET /messages/{id}から取得。引用元が読めない発言を本文として返さない。

並び順：`message.position ASC, message.id ASC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[CommonAIMessage](../schemas/models.md#commonaimessage)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

```json
{
  "items": [],
  "nextCursor": null
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-03-07"></a>

## 03-07 AI送信受付

`POST /api/v1/conversations/{conversationId}/messages`

権限：本人。保存先・更新範囲：messages、conversations、分析・比較時はinsights。

body→text、use→task、context→input、expectedRefsを共通startRunへ。会話IDはパスから。user/assistant IDは異なる値。同じ会話にpending/runningがあれば409 BUSY。原文・入力・参照・モデル・promptVersionをmessages.request_jsonへ、応答はresult_jsonへ保存。共通AIの用途別検査と同一入力ハッシュを使う。街歩きはこの入口に混在させずmap-dialoguesへ。analysisは計算済みinsightIdを受け取る。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `conversationId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `userMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `body` | string | 必須 | minLength=1、maxLength=20000 | — |
| `use` | "extract" | 必須 | — | — |
| `context` | [CommonAIextractInput](../schemas/models.md#commonaiextractinput) | 必須 | — | — |
| `expectedRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000 | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `userMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `body` | string | 必須 | minLength=1、maxLength=20000 | — |
| `use` | "diary" | 必須 | — | — |
| `context` | [CommonAIdiaryInput](../schemas/models.md#commonaidiaryinput) | 必須 | — | — |
| `expectedRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000 | — |

分岐 3

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `userMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `body` | string | 必須 | minLength=1、maxLength=20000 | — |
| `use` | "consult" | 必須 | — | — |
| `context` | [CommonAIconsultInput](../schemas/models.md#commonaiconsultinput) | 必須 | — | — |
| `expectedRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000 | — |

分岐 4

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `userMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `body` | string | 必須 | minLength=1、maxLength=20000 | — |
| `use` | "comparison" | 必須 | — | — |
| `context` | [CommonAIcompareInput](../schemas/models.md#commonaicompareinput) | 必須 | — | — |
| `expectedRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000 | — |

分岐 5

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `userMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `body` | string | 必須 | minLength=1、maxLength=20000 | — |
| `use` | "analysis" | 必須 | — | — |
| `context` | [CommonAIanalysisInput](../schemas/models.md#commonaianalysisinput) | 必須 | — | — |
| `expectedRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000 | — |

分岐 6

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `userMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `body` | string | 必須 | minLength=1、maxLength=20000 | — |
| `use` | "theme-name" | 必須 | — | — |
| `context` | [CommonAIthemeInput](../schemas/models.md#commonaithemeinput) | 必須 | — | — |
| `expectedRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000 | — |

分岐 7

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `userMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `body` | string | 必須 | minLength=1、maxLength=20000 | — |
| `use` | "map-style" | 必須 | — | — |
| `context` | [CommonAImapstyleInput](../schemas/models.md#commonaimapstyleinput) | 必須 | — | — |
| `expectedRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000 | — |

分岐 8

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `userMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `body` | string | 必須 | minLength=1、maxLength=20000 | — |
| `use` | "discovery" | 必須 | — | — |
| `context` | [CommonAIdiscoverInput](../schemas/models.md#commonaidiscoverinput) | 必須 | — | — |
| `expectedRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000 | — |

```json
{
  "userMessageId": "u1",
  "assistantMessageId": "a1",
  "body": "今日の記録をまとめて",
  "use": "diary",
  "context": {
    "date": "2026-09-14",
    "timezone": "Asia/Tokyo",
    "recordIds": [
      "r1"
    ]
  },
  "expectedRefs": [
    {
      "type": "record",
      "id": "r1",
      "version": 2
    }
  ]
}
```

### 成功応答

HTTP 202。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [MessageAccepted](../schemas/models.md#messageaccepted) | 必須 | — | — |

```json
{
  "data": {
    "userMessage": {
      "id": "user-001",
      "version": 1,
      "createdAt": 1789430400000,
      "updatedAt": 1789430400000,
      "conversationId": "conversation-001",
      "position": 0,
      "role": "user",
      "body": "近くで休める場所を探して。",
      "status": "complete",
      "attempt": 1,
      "model": null,
      "errorCode": null,
      "insightId": null,
      "sourceRefs": []
    },
    "assistantMessage": {
      "id": "assistant-001",
      "version": 1,
      "createdAt": 1789430400000,
      "updatedAt": 1789430400000,
      "conversationId": "conversation-001",
      "position": 1,
      "role": "assistant",
      "body": "",
      "status": "pending",
      "attempt": 1,
      "model": null,
      "errorCode": null,
      "insightId": null,
      "sourceRefs": []
    },
    "statusUrl": "/api/v1/messages/assistant-001"
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 410 | `RESULT_EXPIRED` | 一時結果の期限切れ |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-03-08"></a>

## 03-08 発言状態と用途別結果

`GET /api/v1/messages/{messageId}`

権限：本人。保存先・更新範囲：なし。

本人のMessageとRunを読む。userはrun/output=null。assistantはRunを返し、completeならtaskをuseへ変換しresultをvalueへそのまま返す。message.bodyは表示文。sourceRefs・根拠の現在権限を照合する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `messageId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [MessageResult](../schemas/models.md#messageresult) | 必須 | — | — |

```json
{
  "data": {
    "message": {
      "id": "user-001",
      "version": 1,
      "createdAt": 1789430400000,
      "updatedAt": 1789430400000,
      "conversationId": "conversation-001",
      "position": 0,
      "role": "user",
      "body": "近くで休める場所を探して。",
      "status": "complete",
      "attempt": 1,
      "model": null,
      "errorCode": null,
      "insightId": null,
      "sourceRefs": []
    },
    "run": null,
    "output": null
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-03-09"></a>

## 03-09 AI取消

`POST /api/v1/messages/{messageId}/cancel`

権限：本人。保存先・更新範囲：messages。

If-Match→expectedVersion、attempt→expectedAttempt。pending/runningのみcancelledへ更新して取消信号を送る。completeは409。cancelledの応答喪失後はGETで確認する。古い試行はid/attempt/runningに一致せず保存しない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `messageId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `attempt` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

```json
{
  "attempt": 1
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Message](../schemas/models.md#message) | 必須 | — | — |

```json
{
  "data": {
    "id": "user-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "conversationId": "conversation-001",
    "position": 0,
    "role": "user",
    "body": "近くで休める場所を探して。",
    "status": "complete",
    "attempt": 1,
    "model": null,
    "errorCode": null,
    "insightId": null,
    "sourceRefs": []
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-03-10"></a>

## 03-10 AI再試行

`POST /api/v1/messages/{messageId}/retry`

権限：本人。保存先・更新範囲：messages。

If-Match→expectedVersion、attempt→expectedAttempt。failed/cancelledのみ。同じIDでattemptを1増やす。元のtext/input/model/promptVersionを再利用し、sourceRefsの版が変更済みなら409 SOURCE_CHANGEDで停止。新しい材料では新しい発言IDを使う。保存前にid/attempt/runningを照合。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `messageId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `attempt` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

```json
{
  "attempt": 1
}
```

### 成功応答

HTTP 202。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [RetryAccepted](../schemas/models.md#retryaccepted) | 必須 | — | — |

```json
{
  "data": {
    "message": {
      "id": "assistant-001",
      "version": 1,
      "createdAt": 1789430400000,
      "updatedAt": 1789430400000,
      "conversationId": "conversation-001",
      "position": 1,
      "role": "assistant",
      "body": "",
      "status": "pending",
      "attempt": 2,
      "model": null,
      "errorCode": null,
      "insightId": null,
      "sourceRefs": []
    },
    "statusUrl": "/api/v1/messages/assistant-001"
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 410 | `RESULT_EXPIRED` | 一時結果の期限切れ |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-03-11"></a>

## 03-11 街歩き相談

`POST /api/v1/map-dialogues`

権限：本人。保存先・更新範囲：なし。

runDialogue。本人・dataModeにつき同時1件。最大180秒、検索2回・経路3回・AI6回。起点固定。履歴は一時保持のみ。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `text` | string | 必須 | minLength=1、maxLength=300 | — |
| `origin` | [CommonAIOrigin](../schemas/models.md#commonaiorigin) | 必須 | — | — |

```json
{
  "text": "近くのカフェを探して",
  "origin": {
    "coordinates": [
      136.96,
      35.16
    ],
    "label": "地図の中心",
    "kind": "map-center"
  }
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [CommonAIDialogueResult](../schemas/models.md#commonaidialogueresult) | 必須 | — | — |

```json
{
  "data": {
    "resultId": "x",
    "text": "x",
    "places": [],
    "routes": [],
    "origin": {
      "coordinates": [
        0,
        0
      ],
      "label": "x",
      "kind": "current-location"
    },
    "expiresAt": 0
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 410 | `RESULT_EXPIRED` | 一時結果の期限切れ |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-03-12"></a>

## 03-12 街歩き候補の選択

`POST /api/v1/map-dialogues/select`

権限：本人。保存先・更新範囲：なし。

selectDialogueCandidate。本人・dataMode・期限・AI設定版・候補IDを照合。候補の位置と保存された起点で徒歩経路を返す。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `resultId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `candidateId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |

```json
{
  "resultId": "x",
  "candidateId": "x"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [CommonAIDialogueResult](../schemas/models.md#commonaidialogueresult) | 必須 | — | — |

```json
{
  "data": {
    "resultId": "x",
    "text": "x",
    "places": [],
    "routes": [],
    "origin": {
      "coordinates": [
        0,
        0
      ],
      "label": "x",
      "kind": "current-location"
    },
    "expiresAt": 0
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 410 | `RESULT_EXPIRED` | 一時結果の期限切れ |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-03-13"></a>

## 03-13 街歩き相談の取消

`POST /api/v1/map-dialogues/cancel`

権限：本人。保存先・更新範囲：なし。

cancelDialogue。active.requestIdが同じ本人の対象と一致すれば取消。取消済み・実行なしも204。新しい要求IDはヘッダーで区別。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `requestId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |

```json
{
  "requestId": "x"
}
```

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 410 | `RESULT_EXPIRED` | 一時結果の期限切れ |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-03-14"></a>

## 03-14 街歩き結果の再取得

`GET /api/v1/map-dialogues/results/{resultId}`

権限：本人。保存先・更新範囲：なし。

getDialogueResult。本人・dataMode・期限を検査。期限15分、本人ごとに直近6件。期限切れ・再起動後は410。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `resultId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [CommonAIDialogueResult](../schemas/models.md#commonaidialogueresult) | 必須 | — | — |

```json
{
  "data": {
    "resultId": "x",
    "text": "x",
    "places": [],
    "routes": [],
    "origin": {
      "coordinates": [
        0,
        0
      ],
      "label": "x",
      "kind": "current-location"
    },
    "expiresAt": 0
  }
}
```

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 410 | `RESULT_EXPIRED` | 一時結果の期限切れ |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |

