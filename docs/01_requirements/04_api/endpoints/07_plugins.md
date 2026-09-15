# 拡張機能

本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。

[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。ローカル本人識別と再送は[CORE契約](../conventions/07_core-runtime.md)。操作固有の依存は[未確定事項](../conventions/03_open-questions.md)で確認する。

## 操作一覧

| ID | Method | パス | 操作 | 固有の未確定依存 |
|---|---|---|---|---|
| [07-01](#operation-07-01) | GET | `/plugins` | 導入可能プラグイン一覧 | Q09 |
| [07-02](#operation-07-02) | GET | `/plugin-settings` | 導入済み設定一覧 | Q09 |
| [07-03](#operation-07-03) | POST | `/plugin-settings` | プラグイン導入 | Q09 |
| [07-04](#operation-07-04) | GET | `/plugin-settings/{pluginId}` | 導入設定詳細 | Q09 |
| [07-05](#operation-07-05) | PATCH | `/plugin-settings/{pluginId}` | 設定・有効状態の変更 | Q09 |
| [07-06](#operation-07-06) | DELETE | `/plugin-settings/{pluginId}` | 導入設定削除 | Q09 |
| [07-07](#operation-07-07) | GET | `/feature-requests` | 機能要望一覧 | なし |
| [07-08](#operation-07-08) | POST | `/feature-requests` | 機能要望投稿 | なし |
| [07-09](#operation-07-09) | GET | `/feature-requests/{requestId}` | 機能要望詳細 | なし |
| [07-10](#operation-07-10) | PATCH | `/feature-requests/{requestId}` | 機能要望編集・公開変更 | なし |
| [07-11](#operation-07-11) | DELETE | `/feature-requests/{requestId}` | 機能要望削除 | なし |

<a id="operation-07-01"></a>

## 07-01 導入可能プラグイン一覧

`GET /api/v1/plugins`

権限：本人。保存先・更新範囲：なし。

コード上の定義と保存済み導入状態を突合。定義順、同順ならid ASC。固有定義はQ09。

未確定依存：Q09。この部分は型だけで実装完了とは判断できない。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[PluginDefinition](../schemas/models.md#plugindefinition)> | 必須 | minItems=0、maxItems=1000 | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1plugins/get)。

<a id="operation-07-02"></a>

## 07-02 導入済み設定一覧

`GET /api/v1/plugin-settings`

権限：本人。保存先・更新範囲：なし。

設定の適用範囲・編集権限はQ09。

並び順：`id ASC`。同値でもIDで順序を確定する。

未確定依存：Q09。この部分は型だけで実装完了とは判断できない。

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

[PluginSettingPage](../schemas/models.md#pluginsettingpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1plugin-settings/get)。

<a id="operation-07-03"></a>

## 07-03 プラグイン導入

`POST /api/v1/plugin-settings`

権限：本人。保存先・更新範囲：plugin_settings。

idは定義ID。未知の定義は404。settingsをその定義のSchemaで検証し、既存導入は409。同一キーの再送だけ元結果を返す。

未確定依存：Q09。この部分は型だけで実装完了とは判断できない。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

[PluginSettingCreate](../schemas/models.md#pluginsettingcreate)

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [PluginSetting](../schemas/models.md#pluginsetting) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1plugin-settings/post)。

<a id="operation-07-04"></a>

## 07-04 導入設定詳細

`GET /api/v1/plugin-settings/{pluginId}`

権限：本人。保存先・更新範囲：なし。

権限はQ09。

未確定依存：Q09。この部分は型だけで実装完了とは判断できない。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `pluginId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [PluginSetting](../schemas/models.md#pluginsetting) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1plugin-settings~1{pluginId}/get)。

<a id="operation-07-05"></a>

## 07-05 設定・有効状態の変更

`PATCH /api/v1/plugin-settings/{pluginId}`

権限：本人。保存先・更新範囲：plugin_settings。

settingsはオブジェクト全体の置換。定義のSchemaで検証。無効化では設定値を保持し、該当レイヤーをUIから外す。

未確定依存：Q09。この部分は型だけで実装完了とは判断できない。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `pluginId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[PluginSettingPatch](../schemas/models.md#pluginsettingpatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [PluginSetting](../schemas/models.md#pluginsetting) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1plugin-settings~1{pluginId}/patch)。

<a id="operation-07-06"></a>

## 07-06 導入設定削除

`DELETE /api/v1/plugin-settings/{pluginId}`

権限：本人。保存先・更新範囲：plugin_settings。

設定行のみ削除し記録・場所・ルートは保持。UIは該当表示を外す。

未確定依存：Q09。この部分は型だけで実装完了とは判断できない。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `pluginId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1plugin-settings~1{pluginId}/delete)。

<a id="operation-07-07"></a>

## 07-07 機能要望一覧

`GET /api/v1/feature-requests`

権限：本人または公開閲覧者。保存先・更新範囲：なし。

本人またはpublicのみ。personId/visibilityで絞り込む。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。

並び順：`createdAt DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `personId` | [Id](../schemas/models.md#id) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `visibility` | private / public | 省略可 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[FeatureRequestPage](../schemas/models.md#featurerequestpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1feature-requests/get)。

<a id="operation-07-08"></a>

## 07-08 機能要望投稿

`POST /api/v1/feature-requests`

権限：本人。保存先・更新範囲：feature_requests。

personIdは本人。title/body/visibilityを保存。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

[FeatureRequestCreate](../schemas/models.md#featurerequestcreate)

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [FeatureRequest](../schemas/models.md#featurerequest) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1feature-requests/post)。

<a id="operation-07-09"></a>

## 07-09 機能要望詳細

`GET /api/v1/feature-requests/{requestId}`

権限：本人または公開閲覧者。保存先・更新範囲：なし。

本人またはpublicのみ。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `requestId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [FeatureRequest](../schemas/models.md#featurerequest) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1feature-requests~1{requestId}/get)。

<a id="operation-07-10"></a>

## 07-10 機能要望編集・公開変更

`PATCH /api/v1/feature-requests/{requestId}`

権限：本人。保存先・更新範囲：feature_requests。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `requestId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[FeatureRequestPatch](../schemas/models.md#featurerequestpatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [FeatureRequest](../schemas/models.md#featurerequest) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1feature-requests~1{requestId}/patch)。

<a id="operation-07-11"></a>

## 07-11 機能要望削除

`DELETE /api/v1/feature-requests/{requestId}`

権限：本人。保存先・更新範囲：feature_requests。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `requestId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1feature-requests~1{requestId}/delete)。
