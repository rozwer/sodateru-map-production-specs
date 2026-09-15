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

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Person](../schemas/models.md#person) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1me/get)。

<a id="operation-06-02"></a>

## 06-02 本人プロフィール編集

`PATCH /api/v1/me`

権限：本人。保存先・更新範囲：people。

avatarUrlは外部URLの保存案。内部ファイルの任意パスを受け付けない。アイコンアップロード導線はQ06。

未確定依存：Q06。この部分は型だけで実装完了とは判断できない。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### リクエスト本文

[PersonPatch](../schemas/models.md#personpatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Person](../schemas/models.md#person) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1me/patch)。

<a id="operation-06-03"></a>

## 06-03 人物検索

`GET /api/v1/people`

権限：本人。保存先・更新範囲：なし。

cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 qはnameの部分一致。プロフィールの公開範囲はQ01。

並び順：`name ASC, id ASC`。同値でもIDで順序を確定する。

未確定依存：Q01。この部分は型だけで実装完了とは判断できない。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `q` | string | 省略可 | minLength=1、maxLength=200  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[PersonPage](../schemas/models.md#personpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1people/get)。

<a id="operation-06-04"></a>

## 06-04 人物プロフィール

`GET /api/v1/people/{personId}`

権限：本人。保存先・更新範囲：なし。

表示可能なプロフィールの範囲はQ01。

未確定依存：Q01。この部分は型だけで実装完了とは判断できない。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `personId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Person](../schemas/models.md#person) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1people~1{personId}/get)。

<a id="operation-06-05"></a>

## 06-05 友人関係・申請一覧

`GET /api/v1/friendships`

権限：本人。保存先・更新範囲：なし。

本人がrequester/recipientのどちらかである行。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`updatedAt DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `status` | pending / accepted | 省略可 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[FriendshipPage](../schemas/models.md#friendshippage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1friendships/get)。

<a id="operation-06-06"></a>

## 06-06 友人申請

`POST /api/v1/friendships`

権限：本人。保存先・更新範囲：friendships。

requesterは本人、recipientは別の実在人物。逆方向も含む既存の組は409。status=pending。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### リクエスト本文

[FriendshipCreate](../schemas/models.md#friendshipcreate)

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Friendship](../schemas/models.md#friendship) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1friendships/post)。

<a id="operation-06-07"></a>

## 06-07 友人関係単体取得

`GET /api/v1/friendships/{friendshipId}`

権限：本人。保存先・更新範囲：なし。

当事者のみ。他人の関係は404。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `friendshipId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Friendship](../schemas/models.md#friendship) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1friendships~1{friendshipId}/get)。

<a id="operation-06-08"></a>

## 06-08 友人申請承認

`PATCH /api/v1/friendships/{friendshipId}`

権限：申請先本人。保存先・更新範囲：friendships。

recipient本人だけがpending→acceptedへ変更。acceptedへの再指定は版が一致すれば無変更200。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `friendshipId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "accepted" | 必須 | — | — |

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Friendship](../schemas/models.md#friendship) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1friendships~1{friendshipId}/patch)。

<a id="operation-06-09"></a>

## 06-09 申請取消・拒否・友人解除

`DELETE /api/v1/friendships/{friendshipId}`

権限：関係の当事者。保存先・更新範囲：friendships。

当事者のみ。関係行を削除しfriends検索から除く。明示したselected共有は保持し、解除にはrecords/saved-routesの共有更新を使う。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `friendshipId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1friendships~1{friendshipId}/delete)。

<a id="operation-06-10"></a>

## 06-10 共有投稿検索

`GET /api/v1/shared-records`

権限：現在閲覧可能な記録。保存先・更新範囲：なし。

共通searchRecordsの検索・閲覧・期間重なり・NFKC正規化・距離条件を適用。q→text、from/to/timeZone→range、longitude/latitude→center。personIds/purposesは同名queryの繰返し。audience既定visible、includeUndated既定false。期間は3項目一組、中心と半径も一組。全条件適用後にページ分割しtotalCountを返す。

並び順：`effectiveAt DESC NULLS LAST, id ASC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

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

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[CommonInfoRecordPage](../schemas/models.md#commoninforecordpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1shared-records/get)。

<a id="operation-06-11"></a>

## 06-11 同じ共有検索の地図表示

`GET /api/v1/shared-records/map`

権限：現在閲覧可能な記録。保存先・更新範囲：なし。

共通searchRecordsの検索・閲覧・期間重なり・NFKC正規化・距離条件を適用。q→text、from/to/timeZone→range、longitude/latitude→center。personIds/purposesは同名queryの繰返し。audience既定visible、includeUndated既定false。期間は3項目一組、中心と半径も一組。全条件適用後にページ分割しtotalCountを返す。 mapRecordsを使い全体最大2,000投稿、超過は413 INPUT_TOO_LARGE。場所なし投稿はtotalCountに含めitemsから除く。cursorで部分結果を全件として返さない。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

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

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [CommonInfoRecordMap](../schemas/models.md#commoninforecordmap) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、413 `INPUT_TOO_LARGE` / 409 `REQUEST_CONFLICT` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1shared-records~1map/get)。

<a id="operation-06-12"></a>

## 06-12 地域の声

`GET /api/v1/places/{placeId}/voices`

権限：現在閲覧可能な記録。保存先・更新範囲：なし。

共通searchRecordsの検索・閲覧・期間重なり・NFKC正規化・距離条件を適用。q→text、from/to/timeZone→range、longitude/latitude→center。personIds/purposesは同名queryの繰返し。audience既定visible、includeUndated既定false。期間は3項目一組、中心と半径も一組。全条件適用後にページ分割しtotalCountを返す。 searchTopicsのplaceIdをパスで固定しtopicKeyを必須にする。

並び順：`effectiveAt DESC NULLS LAST, id ASC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

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

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[CommonInfoRecordPage](../schemas/models.md#commoninforecordpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1places~1{placeId}~1voices/get)。

<a id="operation-06-13"></a>

## 06-13 共有ルート一覧

`GET /api/v1/shared-routes`

権限：現在閲覧可能なルート。保存先・更新範囲：なし。

本人またはpublicまたはselectedで本人が共有先のルート。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`updatedAt DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `personId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `visibility` | private / selected / public | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[SavedRoutePage](../schemas/models.md#savedroutepage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1shared-routes/get)。
