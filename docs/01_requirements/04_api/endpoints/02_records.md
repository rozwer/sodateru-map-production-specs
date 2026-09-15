# 訪問・記録・媒体

本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。

[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。全操作は本人識別Q01が前提。POSTの再送基盤Q02と操作固有の依存も[未確定事項](../conventions/03_open-questions.md)で確認する。

## 操作一覧

| ID | Method | パス | 操作 | 固有の未確定依存 |
|---|---|---|---|---|
| [02-01](#operation-02-01) | GET | `/visits` | 訪問一覧 | なし |
| [02-02](#operation-02-02) | POST | `/visits` | 訪問候補登録 | なし |
| [02-03](#operation-02-03) | GET | `/visits/{visitId}` | 訪問単体取得 | なし |
| [02-04](#operation-02-04) | PATCH | `/visits/{visitId}` | 訪問確認・訂正・否定 | なし |
| [02-05](#operation-02-05) | DELETE | `/visits/{visitId}` | 訪問削除 | なし |
| [02-06](#operation-02-06) | GET | `/records` | 本人記録一覧 | なし |
| [02-07](#operation-02-07) | POST | `/records` | 記録保存 | なし |
| [02-08](#operation-02-08) | GET | `/records/{recordId}` | 記録詳細 | なし |
| [02-09](#operation-02-09) | PATCH | `/records/{recordId}` | 記録編集・共有変更 | なし |
| [02-10](#operation-02-10) | DELETE | `/records/{recordId}` | 記録削除 | なし |
| [02-11](#operation-02-11) | GET | `/records/{recordId}/media` | 添付一覧 | なし |
| [02-12](#operation-02-12) | POST | `/records/{recordId}/media` | 媒体添付 | なし |
| [02-13](#operation-02-13) | POST | `/records/{recordId}/media/reorder` | 添付順序の一括変更 | なし |
| [02-14](#operation-02-14) | GET | `/media/{mediaId}` | 媒体情報 | なし |
| [02-15](#operation-02-15) | GET | `/media/{mediaId}/content` | 媒体実体 | なし |
| [02-16](#operation-02-16) | DELETE | `/media/{mediaId}` | 添付削除 | なし |
| [02-17](#operation-02-17) | GET | `/track-points` | 位置観測一覧 | なし |
| [02-18](#operation-02-18) | POST | `/track-points` | 位置観測一括追加 | なし |
| [02-19](#operation-02-19) | GET | `/track-points/{pointId}` | 位置観測単体取得 | なし |
| [02-20](#operation-02-20) | POST | `/track-points/delete-range` | 位置観測の選択区間削除 | なし |

<a id="operation-02-01"></a>

## 02-01 訪問一覧

`GET /api/v1/visits`

権限：本人。保存先・更新範囲：なし。

cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 時間条件はstartedAtへ適用し、nullは期間指定時に除外する。

並び順：`startedAt DESC NULLS LAST, id DESC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `placeId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `status` | candidate / confirmed / rejected | 省略可 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Visit](../schemas/models.md#visit)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-02-02"></a>

## 02-02 訪問候補登録

`POST /api/v1/visits`

権限：本人。保存先・更新範囲：visits。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。startedAtとendedAtは終了が開始以上。unknownは両方null。終了のみの指定不可。 status=candidateをサーバーが設定。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 訪問した場所 |
| `placeId` | [Id](../schemas/models.md#id) | 必須 | — | 訪問した場所 |
| `startedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 訪問の開始日時 |
| `endedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 終了日時 |
| `timePrecision` | exact / approximate / unknown | 必須 | — |  |
| `origin` | manual / gps | 必須 | — | 訪問の入力元 |

```json
{
  "id": "visit-001",
  "placeId": "place-001",
  "startedAt": 1789430400000,
  "endedAt": 1789434000000,
  "timePrecision": "exact",
  "origin": "manual"
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Visit](../schemas/models.md#visit) | 必須 | — | — |

```json
{
  "data": {
    "id": "visit-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "placeId": "place-001",
    "startedAt": 1789430400000,
    "endedAt": 1789434000000,
    "timePrecision": "exact",
    "origin": "manual",
    "status": "confirmed"
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
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-02-03"></a>

## 02-03 訪問単体取得

`GET /api/v1/visits/{visitId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `visitId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Visit](../schemas/models.md#visit) | 必須 | — | — |

```json
{
  "data": {
    "id": "visit-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "placeId": "place-001",
    "startedAt": 1789430400000,
    "endedAt": 1789434000000,
    "timePrecision": "exact",
    "origin": "manual",
    "status": "confirmed"
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



<a id="operation-02-04"></a>

## 02-04 訪問確認・訂正・否定

`PATCH /api/v1/visits/{visitId}`

権限：本人。保存先・更新範囲：visitsと該当suggestionsを同一トランザクションで更新。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。startedAtとendedAtは終了が開始以上。unknownは両方null。終了のみの指定不可。 candidate/confirmed/rejected間の本人操作による遷移を許す。confirmedでなくなった場合、または提案先と場所が一致しなくなった場合は参照提案をselectedへ戻しcompletedVisitId=null。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `visitId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `placeId` | [Id](../schemas/models.md#id) | 省略可 | — | 訪問した場所 |
| `startedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 省略可 | — | 訪問の開始日時 |
| `endedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 省略可 | — | 終了日時 |
| `timePrecision` | exact / approximate / unknown | 省略可 | — |  |
| `status` | candidate / confirmed / rejected | 省略可 | — |  |

```json
{
  "placeId": "record-001"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Visit](../schemas/models.md#visit) | 必須 | — | — |

```json
{
  "data": {
    "id": "visit-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "placeId": "place-001",
    "startedAt": 1789430400000,
    "endedAt": 1789434000000,
    "timePrecision": "exact",
    "origin": "manual",
    "status": "confirmed"
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
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |



<a id="operation-02-05"></a>

## 02-05 訪問削除

`DELETE /api/v1/visits/{visitId}`

権限：本人。保存先・更新範囲：visits削除、関連recordsとsuggestionsの更新。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。 記録のvisitIdをnullにし、直接の場所・日時は未指定のまま本文を残す。達成提案はselectedへ戻す。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `visitId` | [Id](../schemas/models.md#id) | 必須 | —  |
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
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |



<a id="operation-02-06"></a>

## 02-06 本人記録一覧

`GET /api/v1/records`

権限：本人。保存先・更新範囲：なし。

本人の記録だけ。共通RecordQueryと同じ期間重なり条件を使いfrom/to/timeZoneを一組で指定。日時不明は期間なし、またはincludeUndated=trueなら含む。placeIdは実効場所、themeIdは本人テーマの所属でAND。返却は編集用RecordView。

並び順：`effectiveStartedAt DESC NULLS LAST, id ASC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `placeId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `themeId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `kind` | experience / diary / memo | 省略可 | —  |
| query | `timeZone` | [TimeZone](../schemas/models.md#timezone) | 省略可 | —  |
| query | `includeUndated` | boolean | 省略可 | default=False  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[RecordView](../schemas/models.md#recordview)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-02-07"></a>

## 02-07 記録保存

`POST /api/v1/records`

権限：本人。保存先・更新範囲：records。

visitIdありならkind=experience、placeId/occurredAt/endedAt=null、timePrecision=unknown。同じ本人の訪問だけ参照する。visitIdなしでは直接場所・日時を使う。 occurredAt/endedAtは終了≧開始、unknownは両方null。終了のみは不可。visibility=selectedはsharedWithが1人以上。private/publicは空配列。人物の存在と重複を検査する。 activities.idは記録内一意。希望不明ならpurpose/satisfaction=null。サーバーはAI出力を勝手に反映しない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `kind` | experience / diary / memo | 必須 | — | 記録の種類 |
| `visitId` | [Id](../schemas/models.md#id) または null | 必須 | — | 関連する訪問 |
| `placeId` | [Id](../schemas/models.md#id) または null | 必須 | — | 訪問を伴わず場所に付けた記録の関連先 |
| `occurredAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 体験・日記の対象日時。不明はNULL |
| `endedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 終了日時。不明はNULL |
| `timePrecision` | exact / approximate / unknown | 必須 | — | 日時の精度 |
| `body` | string | 必須 | minLength=0、maxLength=20000 | 入力した本文。媒体だけの記録は空文字 |
| `purposes` | 配列<string> | 必須 | minItems=0、maxItems=20 | この場所での用途 |
| `activities` | 配列<[Activity](../schemas/models.md#activity)> | 必須 | minItems=0、maxItems=100 | 実際にした活動と、その活動ごとの結果 |
| `impression` | string | 必須 | minLength=0、maxLength=4000 | 体験全体の感想 |
| `periodAnswers` | [PeriodAnswers](../schemas/models.md#periodanswers) | 必須 | — | 期間集計に使う任意の確認項目 |
| `bookmarked` | boolean | 必須 | — | 提案でこの記録を参照する設定 |
| `useForSuggestions` | boolean | 必須 | — | 提案でこの記録を参照する設定 |
| `topicKey` | string または null | 必須 | — | 地域投稿の話題キー。通常記録はNULL |
| `visibility` | private / selected / public | 必須 | — | 表示する範囲 |
| `sharedWith` | 配列<[Id](../schemas/models.md#id)> | 必須 | minItems=0、maxItems=100、uniqueItems=True | selectedで共有する人物IDの配列 |

```json
{
  "id": "record-001",
  "kind": "experience",
  "visitId": null,
  "placeId": "place-001",
  "occurredAt": 1789430400000,
  "endedAt": 1789434000000,
  "timePrecision": "exact",
  "body": "本を読んで過ごした。",
  "purposes": [
    "読書"
  ],
  "activities": [],
  "impression": "落ち着けた。",
  "periodAnswers": {},
  "bookmarked": false,
  "useForSuggestions": false,
  "topicKey": null,
  "visibility": "private",
  "sharedWith": []
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [RecordView](../schemas/models.md#recordview) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "kind": "experience",
    "visitId": null,
    "placeId": "place-001",
    "occurredAt": 1789430400000,
    "endedAt": 1789434000000,
    "timePrecision": "exact",
    "body": "本を読んで過ごした。",
    "purposes": [
      "読書"
    ],
    "activities": [],
    "impression": "落ち着けた。",
    "periodAnswers": {},
    "bookmarked": false,
    "useForSuggestions": false,
    "topicKey": null,
    "visibility": "private",
    "sharedWith": [],
    "effectivePlaceId": "place-001",
    "effectiveStartedAt": 1789430400000,
    "effectiveEndedAt": 1789434000000,
    "effectiveTimePrecision": "exact"
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
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-02-08"></a>

## 02-08 記録詳細

`GET /api/v1/records/{recordId}`

権限：本人または現在の共有先・公開閲覧者。保存先・更新範囲：なし。

visitIdありならkind=experience、placeId/occurredAt/endedAt=null、timePrecision=unknown。同じ本人の訪問だけ参照する。visitIdなしでは直接場所・日時を使う。 読めない記録は404。媒体一覧は記録IDに属する媒体だけをposition ASC,id ASCで返す。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `recordId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [RecordDetail](../schemas/models.md#recorddetail) | 必須 | — | — |

```json
{
  "data": {
    "record": {
      "id": "record-001",
      "version": 1,
      "createdAt": 1789430400000,
      "updatedAt": 1789430400000,
      "personId": "person-001",
      "kind": "experience",
      "visitId": null,
      "placeId": "place-001",
      "occurredAt": 1789430400000,
      "endedAt": 1789434000000,
      "timePrecision": "exact",
      "body": "本を読んで過ごした。",
      "purposes": [
        "読書"
      ],
      "activities": [],
      "impression": "落ち着けた。",
      "periodAnswers": {},
      "bookmarked": false,
      "useForSuggestions": false,
      "topicKey": null,
      "visibility": "private",
      "sharedWith": [],
      "effectivePlaceId": "place-001",
      "effectiveStartedAt": 1789430400000,
      "effectiveEndedAt": 1789434000000,
      "effectiveTimePrecision": "exact"
    },
    "media": {
      "status": "ready",
      "data": {
        "items": [],
        "nextCursor": null
      }
    }
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



<a id="operation-02-09"></a>

## 02-09 記録編集・共有変更

`PATCH /api/v1/records/{recordId}`

権限：本人。保存先・更新範囲：records。

visitIdありならkind=experience、placeId/occurredAt/endedAt=null、timePrecision=unknown。同じ本人の訪問だけ参照する。visitIdなしでは直接場所・日時を使う。 occurredAt/endedAtは終了≧開始、unknownは両方null。終了のみは不可。visibility=selectedはsharedWithが1人以上。private/publicは空配列。人物の存在と重複を検査する。 省略値は保持し、変更後の全体へ制約を適用。本文の編集とAI案の採用は本人の送信項目だけを反映。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `recordId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `visitId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 関連する訪問 |
| `placeId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 訪問を伴わず場所に付けた記録の関連先 |
| `occurredAt` | [Timestamp](../schemas/models.md#timestamp) または null | 省略可 | — | 体験・日記の対象日時。不明はNULL |
| `endedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 省略可 | — | 終了日時。不明はNULL |
| `timePrecision` | exact / approximate / unknown | 省略可 | — | 日時の精度 |
| `body` | string | 省略可 | minLength=0、maxLength=20000 | 入力した本文。媒体だけの記録は空文字 |
| `purposes` | 配列<string> | 省略可 | minItems=0、maxItems=20 | この場所での用途 |
| `activities` | 配列<[Activity](../schemas/models.md#activity)> | 省略可 | minItems=0、maxItems=100 | 実際にした活動と、その活動ごとの結果 |
| `impression` | string | 省略可 | minLength=0、maxLength=4000 | 体験全体の感想 |
| `periodAnswers` | [PeriodAnswers](../schemas/models.md#periodanswers) | 省略可 | — | 期間集計に使う任意の確認項目 |
| `bookmarked` | boolean | 省略可 | — | 提案でこの記録を参照する設定 |
| `useForSuggestions` | boolean | 省略可 | — | 提案でこの記録を参照する設定 |
| `topicKey` | string または null | 省略可 | — | 地域投稿の話題キー。通常記録はNULL |
| `visibility` | private / selected / public | 省略可 | — | 表示する範囲 |
| `sharedWith` | 配列<[Id](../schemas/models.md#id)> | 省略可 | minItems=0、maxItems=100、uniqueItems=True | selectedで共有する人物IDの配列 |

```json
{
  "body": "本を読んだ後、友人と話した。",
  "impression": "気分転換になった。"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [RecordView](../schemas/models.md#recordview) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "kind": "experience",
    "visitId": null,
    "placeId": "place-001",
    "occurredAt": 1789430400000,
    "endedAt": 1789434000000,
    "timePrecision": "exact",
    "body": "本を読んで過ごした。",
    "purposes": [
      "読書"
    ],
    "activities": [],
    "impression": "落ち着けた。",
    "periodAnswers": {},
    "bookmarked": false,
    "useForSuggestions": false,
    "topicKey": null,
    "visibility": "private",
    "sharedWith": [],
    "effectivePlaceId": "place-001",
    "effectiveStartedAt": 1789430400000,
    "effectiveEndedAt": 1789434000000,
    "effectiveTimePrecision": "exact"
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
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |



<a id="operation-02-10"></a>

## 02-10 記録削除

`DELETE /api/v1/records/{recordId}`

権限：本人。保存先・更新範囲：records、media削除、themes更新。

本文・添付media・全themesの所属IDを削除。visitsは保持。依存する生成結果は以後表示しない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `recordId` | [Id](../schemas/models.md#id) | 必須 | —  |
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
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |



<a id="operation-02-11"></a>

## 02-11 添付一覧

`GET /api/v1/records/{recordId}/media`

権限：親記録の閲覧可能者。保存先・更新範囲：なし。

親記録の閲覧権限を検査。ready/failed/pendingを返すが実体の表示はreadyだけ。

並び順：`position ASC, id ASC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `recordId` | [Id](../schemas/models.md#id) | 必須 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Media](../schemas/models.md#media)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-02-12"></a>

## 02-12 媒体添付

`POST /api/v1/records/{recordId}/media`

権限：本人。保存先・更新範囲：media、records.version、媒体ファイル。

If-Matchは親記録の版。MIMEを内容で検証し1ファイル最大50 MiB。JPEG/PNG/WebPはphoto、MP4はvideo、MPEG/MP4/WAV音声はaudio。保存済みpositionは409。ファイル保存後に親の版を再検査しmedia追加と親の版増加を原子的に行う。失敗時は未参照実体を清掃。 親記録の媒体が既に100件なら422。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `recordId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `file` | string (binary) | 必須 | — | — |
| `position` | integer | 必須 | minimum=0、maximum=99 | — |

multipartのfileパートへ実体を渡す。id/positionはフォーム文字列をSchemaの型へ変換して検査する。

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Media](../schemas/models.md#media) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "recordId": "record-001",
    "kind": "photo",
    "mimeType": "image/jpeg",
    "byteSize": 1,
    "position": 0,
    "status": "pending",
    "contentUrl": null
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
| 413 | `PAYLOAD_TOO_LARGE` | 本文・ファイルが上限超過 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 媒体形式が対象外 |
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-02-13"></a>

## 02-13 添付順序の一括変更

`POST /api/v1/records/{recordId}/media/reorder`

権限：本人。保存先・更新範囲：mediaのposition/version、親records.version。

If-Matchは親記録。itemsは現在の全媒体ID・版を漏れなく各1回指定。配列順をposition=0から採用し一意制約を一括更新。版不一致は412で全件変更しない。最大100件を返し、続きは添付一覧。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `recordId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<object> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |

`items` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |


```json
{
  "items": []
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Media](../schemas/models.md#media)> | 必須 | minItems=0、maxItems=100 | — |
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
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-02-14"></a>

## 02-14 媒体情報

`GET /api/v1/media/{mediaId}`

権限：親記録の閲覧可能者。保存先・更新範囲：なし。

親記録の閲覧権限を確認。storageKeyは返さずcontentUrlを返す。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `mediaId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Media](../schemas/models.md#media) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "recordId": "record-001",
    "kind": "photo",
    "mimeType": "image/jpeg",
    "byteSize": 1,
    "position": 0,
    "status": "pending",
    "contentUrl": null
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



<a id="operation-02-15"></a>

## 02-15 媒体実体

`GET /api/v1/media/{mediaId}/content`

権限：親記録の閲覧可能者。保存先・更新範囲：なし。

親記録の現在権限を毎要求検査。pendingは409、failed/ファイルなしは503。readyの実体をContent-TypeとContent-Length付きで返す。単一bytes Rangeは206+Content-Range、範囲外と複数Rangeは416。実パスが媒体ルート外なら配信しない。Cache-Control: private, no-store、Content-Disposition: inline。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `mediaId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |
| header | `Range` | string | 省略可 | minLength=1、maxLength=200 単一bytes範囲。複数・不正・範囲外は416。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

単一Rangeの成功は206、Content-RangeとContent-Lengthを返す。

string (binary)。—

本文は実体バイト列、Content-Typeは検証済みMIME。

### 失敗応答

[ErrorEnvelope](../schemas/models.md#errorenvelope)を返す。

| HTTP | code | 条件 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 要求形式が不正 |
| 401 | `UNAUTHENTICATED` | 本人を確認できない |
| 403 | `FORBIDDEN` | 操作権限なし |
| 404 | `NOT_FOUND` | 対象なし、または存在を開示しない |
| 500 | `INTERNAL_ERROR` | 予期しない失敗 |
| 409 | `NOT_READY` | 現在状態と操作が競合 |
| 416 | `RANGE_NOT_SATISFIABLE` | Range指定が範囲外または複数 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |



<a id="operation-02-16"></a>

## 02-16 添付削除

`DELETE /api/v1/media/{mediaId}`

権限：本人。保存先・更新範囲：media削除、records.version更新。

If-Matchはmediaの版。親記録の所有者だけが削除。親版も増加し未参照実体を清掃。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `mediaId` | [Id](../schemas/models.md#id) | 必須 | —  |
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
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |



<a id="operation-02-17"></a>

## 02-17 位置観測一覧

`GET /api/v1/track-points`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 from/toはobservedAtへ適用。

並び順：`observedAt ASC, id ASC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `segmentId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[TrackPoint](../schemas/models.md#trackpoint)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-02-18"></a>

## 02-18 位置観測一括追加

`POST /api/v1/track-points`

権限：本人。保存先・更新範囲：track_points。

人物とsourcePointIdの組で同一観測へ収束。既存と観測内容が同じなら既存ID、異なるなら409で全体rollback。検査・保存は全件一括。観測を訪問確認へ自動変換しない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[TrackPointCreate](../schemas/models.md#trackpointcreate)> | 必須 | minItems=1、maxItems=1000 | — |

```json
{
  "items": [
    {
      "id": "record-001",
      "segmentId": "record-001",
      "sourcePointId": "record-001",
      "observedAt": 1789430400000,
      "longitude": 0,
      "latitude": 0,
      "accuracyM": 0
    }
  ]
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | object | 必須 | — | — |

`data` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[TrackPoint](../schemas/models.md#trackpoint)> | 必須 | minItems=1、maxItems=1000 | — |


```json
{
  "data": {
    "items": [
      {
        "id": "record-001",
        "version": 1,
        "createdAt": 1789430400000,
        "updatedAt": 1789430400000,
        "personId": "record-001",
        "segmentId": "record-001",
        "sourcePointId": "record-001",
        "observedAt": 1789430400000,
        "longitude": 0,
        "latitude": 0,
        "accuracyM": 0
      }
    ]
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
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-02-19"></a>

## 02-19 位置観測単体取得

`GET /api/v1/track-points/{pointId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `pointId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [TrackPoint](../schemas/models.md#trackpoint) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "segmentId": "record-001",
    "sourcePointId": "record-001",
    "observedAt": 1789430400000,
    "longitude": 0,
    "latitude": 0,
    "accuracyM": 0
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



<a id="operation-02-20"></a>

## 02-20 位置観測の選択区間削除

`POST /api/v1/track-points/delete-range`

権限：本人。保存先・更新範囲：指定track_points削除。

from<to。targetsは同じ本人で期間内、segmentId非nullなら同区間。全ID・版を照合し不一致は412で全体rollback。送信後に追加された未指定点は削除しない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `segmentId` | [Id](../schemas/models.md#id) または null | 必須 | — | — |
| `from` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `to` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `targets` | 配列<[VersionedId](../schemas/models.md#versionedid)> | 必須 | minItems=1、maxItems=1000、uniqueItems=True | — |

```json
{
  "segmentId": "segment-001",
  "from": 1789430400000,
  "to": 1789434000000,
  "targets": [
    {
      "id": "point-001",
      "version": 1
    }
  ]
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DeletedCount](../schemas/models.md#deletedcount) | 必須 | — | — |

```json
{
  "data": {
    "deletedCount": 0
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
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。
