# 人物・共有

本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。

[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。全操作は本人識別Q01が前提。POSTの再送基盤Q02と操作固有の依存も[未確定事項](../conventions/03_open-questions.md)で確認する。

## 操作一覧

| ID | Method | パス | 操作 | 固有の未確定依存 |
|---|---|---|---|---|
| [06-01](#operation-06-01) | GET | `/me` | 本人プロフィール | なし |
| [06-02](#operation-06-02) | PATCH | `/me` | 本人プロフィール編集 | Q06 |
| [06-03](#operation-06-03) | GET | `/people` | 人物検索 | Q01 |
| [06-04](#operation-06-04) | GET | `/people/{personId}` | 人物プロフィール | Q01 |
| [06-05](#operation-06-05) | GET | `/friendships` | 友人関係・申請一覧 | なし |
| [06-06](#operation-06-06) | POST | `/friendships` | 友人申請 | なし |
| [06-07](#operation-06-07) | GET | `/friendships/{friendshipId}` | 友人関係単体取得 | なし |
| [06-08](#operation-06-08) | PATCH | `/friendships/{friendshipId}` | 友人申請承認 | なし |
| [06-09](#operation-06-09) | DELETE | `/friendships/{friendshipId}` | 申請取消・拒否・友人解除 | なし |
| [06-10](#operation-06-10) | GET | `/shared-records` | 共有投稿検索 | なし |
| [06-11](#operation-06-11) | GET | `/shared-records/map` | 同じ共有検索の地図表示 | なし |
| [06-12](#operation-06-12) | GET | `/places/{placeId}/voices` | 地域の声 | なし |
| [06-13](#operation-06-13) | GET | `/shared-routes` | 共有ルート一覧 | なし |

<a id="operation-06-01"></a>

## 06-01 本人プロフィール

`GET /api/v1/me`

権限：本人。保存先・更新範囲：なし。

認証層の本人IDからpeopleを取得。初回作成方法はQ01。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Person](../schemas/models.md#person) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "name": "本山のカフェ",
    "bio": "x",
    "avatarUrl": null
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



<a id="operation-06-02"></a>

## 06-02 本人プロフィール編集

`PATCH /api/v1/me`

権限：本人。保存先・更新範囲：people。

avatarUrlは外部URLの保存案。内部ファイルの任意パスを受け付けない。アイコンアップロード導線はQ06。

未確定依存：Q06。この部分は型だけで実装完了とは判断できない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | minLength=1、maxLength=200 | 表示名 |
| `bio` | string | 省略可 | minLength=0、maxLength=10000 | 紹介文 |
| `avatarUrl` | string (uri) または null | 省略可 | — | アイコンのURLまたはアセットパス |

```json
{
  "name": "本山のカフェ"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Person](../schemas/models.md#person) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "name": "本山のカフェ",
    "bio": "x",
    "avatarUrl": null
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



<a id="operation-06-03"></a>

## 06-03 人物検索

`GET /api/v1/people`

権限：本人。保存先・更新範囲：なし。

cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 qはnameの部分一致。プロフィールの公開範囲はQ01。

並び順：`name ASC, id ASC`。同値でもIDで順序を確定する。

未確定依存：Q01。この部分は型だけで実装完了とは判断できない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `q` | string | 省略可 | minLength=1、maxLength=200  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Person](../schemas/models.md#person)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-06-04"></a>

## 06-04 人物プロフィール

`GET /api/v1/people/{personId}`

権限：本人。保存先・更新範囲：なし。

表示可能なプロフィールの範囲はQ01。

未確定依存：Q01。この部分は型だけで実装完了とは判断できない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `personId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Person](../schemas/models.md#person) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "name": "本山のカフェ",
    "bio": "x",
    "avatarUrl": null
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



<a id="operation-06-05"></a>

## 06-05 友人関係・申請一覧

`GET /api/v1/friendships`

権限：本人。保存先・更新範囲：なし。

本人がrequester/recipientのどちらかである行。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`updatedAt DESC, id DESC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `status` | pending / accepted | 省略可 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Friendship](../schemas/models.md#friendship)> | 必須 | minItems=0、maxItems=100 | — |
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



<a id="operation-06-06"></a>

## 06-06 友人申請

`POST /api/v1/friendships`

権限：本人。保存先・更新範囲：friendships。

requesterは本人、recipientは別の実在人物。逆方向も含む既存の組は409。status=pending。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| header | `Idempotency-Key` | string | 必須 | minLength=1、maxLength=128 本人と操作に束縛した再送識別子。照合記録の保存方式はQ02。読取POSTでも指定する。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 申請先 |
| `recipientId` | [Id](../schemas/models.md#id) | 必須 | — | 申請先 |

```json
{
  "id": "record-001",
  "recipientId": "record-001"
}
```

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Friendship](../schemas/models.md#friendship) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "requesterId": "record-001",
    "recipientId": "record-001",
    "status": "pending"
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


<a id="operation-06-07"></a>

## 06-07 友人関係単体取得

`GET /api/v1/friendships/{friendshipId}`

権限：本人。保存先・更新範囲：なし。

当事者のみ。他人の関係は404。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `friendshipId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Friendship](../schemas/models.md#friendship) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "requesterId": "record-001",
    "recipientId": "record-001",
    "status": "pending"
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



<a id="operation-06-08"></a>

## 06-08 友人申請承認

`PATCH /api/v1/friendships/{friendshipId}`

権限：申請先本人。保存先・更新範囲：friendships。

recipient本人だけがpending→acceptedへ変更。acceptedへの再指定は版が一致すれば無変更200。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `friendshipId` | [Id](../schemas/models.md#id) | 必須 | —  |
| header | `If-Match` | string | 必須 | pattern=^"[1-9][0-9]*"$ 対象の版。媒体添付・一括順序変更は親記録の版。 |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "accepted" | 必須 | — | — |

```json
{
  "status": "accepted"
}
```

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Friendship](../schemas/models.md#friendship) | 必須 | — | — |

```json
{
  "data": {
    "id": "record-001",
    "version": 1,
    "createdAt": 1789430400000,
    "updatedAt": 1789430400000,
    "requesterId": "record-001",
    "recipientId": "record-001",
    "status": "pending"
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



<a id="operation-06-09"></a>

## 06-09 申請取消・拒否・友人解除

`DELETE /api/v1/friendships/{friendshipId}`

権限：関係の当事者。保存先・更新範囲：friendships。

当事者のみ。関係行を削除しfriends検索から除く。明示したselected共有は保持し、解除にはrecords/saved-routesの共有更新を使う。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `friendshipId` | [Id](../schemas/models.md#id) | 必須 | —  |
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



<a id="operation-06-10"></a>

## 06-10 共有投稿検索

`GET /api/v1/shared-records`

権限：現在閲覧可能な記録。保存先・更新範囲：なし。

共通searchRecordsの検索・閲覧・期間重なり・NFKC正規化・距離条件を適用。q→text、from/to/timeZone→range、longitude/latitude→center。personIds/purposesは同名queryの繰返し。audience既定visible、includeUndated既定false。期間は3項目一組、中心と半径も一組。全条件適用後にページ分割しtotalCountを返す。

並び順：`effectiveAt DESC NULLS LAST, id ASC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `q` | string | 省略可 | minLength=1、maxLength=200  |
| query | `placeId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `longitude` | number | 省略可 | minimum=-180、maximum=180  |
| query | `latitude` | number | 省略可 | minimum=-90、maximum=90  |
| query | `radiusM` | number | 省略可 | minimum=1、maximum=100000  |
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `timeZone` | [TimeZone](../schemas/models.md#timezone) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `audience` | own / visible / public / selected / friends | 省略可 | default=visible  |
| query | `personIds` | 配列<string> | 省略可 | minItems=0、maxItems=100、uniqueItems=True、default=[]  |
| query | `purposes` | 配列<string> | 省略可 | minItems=0、maxItems=20、uniqueItems=True、default=[]  |
| query | `topicKey` | string または null | 省略可 | default=None  |
| query | `includeUndated` | boolean | 省略可 | default=False  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[CommonInfoRecordView](../schemas/models.md#commoninforecordview)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |
| `totalCount` | integer | 必須 | minimum=0 | — |

```json
{
  "items": [],
  "nextCursor": null,
  "totalCount": 0
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



<a id="operation-06-11"></a>

## 06-11 同じ共有検索の地図表示

`GET /api/v1/shared-records/map`

権限：現在閲覧可能な記録。保存先・更新範囲：なし。

共通searchRecordsの検索・閲覧・期間重なり・NFKC正規化・距離条件を適用。q→text、from/to/timeZone→range、longitude/latitude→center。personIds/purposesは同名queryの繰返し。audience既定visible、includeUndated既定false。期間は3項目一組、中心と半径も一組。全条件適用後にページ分割しtotalCountを返す。 mapRecordsを使い全体最大2,000投稿、超過は413 INPUT_TOO_LARGE。場所なし投稿はtotalCountに含めitemsから除く。cursorで部分結果を全件として返さない。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `q` | string | 省略可 | minLength=1、maxLength=200  |
| query | `placeId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `longitude` | number | 省略可 | minimum=-180、maximum=180  |
| query | `latitude` | number | 省略可 | minimum=-90、maximum=90  |
| query | `radiusM` | number | 省略可 | minimum=1、maximum=100000  |
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `timeZone` | [TimeZone](../schemas/models.md#timezone) | 省略可 | —  |
| query | `audience` | own / visible / public / selected / friends | 省略可 | default=visible  |
| query | `personIds` | 配列<string> | 省略可 | minItems=0、maxItems=100、uniqueItems=True、default=[]  |
| query | `purposes` | 配列<string> | 省略可 | minItems=0、maxItems=20、uniqueItems=True、default=[]  |
| query | `topicKey` | string または null | 省略可 | default=None  |
| query | `includeUndated` | boolean | 省略可 | default=False  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [CommonInfoRecordMap](../schemas/models.md#commoninforecordmap) | 必須 | — | — |

```json
{
  "data": {
    "items": [],
    "totalCount": 0
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
| 413 | `INPUT_TOO_LARGE` | 本文・ファイルが上限超過 |
| 409 | `REQUEST_CONFLICT` | 現在状態と操作が競合 |
| 422 | `OUTPUT_INVALID` | 項目・関連・状態条件が不正 |
| 503 | `PROVIDER_UNAVAILABLE` | 実行環境を利用できない |
| 504 | `TIMEOUT` | 処理期限を超過 |



<a id="operation-06-12"></a>

## 06-12 地域の声

`GET /api/v1/places/{placeId}/voices`

権限：現在閲覧可能な記録。保存先・更新範囲：なし。

共通searchRecordsの検索・閲覧・期間重なり・NFKC正規化・距離条件を適用。q→text、from/to/timeZone→range、longitude/latitude→center。personIds/purposesは同名queryの繰返し。audience既定visible、includeUndated既定false。期間は3項目一組、中心と半径も一組。全条件適用後にページ分割しtotalCountを返す。 searchTopicsのplaceIdをパスで固定しtopicKeyを必須にする。

並び順：`effectiveAt DESC NULLS LAST, id ASC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `placeId` | [Id](../schemas/models.md#id) | 必須 | —  |
| query | `q` | string | 省略可 | minLength=1、maxLength=200  |
| query | `longitude` | number | 省略可 | minimum=-180、maximum=180  |
| query | `latitude` | number | 省略可 | minimum=-90、maximum=90  |
| query | `radiusM` | number | 省略可 | minimum=1、maximum=100000  |
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `timeZone` | [TimeZone](../schemas/models.md#timezone) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `audience` | own / visible / public / selected / friends | 省略可 | default=visible  |
| query | `personIds` | 配列<string> | 省略可 | minItems=0、maxItems=100、uniqueItems=True、default=[]  |
| query | `purposes` | 配列<string> | 省略可 | minItems=0、maxItems=20、uniqueItems=True、default=[]  |
| query | `topicKey` | string または null | 必須 | default=None  |
| query | `includeUndated` | boolean | 省略可 | default=False  |
| header | `X-Request-Id` | string (uuid) | 必須 | — 新しいHTTP要求のUUID。dataModeはサーバーの本人解決contextから渡す。 |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[CommonInfoRecordView](../schemas/models.md#commoninforecordview)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |
| `totalCount` | integer | 必須 | minimum=0 | — |

```json
{
  "items": [],
  "nextCursor": null,
  "totalCount": 0
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



<a id="operation-06-13"></a>

## 06-13 共有ルート一覧

`GET /api/v1/shared-routes`

権限：現在閲覧可能なルート。保存先・更新範囲：なし。

本人またはpublicまたはselectedで本人が共有先のルート。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`updatedAt DESC, id DESC`。同値でもIDで順序を確定する。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `personId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `visibility` | private / selected / public | 省略可 | —  |
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

