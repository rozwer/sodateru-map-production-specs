# 振り返り・分析・テーマ

本番APIの契約案。パスの前に `/api/v1` を付ける。実装・製品の検証結果ではない。

[共通規約](../conventions/01_http.md)・[保存条件](../conventions/02_mutations.md)・[状態遷移](../conventions/04_state-transitions.md)を適用する。ローカル本人識別と再送は[CORE契約](../conventions/07_core-runtime.md)。操作固有の依存は[未確定事項](../conventions/03_open-questions.md)で確認する。

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

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `date` | [Date](../schemas/models.md#date) | 必須 | —  |
| query | `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DailyReflection](../schemas/models.md#dailyreflection) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1reflection~1days~1{date}/get)。

<a id="operation-04-02"></a>

## 04-02 SelfCheckin一覧

`GET /api/v1/self-checkins`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 dateはlocalDateと一致。

並び順：`localDate DESC, createdAt DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `date` | [Date](../schemas/models.md#date) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[SelfCheckinPage](../schemas/models.md#selfcheckinpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1self-checkins/get)。

<a id="operation-04-03"></a>

## 04-03 SelfCheckin作成

`POST /api/v1/self-checkins`

権限：本人。保存先・更新範囲：11_self_checkins。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。validUntilは作成日時より後。同じ時点の訂正は同じID、新しい回答は新ID。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

[SelfCheckinCreate](../schemas/models.md#selfcheckincreate)

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SelfCheckin](../schemas/models.md#selfcheckin) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1self-checkins/post)。

<a id="operation-04-04"></a>

## 04-04 SelfCheckin単体取得

`GET /api/v1/self-checkins/{checkinId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `checkinId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SelfCheckin](../schemas/models.md#selfcheckin) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1self-checkins~1{checkinId}/get)。

<a id="operation-04-05"></a>

## 04-05 SelfCheckin編集

`PATCH /api/v1/self-checkins/{checkinId}`

権限：本人。保存先・更新範囲：11_self_checkins。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。validUntilは作成日時より後。同じ時点の訂正は同じID、新しい回答は新ID。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `checkinId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[SelfCheckinPatch](../schemas/models.md#selfcheckinpatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SelfCheckin](../schemas/models.md#selfcheckin) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1self-checkins~1{checkinId}/patch)。

<a id="operation-04-06"></a>

## 04-06 SelfCheckin削除

`DELETE /api/v1/self-checkins/{checkinId}`

権限：本人。保存先・更新範囲：11_self_checkins。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。提案のcheckinIdをnullにする。依存結果は根拠照合で無効化。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `checkinId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1self-checkins~1{checkinId}/delete)。

<a id="operation-04-07"></a>

## 04-07 Theme一覧

`GET /api/v1/themes`

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

[ThemePage](../schemas/models.md#themepage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1themes/get)。

<a id="operation-04-08"></a>

## 04-08 Theme作成

`POST /api/v1/themes`

権限：本人。保存先・更新範囲：13_themes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。recordIdsは本人の記録のみで一意。一度の編集で全配列を更新。記録自体の削除はしない。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

[ThemeCreate](../schemas/models.md#themecreate)

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Theme](../schemas/models.md#theme) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1themes/post)。

<a id="operation-04-09"></a>

## 04-09 Theme単体取得

`GET /api/v1/themes/{themeId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `themeId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Theme](../schemas/models.md#theme) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1themes~1{themeId}/get)。

<a id="operation-04-10"></a>

## 04-10 Theme編集

`PATCH /api/v1/themes/{themeId}`

権限：本人。保存先・更新範囲：13_themes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。recordIdsは本人の記録のみで一意。一度の編集で全配列を更新。記録自体の削除はしない。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `themeId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[ThemePatch](../schemas/models.md#themepatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Theme](../schemas/models.md#theme) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1themes~1{themeId}/patch)。

<a id="operation-04-11"></a>

## 04-11 Theme削除

`DELETE /api/v1/themes/{themeId}`

権限：本人。保存先・更新範囲：13_themes。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。含まれるrecordsは保持。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `themeId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1themes~1{themeId}/delete)。

<a id="operation-04-12"></a>

## 04-12 期間集計

`GET /api/v1/reflection/summary`

権限：本人。保存先・更新範囲：なし。

from<to。IANA timezoneで日付を区切る。分子≦分母、分母0ならvalue=null。各軸の判定規則と同日の回答重複時の集約はQ05。

未確定依存：Q05。この部分は型だけで実装完了とは判断できない。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 必須 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 必須 | —  |
| query | `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Summary](../schemas/models.md#summary) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1reflection~1summary/get)。

<a id="operation-04-13"></a>

## 04-13 分析・比較一覧

`GET /api/v1/insights`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。cursorは本人・検索条件・順序に束縛し、条件不一致は400。閲覧・検索条件を適用してからページ分割。 from/toはcreatedAtへ適用。

並び順：`createdAt DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `from` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `to` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `kind` | analysis / comparison | 省略可 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[InsightPage](../schemas/models.md#insightpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1insights/get)。

<a id="operation-04-14"></a>

## 04-14 分析・比較詳細

`GET /api/v1/insights/{insightId}`

権限：本人。保存先・更新範囲：なし。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。 元の入力版が変更済みなら409 INPUT_CHANGED、削除・非公開化なら404。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `insightId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Insight](../schemas/models.md#insight) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `INPUT_CHANGED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1insights~1{insightId}/get)。

<a id="operation-04-15"></a>

## 04-15 分析への判断・訂正

`PATCH /api/v1/insights/{insightId}`

権限：本人。保存先・更新範囲：insights。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。根拠のID・version・現在の共有権限を照合し、読めない根拠を含む結果は返さない。 review非nullならreviewedAtをサーバー時刻へ。review=nullならreviewNote/reviewedAtもnull。判断は同じ結果IDへ保存し元の記録を変更しない。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `insightId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

[InsightPatch](../schemas/models.md#insightpatch)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Insight](../schemas/models.md#insight) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1insights~1{insightId}/patch)。

<a id="operation-04-16"></a>

## 04-16 分析結果削除

`DELETE /api/v1/insights/{insightId}`

権限：本人。保存先・更新範囲：insights削除、messagesの参照解除。

参照先は同じ本人のデータ。読取・更新前に所有者と存在を検査する。 messages.insightIdをnullにする。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `insightId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `STATE_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1insights~1{insightId}/delete)。

<a id="operation-04-17"></a>

## 04-17 根拠の現行内容と版を取得

`POST /api/v1/source-checks`

権限：各対象の現在の閲覧権限。保存先・更新範囲：なし。

共通checkSourcesへrefsを渡し入力順で{ref,state,currentVersion}をdata配列へ返す。state=current/changed/unavailable。unavailableは削除と権限なしを区別せずcurrentVersion=null。本文は返さない。共有recordと同じ要求にある関連visitは版照合だけ許可し、訪問の直接読出し権限を広げない。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

[SourceLookupInput](../schemas/models.md#sourcelookupinput)

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [SourceLookup](../schemas/models.md#sourcelookup) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `OUTPUT_INVALID` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1source-checks/post)。

<a id="operation-04-18"></a>

## 04-18 期間集計の作成

`POST /api/v1/insights`

権限：本人。保存先・更新範囲：insights。

本人の期間集計を行いkind=analysis、model=nullでaxes・sourceRefs・inputKey・generatorVersionを保存する。既存同一inputKeyなら200で既存の判断を保持。AI説明が必要なら返却insightIdをanalysisの入力へ渡す。軸の判定規則はQ05。

未確定依存：Q05。この部分は型だけで実装完了とは判断できない。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `from` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `to` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | — | — |

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Insight](../schemas/models.md#insight) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `VALIDATION_FAILED` / 409 `STATE_CONFLICT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1insights/post)。

<a id="operation-04-19"></a>

## 04-19 発見カード保存

`POST /api/v1/discovery-cards`

権限：本人。保存先・更新範囲：discovery_cards、messages.applied_refs_json。

本人のcompleteなdiscover実行とattemptを検査しresult_jsonとsourceRefsをコピー。要求本文に説明や出典を受け付けない。生成の根拠を再照合しdiscovery_cardsへ保存、applied_refs_jsonを同一トランザクションで追記。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `expectedAttempt` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DiscoveryCard](../schemas/models.md#discoverycard) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `OUTPUT_INVALID` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1discovery-cards/post)。

<a id="operation-04-20"></a>

## 04-20 保存した発見一覧

`GET /api/v1/discovery-cards`

権限：本人。保存先・更新範囲：なし。

本人のカードのみ。savedOnly=trueは各カードの最新のsaved/blocked/dismissedがsavedのもの。createdAt同値では反応ID ASCの最後を採用。known/interestedは保存表示に影響しない。sourceRefsを再照合。

並び順：`createdAt DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |
| query | `savedOnly` | boolean | 省略可 | default=False  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[DiscoveryCardPage](../schemas/models.md#discoverycardpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1discovery-cards/get)。

<a id="operation-04-21"></a>

## 04-21 発見カード詳細

`GET /api/v1/discovery-cards/{cardId}`

権限：本人。保存先・更新範囲：なし。

本人のみ。sourceRefsの版・現在権限を照合し変更済みなら409 SOURCE_CHANGED、閲覧不可なら404。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DiscoveryCard](../schemas/models.md#discoverycard) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1discovery-cards~1{cardId}/get)。

<a id="operation-04-22"></a>

## 04-22 発見カード削除

`DELETE /api/v1/discovery-cards/{cardId}`

権限：本人。保存先・更新範囲：discovery_cards、discovery_reactions。

本人と版を照合しカードと反応を削除。元の生成発言は保持。

ヘッダー：[If-Match](../conventions/06_shared-http.md#if-match)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 204。

本文なし。

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 412 `VERSION_CONFLICT` / 428 `VERSION_REQUIRED` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1discovery-cards~1{cardId}/delete)。

<a id="operation-04-23"></a>

## 04-23 発見への反応

`POST /api/v1/discovery-cards/{cardId}/reactions`

権限：本人。保存先・更新範囲：discovery_reactions。

本人のカードへ固定IDで反応を保存。同じ反応ID・同じ内容は既存反応を返す。違う内容は409。保存一覧への作用は共通の発見保存規約。

ヘッダー：[Idempotency-Key](../conventions/06_shared-http.md#idempotency-key)（必須） / [X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `reaction` | known / interested / saved / blocked / dismissed | 必須 | — | — |

### 成功応答

HTTP 201。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DiscoveryReaction](../schemas/models.md#discoveryreaction) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、422 `OUTPUT_INVALID` / 409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1discovery-cards~1{cardId}~1reactions/post)。

<a id="operation-04-24"></a>

## 04-24 発見の反応履歴

`GET /api/v1/discovery-cards/{cardId}/reactions`

権限：本人。保存先・更新範囲：なし。

本人のカードの反応を時刻降順、同時刻はID降順で取得。保存表示は最新のsaved/blocked/dismissedだけを判定に使う。

並び順：`createdAt DESC, id DESC`。同値でもIDで順序を確定する。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |
| query | `cursor` | string | 省略可 | minLength=1、maxLength=2048  |
| query | `limit` | integer | 省略可 | minimum=1、maximum=100、default=50  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

[DiscoveryReactionPage](../schemas/models.md#discoveryreactionpage)

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1discovery-cards~1{cardId}~1reactions/get)。

<a id="operation-04-25"></a>

## 04-25 発見の反応取得

`GET /api/v1/discovery-cards/{cardId}/reactions/{reactionId}`

権限：本人。保存先・更新範囲：なし。

本人・cardId・reactionIdの対応を確認して返す。他人または別カードなら404。

ヘッダー：[X-Request-Id](../conventions/06_shared-http.md#x-request-id)（必須） / [X-Data-Mode](../conventions/06_shared-http.md#x-data-mode)（必須）。

### パラメータ

| 場所 | 名前 | 型 | 必須 | 制約・説明 |
|---|---|---|---|---|
| path | `cardId` | [Id](../schemas/models.md#id) | 必須 | —  |
| path | `reactionId` | [Id](../schemas/models.md#id) | 必須 | —  |

### リクエスト本文

なし。GET/DELETEに本文を送らない。

### 成功応答

HTTP 200。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [DiscoveryReaction](../schemas/models.md#discoveryreaction) | 必須 | — | — |

### 失敗応答

[共通エラー](../conventions/06_shared-http.md#共通エラー)に加え、409 `REQUEST_CONFLICT` / 413 `INPUT_TOO_LARGE` / 422 `OUTPUT_INVALID` / 503 `PROVIDER_UNAVAILABLE` / 504 `TIMEOUT`。条件・形式は[エラー定義](../conventions/06_shared-http.md#操作別エラー)を参照。

[入出力例・全応答ヘッダーとSchema](../openapi.json#/paths/~1discovery-cards~1{cardId}~1reactions~1{reactionId}/get)。
