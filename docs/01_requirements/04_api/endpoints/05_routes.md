# 提案・経路

本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。

[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。ローカル本人識別と再送は[CORE契約](../conventions/07_core-runtime.md)。操作固有の依存は[未確定事項](../conventions/03_open-questions.md)で確認する。

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

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

[SuggestionBatchInput](../schemas/models.md#suggestionbatchinput)

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SuggestionBatch](../schemas/models.md#suggestionbatch) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `VALIDATION_FAILED` / 429 `RATE_LIMITED` / 502 `UPSTREAM_FAILED` / 503 `UNAVAILABLE` / 504 `TIMEOUT` / 409 `STATE_CONFLICT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1suggestion-batches/post)。

<a id="operation-05-02"></a>

## 05-02 提案一覧

`GET /api/v1/suggestions`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`createdAt DESC, batchId ASC, position ASC, id ASC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `batchId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `status` | offered / later / dismissed / selected / completed / not_done | 省略可 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[SuggestionPage](../schemas/models.md#suggestionpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1suggestions/get)。

<a id="operation-05-03"></a>

## 05-03 提案詳細

`GET /api/v1/suggestions/{suggestionId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `suggestionId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Suggestion](../schemas/models.md#suggestion) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1suggestions~1{suggestionId}/get)。

<a id="operation-05-04"></a>

## 05-04 提案の提示・選択・達成

`PATCH /api/v1/suggestions/{suggestionId}`

権限：本人。保存先・更新範囲：suggestions。

状態遷移表に従う。presented=trueで初回presentedAtのみ保存。selectedへ初遷移した時刻をselectedAtへ。completedは同じ本人・場所のconfirmed訪問を指定。それ以外はcompletedVisitId=null。routeIdは本人ルートのみ。期限後の新規選択・達成は409。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `suggestionId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[SuggestionPatch](../schemas/models.md#suggestionpatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Suggestion](../schemas/models.md#suggestion) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1suggestions~1{suggestionId}/patch)。

<a id="operation-05-05"></a>

## 05-05 経路取得

`POST /api/v1/route-searches`

権限：本人。保存先・更新範囲：なし。

共通previewRouteへRouteRequestを渡す。2〜10地点、walking/drivingのみ実接続。cycling/transitは501 MODE_UNSUPPORTED。隣接同座標は400。区間数=地点数−1、形状・距離・時間は全区間成功時に返す。返却previewIdをresultIdへ改名しretentionを保持。temporary候補を含む経路は保存不可。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

[RouteSearchInput](../schemas/models.md#routesearchinput)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [RouteSearchResult](../schemas/models.md#routesearchresult) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `OUTPUT_INVALID` / 429 `RATE_LIMITED` / 502 `UPSTREAM_FAILED` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT` / 409 `REQUEST_CONFLICT` / 501 `MODE_UNSUPPORTED` / 413 `INPUT_TOO_LARGE`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1route-searches/post)。

<a id="operation-05-06"></a>

## 05-06 本人の保存ルート一覧

`GET /api/v1/saved-routes`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`updatedAt DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[SavedRoutePage](../schemas/models.md#savedroutepage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1saved-routes/get)。

<a id="operation-05-07"></a>

## 05-07 ルート保存

`POST /api/v1/saved-routes`

権限：本人。保存先・更新範囲：saved_routes。

resultId→previewId。共通saveRouteがcreation_receiptsを先に照合し、未保存なら本人・dataMode・期限・参照版・retention=storableを検査する。private/sharedWith=[]/saved/currentLeg=0で保存。既存の同じ作成は200、違う入力は409。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

[SavedRouteCreate](../schemas/models.md#savedroutecreate)

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SavedRoute](../schemas/models.md#savedroute) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `OUTPUT_INVALID` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1saved-routes/post)。

<a id="operation-05-08"></a>

## 05-08 保存ルート詳細

`GET /api/v1/saved-routes/{routeId}`

権限：本人または現在の共有先・公開閲覧者。保存先・更新範囲：なし。

現在の共有権限を確認し保存した地点順・経路・状態を返す。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `routeId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SavedRoute](../schemas/models.md#savedroute) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1saved-routes~1{routeId}/get)。

<a id="operation-05-09"></a>

## 05-09 ルート編集・案内・共有

`PATCH /api/v1/saved-routes/{routeId}`

権限：本人。保存先・更新範囲：saved_routes。

visibility=selectedはsharedWithが1人以上。private/publicは空配列。人物の存在と重複を検査する。 resultId指定時は本人の有効な結果で地点・経路を一緒に置換、status=saved,currentLeg=0へ。status/currentLegとの同時指定は422。案内開始は経路がありfetchedAtから15分以内。currentLegはlegsの添字。状態遷移表に従う。 共通RouteUpdateへ渡す場合はresultId→previewId、If-Match→expectedVersion。title省略時は現行titleを渡す。temporaryは409。区間geometryもDBへ保存する。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `routeId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[SavedRoutePatch](../schemas/models.md#savedroutepatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SavedRoute](../schemas/models.md#savedroute) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、410 `RESULT_EXPIRED` / 422 `OUTPUT_INVALID` / 409 `REQUEST_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED` / 413 `INPUT_TOO_LARGE` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1saved-routes~1{routeId}/patch)。

<a id="operation-05-10"></a>

## 05-10 ルート削除

`DELETE /api/v1/saved-routes/{routeId}`

権限：本人。保存先・更新範囲：saved_routes削除、suggestions更新。

該当suggestions.routeIdをnullへ変更。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `routeId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1saved-routes~1{routeId}/delete)。

<a id="operation-05-11"></a>

## 05-11 定期券一覧

`GET /api/v1/transit-passes`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`validFrom DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[TransitPassPage](../schemas/models.md#transitpasspage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1transit-passes/get)。

<a id="operation-05-12"></a>

## 05-12 定期券登録

`POST /api/v1/transit-passes`

権限：本人。保存先・更新範囲：transit_passes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。 validFrom≦validToで実在日。終了日を含む。segmentsの交通ID照合先はQ07。

未確定依存：Q07。この部分は型だけで実装完了とは判断できない。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

[TransitPassCreate](../schemas/models.md#transitpasscreate)

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [TransitPass](../schemas/models.md#transitpass) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1transit-passes/post)。

<a id="operation-05-13"></a>

## 05-13 定期券単体取得

`GET /api/v1/transit-passes/{passId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `passId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [TransitPass](../schemas/models.md#transitpass) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1transit-passes~1{passId}/get)。

<a id="operation-05-14"></a>

## 05-14 定期券編集

`PATCH /api/v1/transit-passes/{passId}`

権限：本人。保存先・更新範囲：transit_passes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。 有効終了日≧開始日。交通IDの照合はQ07。

未確定依存：Q07。この部分は型だけで実装完了とは判断できない。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `passId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[TransitPassPatch](../schemas/models.md#transitpasspatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [TransitPass](../schemas/models.md#transitpass) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1transit-passes~1{passId}/patch)。

<a id="operation-05-15"></a>

## 05-15 定期券削除

`DELETE /api/v1/transit-passes/{passId}`

権限：本人。保存先・更新範囲：transit_passes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `passId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1transit-passes~1{passId}/delete)。
