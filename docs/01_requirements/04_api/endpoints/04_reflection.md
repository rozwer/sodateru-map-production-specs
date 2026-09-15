# 振り返り・分析・テーマ

本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。

[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。全操作は本人識別Q01が前提。POSTの再送基盤Q02と操作固有の依存も[未確定事項](../conventions/03_open-questions.md)で確認する。

## 操作一覧

| ID | Method | パス | 操作 | 固有の未確定依存 |
|---|---|---|---|---|
| [04-01](#operation-04-01) | GET | `/reflection/days/{date}` | 日別振り返り | なし |
| [04-02](#operation-04-02) | GET | `/self-checkins` | SelfCheckin一覧 | なし |
| [04-03](#operation-04-03) | POST | `/self-checkins` | SelfCheckin作成 | なし |
| [04-04](#operation-04-04) | GET | `/self-checkins/{checkinId}` | SelfCheckin単体取得 | なし |
| [04-05](#operation-04-05) | PATCH | `/self-checkins/{checkinId}` | SelfCheckin編集 | なし |
| [04-06](#operation-04-06) | DELETE | `/self-checkins/{checkinId}` | SelfCheckin削除 | なし |
| [04-07](#operation-04-07) | GET | `/themes` | Theme一覧 | なし |
| [04-08](#operation-04-08) | POST | `/themes` | Theme作成 | なし |
| [04-09](#operation-04-09) | GET | `/themes/{themeId}` | Theme単体取得 | なし |
| [04-10](#operation-04-10) | PATCH | `/themes/{themeId}` | Theme編集 | なし |
| [04-11](#operation-04-11) | DELETE | `/themes/{themeId}` | Theme削除 | なし |
| [04-12](#operation-04-12) | GET | `/reflection/summary` | 期間集計 | Q05 |
| [04-13](#operation-04-13) | GET | `/insights` | 分析・比較一覧 | なし |
| [04-14](#operation-04-14) | GET | `/insights/{insightId}` | 分析・比較詳細 | なし |
| [04-15](#operation-04-15) | PATCH | `/insights/{insightId}` | 分析への判断・訂正 | なし |
| [04-16](#operation-04-16) | DELETE | `/insights/{insightId}` | 分析結果削除 | なし |
| [04-17](#operation-04-17) | POST | `/source-checks` | 根拠の現行内容と版を取得 | なし |
| [04-18](#operation-04-18) | POST | `/insights` | 期間集計の作成 | Q05 |
| [04-19](#operation-04-19) | POST | `/discovery-cards` | 発見カード保存 | なし |
| [04-20](#operation-04-20) | GET | `/discovery-cards` | 保存した発見一覧 | なし |
| [04-21](#operation-04-21) | GET | `/discovery-cards/{cardId}` | 発見カード詳細 | なし |
| [04-22](#operation-04-22) | DELETE | `/discovery-cards/{cardId}` | 発見カード削除 | なし |
| [04-23](#operation-04-23) | POST | `/discovery-cards/{cardId}/reactions` | 発見への反応 | なし |
| [04-24](#operation-04-24) | GET | `/discovery-cards/{cardId}/reactions` | 発見の反応履歴 | なし |
| [04-25](#operation-04-25) | GET | `/discovery-cards/{cardId}/reactions/{reactionId}` | 発見の反応取得 | なし |

<a id="operation-04-01"></a>

## 04-01 日別振り返り

`GET /api/v1/reflection/days/{date}`

権限：本人。保存先・更新範囲：なし。

dateの現地0時以上、翌日0時未満へ変換。visitsはstartedAt、recordsは実効開始日時、checkinsはlocalDateで取得。各領域の先頭50件とcursorを返し、対応一覧APIで続く。媒体は記録詳細または添付一覧から読む。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `date` | [Date](../schemas/models.md#date) | 必須 | —  |
| query | `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DailyReflection](../schemas/models.md#dailyreflection) | 必須 | — | — |

```json
{
  "data": {
    "date": "2026-09-15",
    "timeZone": "Asia/Tokyo",
    "from": 1789430400000,
    "to": 1789430400000,
    "visits": {
      "status": "ready",
      "data": {
        "items": [],
        "nextCursor": null
      }
    },
    "records": {
      "status": "ready",
      "data": {
        "items": [],
        "nextCursor": null
      }
    },
    "checkins": {
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



<a id="operation-04-02"></a>

## 04-02 SelfCheckin一覧

`GET /api/v1/self-checkins`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 dateはlocalDateと一致。

並び順：`localDate DESC, createdAt DESC, id DESC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `date` | [Date](../schemas/models.md#date) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[SelfCheckin](../schemas/models.md#selfcheckin)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-04-03"></a>

## 04-03 SelfCheckin作成

`POST /api/v1/self-checkins`

権限：本人。保存先・更新範囲：11_self_checkins。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。validUntilは作成日時より後。同じ時点の訂正は同じID、新しい回答は新ID。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `localDate` | [Date](../schemas/models.md#date) | 必須 | — | 対象日。YYYY-MM-DD |
| `answers` | [CheckinAnswers](../schemas/models.md#checkinanswers) | 必須 | — | 任意の状態・希望・時間・補足 |
| `validUntil` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 提案条件に使える期限 |

```json
{
  "id": "checkin-001",
  "localDate": "2026-09-15",
  "answers": {
    "state": "少し疲れている",
    "wishes": [
      "休みたい"
    ],
    "minutes": 20,
    "note": ""
  },
  "validUntil": 1789516800000
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SelfCheckin](../schemas/models.md#selfcheckin) | 必須 | — | — |

```json
{
  "data": {
    "id": "checkin-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "localDate": "2026-09-15",
    "answers": {
      "state": "少し疲れている",
      "wishes": [
        "休みたい"
      ],
      "minutes": 20,
      "note": ""
    },
    "validUntil": 1789516800000
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


<a id="operation-04-04"></a>

## 04-04 SelfCheckin単体取得

`GET /api/v1/self-checkins/{checkinId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `checkinId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SelfCheckin](../schemas/models.md#selfcheckin) | 必須 | — | — |

```json
{
  "data": {
    "id": "checkin-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "localDate": "2026-09-15",
    "answers": {
      "state": "少し疲れている",
      "wishes": [
        "休みたい"
      ],
      "minutes": 20,
      "note": ""
    },
    "validUntil": 1789516800000
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



<a id="operation-04-05"></a>

## 04-05 SelfCheckin編集

`PATCH /api/v1/self-checkins/{checkinId}`

権限：本人。保存先・更新範囲：11_self_checkins。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。validUntilは作成日時より後。同じ時点の訂正は同じID、新しい回答は新ID。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `checkinId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `localDate` | [Date](../schemas/models.md#date) | 省略可 | — | 対象日。YYYY-MM-DD |
| `answers` | [CheckinAnswers](../schemas/models.md#checkinanswers) | 省略可 | — | 任意の状態・希望・時間・補足 |
| `validUntil` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | — | 提案条件に使える期限 |

```json
{
  "localDate": "2026-09-15"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SelfCheckin](../schemas/models.md#selfcheckin) | 必須 | — | — |

```json
{
  "data": {
    "id": "checkin-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "localDate": "2026-09-15",
    "answers": {
      "state": "少し疲れている",
      "wishes": [
        "休みたい"
      ],
      "minutes": 20,
      "note": ""
    },
    "validUntil": 1789516800000
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



<a id="operation-04-06"></a>

## 04-06 SelfCheckin削除

`DELETE /api/v1/self-checkins/{checkinId}`

権限：本人。保存先・更新範囲：11_self_checkins。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。提案のcheckinIdをnullにする。依存結果は根拠照合で無効化。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `checkinId` | [Id](../schemas/models.md#id) | 必須 | —  |
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



<a id="operation-04-07"></a>

## 04-07 Theme一覧

`GET /api/v1/themes`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`updatedAt DESC, id DESC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Theme](../schemas/models.md#theme)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-04-08"></a>

## 04-08 Theme作成

`POST /api/v1/themes`

権限：本人。保存先・更新範囲：13_themes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。recordIdsは本人の記録のみで一意。一度の編集で全配列を更新。記録自体の削除はしない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `name` | string | 必須 | minLength=1、maxLength=200 | テーマ名 |
| `description` | string | 必須 | minLength=0、maxLength=10000 | 説明 |
| `recordIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | テーマに含める記録ID |

```json
{
  "id": "record-001",
  "name": "本山のカフェ",
  "description": "x",
  "recordIds": []
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Theme](../schemas/models.md#theme) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "name": "本山のカフェ",
    "description": "x",
    "recordIds": []
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


<a id="operation-04-09"></a>

## 04-09 Theme単体取得

`GET /api/v1/themes/{themeId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `themeId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Theme](../schemas/models.md#theme) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "name": "本山のカフェ",
    "description": "x",
    "recordIds": []
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



<a id="operation-04-10"></a>

## 04-10 Theme編集

`PATCH /api/v1/themes/{themeId}`

権限：本人。保存先・更新範囲：13_themes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。recordIdsは本人の記録のみで一意。一度の編集で全配列を更新。記録自体の削除はしない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `themeId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | minLength=1、maxLength=200 | テーマ名 |
| `description` | string | 省略可 | minLength=0、maxLength=10000 | 説明 |
| `recordIds` | 配列<[Id](../schemas/models.md#id)> | 省略可 | minItems=0、maxItems=1000、uniqueItems=True | テーマに含める記録ID |

```json
{
  "name": "本山のカフェ"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Theme](../schemas/models.md#theme) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "name": "本山のカフェ",
    "description": "x",
    "recordIds": []
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



<a id="operation-04-11"></a>

## 04-11 Theme削除

`DELETE /api/v1/themes/{themeId}`

権限：本人。保存先・更新範囲：13_themes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。含まれるrecordsは保持。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `themeId` | [Id](../schemas/models.md#id) | 必須 | —  |
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



<a id="operation-04-12"></a>

## 04-12 期間集計

`GET /api/v1/reflection/summary`

権限：本人。保存先・更新範囲：なし。

from<to。IANA timezoneで日付を区切る。分子≦分母、分母0ならvalue=null。各軸の判定規則と同日の回答重複時の集約はQ05。

未確定依存：Q05。この部分は型だけで実装完了とは判断できない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 必須 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 必須 | —  |
| query | `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Summary](../schemas/models.md#summary) | 必須 | — | — |

```json
{
  "data": {
    "from": 1789430400000,
    "to": 1789516800000,
    "timeZone": "Asia/Tokyo",
    "result": {
      "axes": [
        {
          "key": "rest",
          "numerator": 1,
          "denominator": 1,
          "value": 1,
          "unknownDays": 0
        }
      ],
      "unknown": []
    },
    "sourceRefs": [
      {
        "type": "record",
        "id": "record-001",
        "version": 1
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



<a id="operation-04-13"></a>

## 04-13 分析・比較一覧

`GET /api/v1/insights`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 from/toはcreatedAtへ適用。

並び順：`createdAt DESC, id DESC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `kind` | analysis / comparison | 省略可 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Insight](../schemas/models.md#insight)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-04-14"></a>

## 04-14 分析・比較詳細

`GET /api/v1/insights/{insightId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。 元の入力版が変更済みなら409 INPUT_CHANGED、削除・非公開化なら404。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `insightId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Insight](../schemas/models.md#insight) | 必須 | — | — |

```json
{
  "data": {
    "id": "insight-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "kind": "analysis",
    "inputKey": "sample-input-key",
    "sourceRefs": [],
    "rangeStart": 1789430400000,
    "rangeEnd": 1789516800000,
    "timeZone": "Asia/Tokyo",
    "generatorVersion": "analysis-v1",
    "model": null,
    "summary": "休息を記録した日は1日です。",
    "result": {
      "axes": [
        {
          "key": "rest",
          "numerator": 1,
          "denominator": 1,
          "value": 1,
          "unknownDays": 0
        }
      ],
      "unknown": []
    },
    "review": null,
    "reviewNote": null,
    "reviewedAt": null
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
| 409 | `INPUT_CHANGED` | 現在状態と操作が競合 |



<a id="operation-04-15"></a>

## 04-15 分析への判断・訂正

`PATCH /api/v1/insights/{insightId}`

権限：本人。保存先・更新範囲：insights。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。 review非nullならreviewedAtをサーバー時刻へ。review=nullならreviewNote/reviewedAtもnull。判断は同じ結果IDへ保存し元の記録を変更しない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `insightId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `review` | agree / disagree / unsure / edit または null | 省略可 | — |  |
| `reviewNote` | string または null | 省略可 | — | 判断・訂正の原文 |

```json
{
  "review": null
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Insight](../schemas/models.md#insight) | 必須 | — | — |

```json
{
  "data": {
    "id": "insight-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "kind": "analysis",
    "inputKey": "sample-input-key",
    "sourceRefs": [],
    "rangeStart": 1789430400000,
    "rangeEnd": 1789516800000,
    "timeZone": "Asia/Tokyo",
    "generatorVersion": "analysis-v1",
    "model": null,
    "summary": "休息を記録した日は1日です。",
    "result": {
      "axes": [
        {
          "key": "rest",
          "numerator": 1,
          "denominator": 1,
          "value": 1,
          "unknownDays": 0
        }
      ],
      "unknown": []
    },
    "review": null,
    "reviewNote": null,
    "reviewedAt": null
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



<a id="operation-04-16"></a>

## 04-16 分析結果削除

`DELETE /api/v1/insights/{insightId}`

権限：本人。保存先・更新範囲：insights削除、messagesの参照解除。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。 messages.insightIdをnullにする。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `insightId` | [Id](../schemas/models.md#id) | 必須 | —  |
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



<a id="operation-04-17"></a>

## 04-17 根拠の現行内容と版を取得

`POST /api/v1/source-checks`

権限：各対象の現在の閲覧権限。保存先・更新範囲：なし。

共通checkSourcesへrefsを渡し入力順で{ref,state,currentVersion}をdata配列へ返す。state=current/changed/unavailable。unavailableは削除と権限なしを区別せずcurrentVersion=null。本文は返さない。共有recordと同じ要求にある関連visitは版照合だけ許可し、訪問の直接読出し権限を広げない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `refs` | 配列<[CommonInfoSourceRef](../schemas/models.md#commoninfosourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |

```json
{
  "refs": []
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SourceLookup](../schemas/models.md#sourcelookup) | 必須 | — | — |

```json
{
  "data": []
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


<a id="operation-04-18"></a>

## 04-18 期間集計の作成

`POST /api/v1/insights`

権限：本人。保存先・更新範囲：insights。

本人の期間集計を行いkind=analysis、model=nullでaxes・sourceRefs・inputKey・generatorVersionを保存する。既存同一inputKeyなら200で既存の判断を保持。AI説明が必要なら返却insightIdをanalysisの入力へ渡す。軸の判定規則はQ05。

未確定依存：Q05。この部分は型だけで実装完了とは判断できない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `from` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `to` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | — | — |

```json
{
  "id": "record-001",
  "from": 1789430400000,
  "to": 1789430400000,
  "timeZone": "Asia/Tokyo"
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Insight](../schemas/models.md#insight) | 必須 | — | — |

```json
{
  "data": {
    "id": "insight-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "person-001",
    "kind": "analysis",
    "inputKey": "sample-input-key",
    "sourceRefs": [],
    "rangeStart": 1789430400000,
    "rangeEnd": 1789516800000,
    "timeZone": "Asia/Tokyo",
    "generatorVersion": "analysis-v1",
    "model": null,
    "summary": "休息を記録した日は1日です。",
    "result": {
      "axes": [
        {
          "key": "rest",
          "numerator": 1,
          "denominator": 1,
          "value": 1,
          "unknownDays": 0
        }
      ],
      "unknown": []
    },
    "review": null,
    "reviewNote": null,
    "reviewedAt": null
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


<a id="operation-04-19"></a>

## 04-19 発見カード保存

`POST /api/v1/discovery-cards`

権限：本人。保存先・更新範囲：discovery_cards、messages.applied_refs_json。

本人のcompleteなdiscover実行とattemptを検査しresult_jsonとsourceRefsをコピー。要求本文に説明や出典を受け付けない。生成の根拠を再照合しdiscovery_cardsへ保存、applied_refs_jsonを同一トランザクションで追記。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `expectedAttempt` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

```json
{
  "id": "record-001",
  "assistantMessageId": "record-001",
  "expectedAttempt": 1
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DiscoveryCard](../schemas/models.md#discoverycard) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "personId": "record-001",
    "anchor": {
      "kind": "place",
      "targetId": "x",
      "features": [
        "x"
      ]
    },
    "bridge": "x",
    "knowledge": "x",
    "observationPrompt": "x",
    "conceptIds": [],
    "sources": [],
    "sourceRefs": [],
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000
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


<a id="operation-04-20"></a>

## 04-20 保存した発見一覧

`GET /api/v1/discovery-cards`

権限：本人。保存先・更新範囲：なし。

本人のカードのみ。savedOnly=trueは各カードの最新のsaved/blocked/dismissedがsavedのもの。createdAt同値では反応ID ASCの最後を採用。known/interestedは保存表示に影響しない。sourceRefsを再照合。

並び順：`createdAt DESC, id DESC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `savedOnly` | boolean | 省略可 | default=False  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[DiscoveryCard](../schemas/models.md#discoverycard)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-04-21"></a>

## 04-21 発見カード詳細

`GET /api/v1/discovery-cards/{cardId}`

権限：本人。保存先・更新範囲：なし。

本人のみ。sourceRefsの版・現在権限を照合し変更済みなら409 SOURCE_CHANGED、閲覧不可なら404。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DiscoveryCard](../schemas/models.md#discoverycard) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "personId": "record-001",
    "anchor": {
      "kind": "place",
      "targetId": "x",
      "features": [
        "x"
      ]
    },
    "bridge": "x",
    "knowledge": "x",
    "observationPrompt": "x",
    "conceptIds": [],
    "sources": [],
    "sourceRefs": [],
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000
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



<a id="operation-04-22"></a>

## 04-22 発見カード削除

`DELETE /api/v1/discovery-cards/{cardId}`

権限：本人。保存先・更新範囲：discovery_cards、discovery_reactions。

本人と版を照合しカードと反応を削除。元の生成発言は保持。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |
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



<a id="operation-04-23"></a>

## 04-23 発見への反応

`POST /api/v1/discovery-cards/{cardId}/reactions`

権限：本人。保存先・更新範囲：discovery_reactions。

本人のカードへ固定IDで反応を保存。同じ反応ID・同じ内容は既存反応を返す。違う内容は409。保存一覧への作用は共通の発見保存規約。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `reaction` | known / interested / saved / blocked / dismissed | 必須 | — | — |

```json
{
  "id": "record-001",
  "reaction": "known"
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DiscoveryReaction](../schemas/models.md#discoveryreaction) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "personId": "record-001",
    "cardId": "record-001",
    "reaction": "known",
    "createdAt": 1789430400000
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


<a id="operation-04-24"></a>

## 04-24 発見の反応履歴

`GET /api/v1/discovery-cards/{cardId}/reactions`

権限：本人。保存先・更新範囲：なし。

本人のカードの反応を時刻降順、同時刻はID降順で取得。保存表示は最新のsaved/blocked/dismissedだけを判定に使う。

並び順：`createdAt DESC, id DESC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[DiscoveryReaction](../schemas/models.md#discoveryreaction)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-04-25"></a>

## 04-25 発見の反応取得

`GET /api/v1/discovery-cards/{cardId}/reactions/{reactionId}`

権限：本人。保存先・更新範囲：なし。

本人・cardId・reactionIdの対応を確認して返す。他人または別カードなら404。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |
| path | `reactionId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DiscoveryReaction](../schemas/models.md#discoveryreaction) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "personId": "record-001",
    "cardId": "record-001",
    "reaction": "known",
    "createdAt": 1789430400000
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

