# 地図・場所

本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。

[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。全操作は本人識別Q01が前提。POSTの再送基盤Q02と操作固有の依存も[未確定事項](../conventions/03_open-questions.md)で確認する。

## 操作一覧

| ID | Method | パス | 操作 | 固有の未確定依存 |
|---|---|---|---|---|
| [01-01](#operation-01-01) | GET | `/places` | 保存済み場所一覧 | なし |
| [01-02](#operation-01-02) | GET | `/place-candidates` | 場所候補検索 | なし |
| [01-03](#operation-01-03) | POST | `/places` | 候補採用・手動登録 | なし |
| [01-04](#operation-01-04) | GET | `/places/{placeId}` | 場所詳細 | なし |
| [01-05](#operation-01-05) | PATCH | `/places/{placeId}` | 場所情報・建物対応の訂正 | Q03 |
| [01-06](#operation-01-06) | GET | `/map/growth` | 本人の地図成長材料 | Q11 |

<a id="operation-01-01"></a>

## 01-01 保存済み場所一覧

`GET /api/v1/places`

権限：本人。保存先・更新範囲：なし。

cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`name ASC, id ASC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `q` | string | 省略可 | minLength=1、maxLength=200  |
| query | `bbox` | string | 省略可 | pattern=^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$ west,south,east,north。経度±180、緯度±90、west<east、south<north。日付変更線をまたぐ場合は二要求へ分ける。 |
| query | `buildingKey` | string | 省略可 | minLength=1、maxLength=400  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Place](../schemas/models.md#place)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-01-02"></a>

## 01-02 場所候補検索

`GET /api/v1/place-candidates`

権限：本人。保存先・更新範囲：なし。

qまたはcategoryの一方を必須。qはtrim/NFKC/小文字化して保存場所を検索し、0件ならNominatim。categoryではlongitude/latitudeの両方を必須とし緯度±85。categoryは5件固定のためlimit指定不可。候補は15分、本人・dataModeで分離。temporaryは閲覧だけで保存不可。共通の場所検索仕様を適用。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `q` | string | 省略可 | minLength=1、maxLength=200  |
| query | `longitude` | number | 省略可 | minimum=-180、maximum=180  |
| query | `latitude` | number | 省略可 | minimum=-90、maximum=90  |
| query | `category` | coffee / restaurant / bakery / park | 省略可 | —  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=10、default=10  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [CandidateResult](../schemas/models.md#candidateresult) | 必須 | — | — |

```json
{
  "data": {
    "resultId": "record-001",
    "expiresAt": 1789430400000,
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
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |



<a id="operation-01-03"></a>

## 01-03 候補採用・手動登録

`POST /api/v1/places`

権限：本人。保存先・更新範囲：places。

candidateでは本人・期限を確認しprovider+externalIdで照合。既存なら200でそのPlaceを返す。manualはprovider=manual、externalId/sourceUrl/fetchedAt=null、attributionは空文字。要求IDと既存IDが異なる場合も返却されたIDを使う。 候補のretention=storableを必須としtemporaryは409 REQUEST_CONFLICT。creation_receiptsを期限照合より先に確認し、同じ要求は現在の場所を返す。削除済みなら404で復活させない。categoriesもコピーする。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `mode` | "candidate" | 必須 | — | — |
| `resultId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `candidateId` | [Id](../schemas/models.md#id) | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `mode` | "manual" | 必須 | — | — |
| `name` | string | 必須 | minLength=1、maxLength=200 | — |
| `position` | [Position](../schemas/models.md#position) | 必須 | — | — |
| `address` | string または null | 必須 | — | — |
| `buildingKey` | string または null | 必須 | — | — |

```json
{
  "id": "record-001",
  "mode": "candidate",
  "resultId": "record-001",
  "candidateId": "record-001"
}
```

### 成功応答

HTTP 201。既存場所を再利用した場合は200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Place](../schemas/models.md#place) | 必須 | — | — |

```json
{
  "data": {
    "id": "x",
    "name": "本山のカフェ",
    "address": null,
    "coordinates": [
      0,
      0
    ],
    "categories": [],
    "provider": "x",
    "externalId": null,
    "buildingKey": null,
    "sourceUrl": null,
    "attribution": "x",
    "fetchedAt": null,
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
| 429 | `RATE_LIMITED` | 実行頻度の上限 |
| 502 | `UPSTREAM_FAILED` | 外部サービスの応答不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |

POSTの409は再送内容不一致ならIDEMPOTENCY_CONFLICT、入力変更ならINPUT_CHANGEDを使う。


<a id="operation-01-04"></a>

## 01-04 場所詳細

`GET /api/v1/places/{placeId}`

権限：本人。保存先・更新範囲：なし。

共通getPlaceDetailのPlaceDetailをdataへ返す。colocatedは同じ非nullのbuildingKeyで名前・ID順。本人訪問は全ページ取得し、ownRecords/sharedRecords/visitsを領域別状態で返す。主対象なしは404。schemaのerrorは共通Errorとして保持する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `placeId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [PlaceDetail](../schemas/models.md#placedetail) | 必須 | — | — |

```json
{
  "data": {
    "place": {
      "id": "x",
      "name": "本山のカフェ",
      "address": null,
      "coordinates": [
        0,
        0
      ],
      "categories": [],
      "provider": "x",
      "externalId": null,
      "buildingKey": null,
      "sourceUrl": null,
      "attribution": "x",
      "fetchedAt": null,
      "version": 1,
      "createdAt": 0,
      "updatedAt": 0
    },
    "colocated": [],
    "ownRecords": {
      "status": "ready",
      "items": [],
      "error": null
    },
    "sharedRecords": {
      "status": "ready",
      "items": [],
      "error": null
    },
    "visits": {
      "status": "ready",
      "items": [],
      "error": null
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
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-01-05"></a>

## 01-05 場所情報・建物対応の訂正

`PATCH /api/v1/places/{placeId}`

権限：場所管理権限（未確定）。保存先・更新範囲：places。

共有のplacesを編集する権限を先に決める。外部取得項目の手修正・再取得時の優先順位はQ03。

未確定依存：Q03。この部分は型だけで実装完了とは判断できない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `placeId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | minLength=1、maxLength=200 | 場所名 |
| `address` | string または null | 省略可 | — | 住所。不明はNULL |
| `buildingKey` | string または null | 省略可 | — | Mapboxのsource/layer/featureに対応する識別子 |

```json
{
  "name": "本山のカフェ"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Place](../schemas/models.md#place) | 必須 | — | — |

```json
{
  "data": {
    "id": "x",
    "name": "本山のカフェ",
    "address": null,
    "coordinates": [
      0,
      0
    ],
    "categories": [],
    "provider": "x",
    "externalId": null,
    "buildingKey": null,
    "sourceUrl": null,
    "attribution": "x",
    "fetchedAt": null,
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
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 412 | `VERSION_CONFLICT` | 版が不一致 |
| 428 | `VERSION_REQUIRED` | If-Matchがない |
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-01-06"></a>

## 01-06 本人の地図成長材料

`GET /api/v1/map/growth`

権限：本人。保存先・更新範囲：なし。

本人のconfirmedな訪問IDを場所別に数える。purposesはその訪問のrecordsから重複を除く。成長段階や3D外観の決定規則は画面仕様で定義する。

並び順：`place.id ASC`。同値でもIDで順序を確定する。

未確定依存：Q11。この部分は型だけで実装完了とは判断できない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `bbox` | string | 省略可 | pattern=^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$ west,south,east,north。経度±180、緯度±90、west<east、south<north。日付変更線をまたぐ場合は二要求へ分ける。 |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[GrowthItem](../schemas/models.md#growthitem)> | 必須 | minItems=0、maxItems=100 | — |
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

