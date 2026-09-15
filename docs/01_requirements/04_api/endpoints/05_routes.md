# 提案・経路

本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。

[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。全操作は本人識別Q01が前提。POSTの再送基盤Q02と操作固有の依存も[未確定事項](../conventions/03_open-questions.md)で確認する。

## 操作一覧

| ID | Method | パス | 操作 | 固有の未確定依存 |
|---|---|---|---|---|
| [05-01](#operation-05-01) | POST | `/suggestion-batches` | 提案候補生成 | Q05 |
| [05-02](#operation-05-02) | GET | `/suggestions` | 提案一覧 | なし |
| [05-03](#operation-05-03) | GET | `/suggestions/{suggestionId}` | 提案詳細 | なし |
| [05-04](#operation-05-04) | PATCH | `/suggestions/{suggestionId}` | 提案の提示・選択・達成 | なし |
| [05-05](#operation-05-05) | POST | `/route-searches` | 経路取得 | なし |
| [05-06](#operation-05-06) | GET | `/saved-routes` | 本人の保存ルート一覧 | なし |
| [05-07](#operation-05-07) | POST | `/saved-routes` | ルート保存 | なし |
| [05-08](#operation-05-08) | GET | `/saved-routes/{routeId}` | 保存ルート詳細 | なし |
| [05-09](#operation-05-09) | PATCH | `/saved-routes/{routeId}` | ルート編集・案内・共有 | なし |
| [05-10](#operation-05-10) | DELETE | `/saved-routes/{routeId}` | ルート削除 | なし |
| [05-11](#operation-05-11) | GET | `/transit-passes` | 定期券一覧 | なし |
| [05-12](#operation-05-12) | POST | `/transit-passes` | 定期券登録 | Q07 |
| [05-13](#operation-05-13) | GET | `/transit-passes/{passId}` | 定期券単体取得 | なし |
| [05-14](#operation-05-14) | PATCH | `/transit-passes/{passId}` | 定期券編集 | Q07 |
| [05-15](#operation-05-15) | DELETE | `/transit-passes/{passId}` | 定期券削除 | なし |

<a id="operation-05-01"></a>

## 05-01 提案候補生成

`POST /api/v1/suggestion-batches`

権限：本人。保存先・更新範囲：suggestions。

checkin非nullならtype=checkinで本人・version・validUntilを照合。expiresAtは処理時刻より後。候補はoffered、未提示、completedVisitId=nullで保存。全候補を一括保存し空ならitems=[]。候補の適合・順序・処理期限はQ05。再取得はsuggestionsのbatchId条件。

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
| `checkin` | [SourceRef](../schemas/models.md#sourceref) または null | 必須 | — | — |
| `origin` | [Position](../schemas/models.md#position) | 必須 | — | — |
| `conditions` | [SuggestionConditions](../schemas/models.md#suggestionconditions) | 必須 | — | — |
| `excludedActivities` | 配列<string> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `excludedPlaceIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `expiresAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |

```json
{
  "id": "record-001",
  "checkin": null,
  "origin": {
    "longitude": 136.9066,
    "latitude": 35.1815
  },
  "conditions": {},
  "excludedActivities": [],
  "excludedPlaceIds": [],
  "expiresAt": 1789430400000
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SuggestionBatch](../schemas/models.md#suggestionbatch) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "items": []
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
| 422 | `VALIDATION_FAILED` | 項目・関連・状態条件が不正 |
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |
| 409 | `STATE_CONFLICT` | 現在状態と操作が競合 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-05-02"></a>

## 05-02 提案一覧

`GET /api/v1/suggestions`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`createdAt DESC, batchId ASC, position ASC, id ASC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `batchId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `status` | offered / later / dismissed / selected / completed / not_done | 省略可 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Suggestion](../schemas/models.md#suggestion)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-05-03"></a>

## 05-03 提案詳細

`GET /api/v1/suggestions/{suggestionId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `suggestionId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Suggestion](../schemas/models.md#suggestion) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "placeId": "record-001",
    "batchId": "record-001",
    "position": 0,
    "title": "散歩の記録",
    "activity": "x",
    "reason": "条件に合う候補。",
    "conditions": {},
    "checkinId": null,
    "sourceRefs": [],
    "status": "offered",
    "presentedAt": null,
    "selectedAt": null,
    "expiresAt": 1789430400000,
    "routeId": null,
    "completedVisitId": null,
    "feedback": "x"
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



<a id="operation-05-04"></a>

## 05-04 提案の提示・選択・達成

`PATCH /api/v1/suggestions/{suggestionId}`

権限：本人。保存先・更新範囲：suggestions。

状態遷移表に従う。presented=trueで初回presentedAtのみ保存。selectedへ初遷移した時刻をselectedAtへ。completedは同じ本人・場所のconfirmed訪問を指定。それ以外はcompletedVisitId=null。routeIdは本人ルートのみ。期限後の新規選択・達成は409。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `suggestionId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | offered / later / dismissed / selected / completed / not_done | 省略可 | — | 操作状態 |
| `presented` | true | 省略可 | — | — |
| `routeId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 案内に使う保存ルート。任意 |
| `completedVisitId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 達成に対応する訪問。未達成はNULL |
| `feedback` | string | 省略可 | minLength=0、maxLength=10000 | 見送り・選び直し等の任意の原文 |

```json
{
  "status": "offered"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Suggestion](../schemas/models.md#suggestion) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "placeId": "record-001",
    "batchId": "record-001",
    "position": 0,
    "title": "散歩の記録",
    "activity": "x",
    "reason": "条件に合う候補。",
    "conditions": {},
    "checkinId": null,
    "sourceRefs": [],
    "status": "offered",
    "presentedAt": null,
    "selectedAt": null,
    "expiresAt": 1789430400000,
    "routeId": null,
    "completedVisitId": null,
    "feedback": "x"
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



<a id="operation-05-05"></a>

## 05-05 経路取得

`POST /api/v1/route-searches`

権限：本人。保存先・更新範囲：なし。

共通previewRouteへRouteRequestを渡す。2〜10地点、walking/drivingのみ実接続。cycling/transitは501 MODE_UNSUPPORTED。隣接同座標は400。区間数=地点数−1、形状・距離・時間は全区間成功時に返す。返却previewIdをresultIdへ改名しretentionを保持。temporary候補を含む経路は保存不可。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `waypoints` | 配列<object または object または object> | 必須 | minItems=2、maxItems=10 | — |
| `mode` | walking / cycling / driving / transit | 必須 | — | — |
| `title` | string | 必須 | minLength=0、maxLength=100 | — |

`waypoints` の内部：

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | "stored" | 必須 | — | — |
| `placeId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | "candidate" | 必須 | — | — |
| `resultId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `candidateId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |

分岐 3

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | "point" | 必須 | — | — |
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `label` | string | 必須 | minLength=1、maxLength=500 | — |


```json
{
  "waypoints": [
    {
      "kind": "point",
      "coordinates": [
        136.96,
        35.16
      ],
      "label": "出発点"
    },
    {
      "kind": "stored",
      "placeId": "p1"
    }
  ],
  "mode": "walking",
  "title": "本屋へ"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [RouteSearchResult](../schemas/models.md#routesearchresult) | 必須 | — | — |

```json
{
  "data": {
    "waypoints": [
      {
        "coordinates": [
          136.96,
          35.16
        ],
        "name": "出発点",
        "placeId": null
      },
      {
        "coordinates": [
          136.965,
          35.165
        ],
        "name": "本屋",
        "placeId": "p1"
      }
    ],
    "mode": "walking",
    "legs": [
      {
        "fromIndex": 0,
        "toIndex": 1,
        "geometry": {
          "type": "LineString",
          "coordinates": [
            [
              136.96,
              35.16
            ],
            [
              136.965,
              35.165
            ]
          ]
        },
        "distanceM": 710,
        "durationSec": 540
      }
    ],
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          136.96,
          35.16
        ],
        [
          136.965,
          35.165
        ]
      ]
    },
    "distanceM": 710,
    "durationSec": 540,
    "provider": "mapbox-directions",
    "fetchedAt": 1000,
    "expiresAt": 901000,
    "retention": "storable",
    "resultId": "rp1"
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
| 501 | `MODE_UNSUPPORTED` | 移動種別などが未対応 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-05-06"></a>

## 05-06 本人の保存ルート一覧

`GET /api/v1/saved-routes`

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
| `items` | 配列<[SavedRoute](../schemas/models.md#savedroute)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-05-07"></a>

## 05-07 ルート保存

`POST /api/v1/saved-routes`

権限：本人。保存先・更新範囲：saved_routes。

resultId→previewId。共通saveRouteがcreation_receiptsを先に照合し、未保存なら本人・dataMode・期限・参照版・retention=storableを検査する。private/sharedWith=[]/saved/currentLeg=0で保存。既存の同じ作成は200、違う入力は409。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `resultId` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `title` | string | 必須 | minLength=1、maxLength=100 | ルート名 |

```json
{
  "id": "record-001",
  "resultId": "record-001",
  "title": "散歩の記録"
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SavedRoute](../schemas/models.md#savedroute) | 必須 | — | — |

```json
{
  "data": {
    "id": "x",
    "personId": "x",
    "title": "散歩の記録",
    "waypoints": [
      {
        "coordinates": [
          0,
          0
        ],
        "name": "本山のカフェ",
        "placeId": null
      },
      {
        "coordinates": [
          0,
          0
        ],
        "name": "本山のカフェ",
        "placeId": null
      }
    ],
    "mode": "walking",
    "legs": [
      {
        "fromIndex": 0,
        "toIndex": 1,
        "geometry": {
          "type": "LineString",
          "coordinates": [
            [
              0,
              0
            ],
            [
              0,
              0
            ]
          ]
        },
        "distanceM": 1,
        "durationSec": 0
      }
    ],
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          0,
          0
        ],
        [
          0,
          0
        ]
      ]
    },
    "distanceM": 0,
    "durationSec": 0,
    "provider": "mapbox-directions",
    "sourceUrl": null,
    "fetchedAt": 0,
    "status": "saved",
    "currentLeg": 0,
    "visibility": "private",
    "sharedWith": [],
    "version": 1,
    "createdAt": 0,
    "updatedAt": 0
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
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-05-08"></a>

## 05-08 保存ルート詳細

`GET /api/v1/saved-routes/{routeId}`

権限：本人または現在の共有先・公開閲覧者。保存先・更新範囲：なし。

現在の共有権限を確認し保存した地点順・経路・状態を返す。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `routeId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SavedRoute](../schemas/models.md#savedroute) | 必須 | — | — |

```json
{
  "data": {
    "id": "x",
    "personId": "x",
    "title": "散歩の記録",
    "waypoints": [
      {
        "coordinates": [
          0,
          0
        ],
        "name": "本山のカフェ",
        "placeId": null
      },
      {
        "coordinates": [
          0,
          0
        ],
        "name": "本山のカフェ",
        "placeId": null
      }
    ],
    "mode": "walking",
    "legs": [
      {
        "fromIndex": 0,
        "toIndex": 1,
        "geometry": {
          "type": "LineString",
          "coordinates": [
            [
              0,
              0
            ],
            [
              0,
              0
            ]
          ]
        },
        "distanceM": 1,
        "durationSec": 0
      }
    ],
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          0,
          0
        ],
        [
          0,
          0
        ]
      ]
    },
    "distanceM": 0,
    "durationSec": 0,
    "provider": "mapbox-directions",
    "sourceUrl": null,
    "fetchedAt": 0,
    "status": "saved",
    "currentLeg": 0,
    "visibility": "private",
    "sharedWith": [],
    "version": 1,
    "createdAt": 0,
    "updatedAt": 0
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



<a id="operation-05-09"></a>

## 05-09 ルート編集・案内・共有

`PATCH /api/v1/saved-routes/{routeId}`

権限：本人。保存先・更新範囲：saved_routes。

visibility=selectedはsharedWithが1人以上。private/publicは空配列。人物の存在と重複を検査する。 resultId指定時は本人の有効な結果で地点・経路を一緒に置換、status=saved,currentLeg=0へ。status/currentLegとの同時指定は422。案内開始は経路がありfetchedAtから15分以内。currentLegはlegsの添字。状態遷移表に従う。 共通RouteUpdateへ渡す場合はresultId→previewId、If-Match→expectedVersion。title省略時は現行titleを渡す。temporaryは409。区間geometryもDBへ保存する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `routeId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `title` | string | 省略可 | minLength=1、maxLength=100 | ルート名 |
| `resultId` | [Id](../schemas/models.md#id) | 省略可 | — | — |
| `status` | saved / navigating / finished | 省略可 | — | 案内状態 |
| `currentLeg` | integer | 省略可 | minimum=0、maximum=98 | 現在案内している区間 |
| `visibility` | private / selected / public | 省略可 | — | 表示する範囲 |
| `sharedWith` | 配列<[Id](../schemas/models.md#id)> | 省略可 | minItems=0、maxItems=100、uniqueItems=True | selectedで共有する人物IDの配列 |

```json
{
  "title": "散歩の記録"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SavedRoute](../schemas/models.md#savedroute) | 必須 | — | — |

```json
{
  "data": {
    "id": "x",
    "personId": "x",
    "title": "散歩の記録",
    "waypoints": [
      {
        "coordinates": [
          0,
          0
        ],
        "name": "本山のカフェ",
        "placeId": null
      },
      {
        "coordinates": [
          0,
          0
        ],
        "name": "本山のカフェ",
        "placeId": null
      }
    ],
    "mode": "walking",
    "legs": [
      {
        "fromIndex": 0,
        "toIndex": 1,
        "geometry": {
          "type": "LineString",
          "coordinates": [
            [
              0,
              0
            ],
            [
              0,
              0
            ]
          ]
        },
        "distanceM": 1,
        "durationSec": 0
      }
    ],
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          0,
          0
        ],
        [
          0,
          0
        ]
      ]
    },
    "distanceM": 0,
    "durationSec": 0,
    "provider": "mapbox-directions",
    "sourceUrl": null,
    "fetchedAt": 0,
    "status": "saved",
    "currentLeg": 0,
    "visibility": "private",
    "sharedWith": [],
    "version": 1,
    "createdAt": 0,
    "updatedAt": 0
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
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-05-10"></a>

## 05-10 ルート削除

`DELETE /api/v1/saved-routes/{routeId}`

権限：本人。保存先・更新範囲：saved_routes削除、suggestions更新。

該当suggestions.routeIdをnullへ変更。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `routeId` | [Id](../schemas/models.md#id) | 必須 | —  |
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



<a id="operation-05-11"></a>

## 05-11 定期券一覧

`GET /api/v1/transit-passes`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`validFrom DESC, id DESC`。同値でもIDで順序を確定する。

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
| `items` | 配列<[TransitPass](../schemas/models.md#transitpass)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-05-12"></a>

## 05-12 定期券登録

`POST /api/v1/transit-passes`

権限：本人。保存先・更新範囲：transit_passes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。 validFrom≦validToで実在日。終了日を含む。segmentsの交通ID照合先はQ07。

未確定依存：Q07。この部分は型だけで実装完了とは判断できない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `operator` | string | 必須 | minLength=1、maxLength=200 | 交通事業者 |
| `segments` | 配列<[TransitSegment](../schemas/models.md#transitsegment)> | 必須 | minItems=1、maxItems=100 | 経由順の路線・乗降駅 |
| `validFrom` | [Date](../schemas/models.md#date) | 必須 | — | 有効終了日。その日を含む |
| `validTo` | [Date](../schemas/models.md#date) | 必須 | — | 有効終了日。その日を含む |

```json
{
  "id": "record-001",
  "operator": "x",
  "segments": [
    {
      "lineId": "record-001",
      "fromStopId": "record-001",
      "toStopId": "record-001"
    }
  ],
  "validFrom": "2026-09-15",
  "validTo": "2026-09-15"
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [TransitPass](../schemas/models.md#transitpass) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "operator": "x",
    "segments": [
      {
        "lineId": "record-001",
        "fromStopId": "record-001",
        "toStopId": "record-001"
      }
    ],
    "validFrom": "2026-09-15",
    "validTo": "2026-09-15"
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


<a id="operation-05-13"></a>

## 05-13 定期券単体取得

`GET /api/v1/transit-passes/{passId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `passId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [TransitPass](../schemas/models.md#transitpass) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "operator": "x",
    "segments": [
      {
        "lineId": "record-001",
        "fromStopId": "record-001",
        "toStopId": "record-001"
      }
    ],
    "validFrom": "2026-09-15",
    "validTo": "2026-09-15"
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



<a id="operation-05-14"></a>

## 05-14 定期券編集

`PATCH /api/v1/transit-passes/{passId}`

権限：本人。保存先・更新範囲：transit_passes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。 有効終了日≧開始日。交通IDの照合はQ07。

未確定依存：Q07。この部分は型だけで実装完了とは判断できない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `passId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `operator` | string | 省略可 | minLength=1、maxLength=200 | 交通事業者 |
| `segments` | 配列<[TransitSegment](../schemas/models.md#transitsegment)> | 省略可 | minItems=1、maxItems=100 | 経由順の路線・乗降駅 |
| `validFrom` | [Date](../schemas/models.md#date) | 省略可 | — | 有効終了日。その日を含む |
| `validTo` | [Date](../schemas/models.md#date) | 省略可 | — | 有効終了日。その日を含む |

```json
{
  "operator": "x"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [TransitPass](../schemas/models.md#transitpass) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "personId": "record-001",
    "operator": "x",
    "segments": [
      {
        "lineId": "record-001",
        "fromStopId": "record-001",
        "toStopId": "record-001"
      }
    ],
    "validFrom": "2026-09-15",
    "validTo": "2026-09-15"
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



<a id="operation-05-15"></a>

## 05-15 定期券削除

`DELETE /api/v1/transit-passes/{passId}`

権限：本人。保存先・更新範囲：transit_passes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `passId` | [Id](../schemas/models.md#id) | 必須 | —  |
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

