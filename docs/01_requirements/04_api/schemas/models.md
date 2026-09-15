# 入出力の型

生成元は [build_contracts.py](../tools/build_contracts.py)。機能別文書と同じ定義から出力する。

`required`とnullの可否は別。必須かつnull可の項目はキーを送る。記載のないオブジェクト項目は拒否する。

本文上限などDB文書にない制限は今回のAPI設計案。詳細は[データ形式](../conventions/01_http.md)を参照。

## Id

string。minLength=1、maxLength=80、pattern=\S

## Version

integer。minimum=1、maximum=9007199254740991

## Timestamp

integer。minimum=-8640000000000000、maximum=8640000000000000

## Date

string (date)。—

## TimeZone

IANA timezone。実在する値をサーバーで検査する。

string。minLength=1、maxLength=80

## Position

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `longitude` | number | 必須 | minimum=-180、maximum=180 | — |
| `latitude` | number | 必須 | minimum=-90、maximum=90 | — |

## SourceRef

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | record / visit / place / checkin / route | 必須 | — | — |
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |

## Person

保存結果DTO。列の意味は ../01_DB/00_people.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `name` | string | 必須 | minLength=1、maxLength=200 | 表示名 |
| `bio` | string | 必須 | minLength=0、maxLength=10000 | 紹介文 |
| `avatarUrl` | string (uri) または null | 必須 | — | アイコンのURLまたはアセットパス |

## PersonPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | minLength=1、maxLength=200 | 表示名 |
| `bio` | string | 省略可 | minLength=0、maxLength=10000 | 紹介文 |
| `avatarUrl` | string (uri) または null | 省略可 | — | アイコンのURLまたはアセットパス |

## Place

保存結果DTO。列の意味は ../01_DB/01_places.json。API別名・非公開項目はschemas/README.md。

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/Place)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `name` | string | 必須 | minLength=1、maxLength=500 | 場所名 |
| `address` | string または null | 必須 | — | 住所。不明はNULL |
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `categories` | 配列<string> | 必須 | minItems=0、maxItems=20、uniqueItems=True | — |
| `provider` | string | 必須 | minLength=1、maxLength=100 | 場所情報の提供元 |
| `externalId` | string または null | 必須 | — | 提供元での安定ID。手動地点はNULL |
| `buildingKey` | string または null | 必須 | — | Mapboxのsource/layer/featureに対応する識別子 |
| `sourceUrl` | string (uri) または null | 必須 | — | 出典URL。不明はNULL |
| `attribution` | string | 必須 | minLength=0、maxLength=1000 | 帰属表示 |
| `fetchedAt` | integer または null | 必須 | — | 外部情報の取得時刻。手動地点はNULL |
| `version` | integer | 必須 | minimum=1 | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | integer | 必須 | minimum=0 | 作成日時。UTC Unixミリ秒 |
| `updatedAt` | integer | 必須 | minimum=0 | 更新日時。UTC Unixミリ秒 |

## PlacePatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | minLength=1、maxLength=200 | 場所名 |
| `address` | string または null | 省略可 | — | 住所。不明はNULL |
| `buildingKey` | string または null | 省略可 | — | Mapboxのsource/layer/featureに対応する識別子 |

## Visit

保存結果DTO。列の意味は ../01_DB/15_visits.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 訪問した場所 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 初期値1。訂正時に1増やす |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | 訪問した場所 |
| `placeId` | [Id](../schemas/models.md#id) | 必須 | — | 訪問した場所 |
| `startedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 訪問の開始日時 |
| `endedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 終了日時 |
| `timePrecision` | exact / approximate / unknown | 必須 | — |  |
| `origin` | manual / gps | 必須 | — | 訪問の入力元 |
| `status` | candidate / confirmed / rejected | 必須 | — |  |

## VisitCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 訪問した場所 |
| `placeId` | [Id](../schemas/models.md#id) | 必須 | — | 訪問した場所 |
| `startedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 訪問の開始日時 |
| `endedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 終了日時 |
| `timePrecision` | exact / approximate / unknown | 必須 | — |  |
| `origin` | manual / gps | 必須 | — | 訪問の入力元 |

## VisitPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `placeId` | [Id](../schemas/models.md#id) | 省略可 | — | 訪問した場所 |
| `startedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 省略可 | — | 訪問の開始日時 |
| `endedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 省略可 | — | 終了日時 |
| `timePrecision` | exact / approximate / unknown | 省略可 | — |  |
| `status` | candidate / confirmed / rejected | 省略可 | — |  |

## Activity

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `name` | string | 必須 | minLength=1、maxLength=200 | — |
| `purpose` | string または null | 必須 | — | — |
| `outcome` | string または null | 必須 | — | — |
| `satisfaction` | met / partial / not_met または null | 必須 | — | — |
| `repeatIntent` | boolean または null | 必須 | — | — |

## PeriodAnswers

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `detour` | boolean または null | 省略可 | — | — |
| `newPlace` | boolean または null | 省略可 | — | — |
| `rest` | boolean または null | 省略可 | — | — |
| `alone` | boolean または null | 省略可 | — | — |
| `longStay` | boolean または null | 省略可 | — | — |
| `farTrip` | boolean または null | 省略可 | — | — |

## RecordCreate

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

## RecordPatch

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

## Media

保存結果DTO。列の意味は ../01_DB/03_media.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 添付先の記録 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `recordId` | [Id](../schemas/models.md#id) | 必須 | — | 添付先の記録 |
| `kind` | photo / video / audio | 必須 | — | 媒体の種類 |
| `mimeType` | image/jpeg / image/png / image/webp / video/mp4 / audio/mpeg / audio/mp4 / audio/wav | 必須 | — | 検証したMIME型 |
| `byteSize` | integer | 必須 | minimum=1、maximum=52428800 | ファイルサイズ |
| `position` | integer | 必須 | minimum=0、maximum=999 | 記録内の表示順 |
| `status` | pending / ready / failed | 必須 | — | ファイル保存状態 |
| `contentUrl` | string または null | 必須 | — | — |

## Conversation

保存結果DTO。列の意味は ../01_DB/04_conversations.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 会話を開いた人物 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | 会話を開いた人物 |
| `purpose` | consult / reflection / analysis / comparison | 必須 | — | 会話の利用目的 |
| `title` | string | 必須 | minLength=1、maxLength=200 | 会話のタイトル |
| `recordId` | [Id](../schemas/models.md#id) または null | 必須 | — | 主な対象記録。記録削除時はNULL |

## ConversationCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `purpose` | consult / reflection / analysis / comparison | 必須 | — | 会話の利用目的 |
| `title` | string | 必須 | minLength=1、maxLength=200 | 会話のタイトル |
| `recordId` | [Id](../schemas/models.md#id) または null | 必須 | — | 主な対象記録。記録削除時はNULL |

## ConversationPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `title` | string | 省略可 | minLength=1、maxLength=200 | 会話のタイトル |

## Message

保存結果DTO。列の意味は ../01_DB/05_messages.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 会話ID |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `conversationId` | [Id](../schemas/models.md#id) | 必須 | — | 会話ID |
| `position` | integer | 必須 | minimum=0、maximum=9007199254740991 | 会話内の順序 |
| `role` | user / assistant | 必須 | — | 発言者 |
| `body` | string | 必須 | minLength=0、maxLength=20000 | 発言本文 |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | 送受信状態 |
| `attempt` | integer | 必須 | minimum=1、maximum=9007199254740991 | AI実行の試行番号 |
| `model` | string または null | 必須 | — | 指定したモデル。userの発言はNULL |
| `errorCode` | string または null | 必須 | — | 失敗の識別子。通常はNULL |
| `insightId` | [Id](../schemas/models.md#id) または null | 必須 | — | 発言に添える分析・比較結果のID |
| `sourceRefs` | 配列<[SourceRef](../schemas/models.md#sourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | 参照した記録・場所・回答・ルートとその版 |

## SavedRoute

保存結果DTO。列の意味は ../01_DB/06_saved_routes.json。API別名・非公開項目はschemas/README.md。

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/SavedRoute)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `personId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | 保存した人物 |
| `title` | string | 必須 | minLength=0、maxLength=100 | ルート名 |
| `waypoints` | 配列<object> | 必須 | minItems=2、maxItems=10 | 順序付きの地点・座標 |
| `mode` | walking / cycling / driving / transit | 必須 | — | — |
| `legs` | 配列<object> | 必須 | minItems=1、maxItems=9 | — |
| `geometry` | [CommonMapGeometry](../schemas/models.md#commonmapgeometry) | 必須 | — | — |
| `distanceM` | number | 必須 | minimum=0 | 経路距離。未取得はNULL |
| `durationSec` | integer | 必須 | minimum=0 | 所要時間。未取得はNULL |
| `provider` | "mapbox-directions" | 必須 | — | 経路の提供元。未取得はNULL |
| `sourceUrl` | string (uri) または null | 必須 | — | 出典URL。未取得はNULL |
| `fetchedAt` | integer | 必須 | minimum=0 | 経路の取得時刻。未取得はNULL |
| `status` | saved / navigating / finished | 必須 | — | 案内状態 |
| `currentLeg` | integer | 必須 | minimum=0 | 現在案内している区間 |
| `visibility` | private / selected / public | 必須 | — | 表示する範囲 |
| `sharedWith` | 配列<string> | 必須 | minItems=0、maxItems=100、uniqueItems=True | selectedで共有する人物IDの配列 |
| `version` | integer | 必須 | minimum=1 | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | integer | 必須 | minimum=0 | 作成日時。UTC Unixミリ秒 |
| `updatedAt` | integer | 必須 | minimum=0 | 更新日時。UTC Unixミリ秒 |

`waypoints` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `name` | string | 必須 | minLength=1、maxLength=500 | — |
| `placeId` | string または null | 必須 | — | — |

`legs` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `fromIndex` | integer | 必須 | minimum=0 | — |
| `toIndex` | integer | 必須 | minimum=1 | — |
| `geometry` | [CommonMapGeometry](../schemas/models.md#commonmapgeometry) | 必須 | — | — |
| `distanceM` | number | 必須 | exclusiveMinimum=0 | — |
| `durationSec` | integer | 必須 | minimum=0 | — |

## PluginValues

選択したPluginDefinition.settingsSchemaで追加検証必須。定義未提供のpluginIdは導入不可。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|

各プラグインのSchemaを必ず追加適用する。自由なJSONを無検査で保存しない。

## PluginSetting

保存結果DTO。列の意味は ../01_DB/07_plugin_settings.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `enabled` | boolean | 必須 | — | 有効なら1 |
| `settings` | [PluginValues](../schemas/models.md#pluginvalues) | 必須 | — | プラグイン定義の設定Schemaに適合する値 |

## PluginSettingCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `enabled` | boolean | 必須 | — | 有効なら1 |
| `settings` | [PluginValues](../schemas/models.md#pluginvalues) | 必須 | — | プラグイン定義の設定Schemaに適合する値 |

## PluginSettingPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 省略可 | — | 有効なら1 |
| `settings` | [PluginValues](../schemas/models.md#pluginvalues) | 省略可 | — | プラグイン定義の設定Schemaに適合する値 |

## FeatureRequest

保存結果DTO。列の意味は ../01_DB/08_feature_requests.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 投稿者 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | 投稿者 |
| `title` | string | 必須 | minLength=1、maxLength=200 | タイトル |
| `body` | string | 必須 | minLength=0、maxLength=10000 | 要望本文 |
| `visibility` | private / public | 必須 | — | 公開範囲 |

## FeatureRequestCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `title` | string | 必須 | minLength=1、maxLength=200 | タイトル |
| `body` | string | 必須 | minLength=0、maxLength=10000 | 要望本文 |
| `visibility` | private / public | 必須 | — | 公開範囲 |

## FeatureRequestPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `title` | string | 省略可 | minLength=1、maxLength=200 | タイトル |
| `body` | string | 省略可 | minLength=0、maxLength=10000 | 要望本文 |
| `visibility` | private / public | 省略可 | — | 公開範囲 |

## TrackPoint

保存結果DTO。列の意味は ../01_DB/09_track_points.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 端末で発行した観測ID。再送時に維持 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 観測時刻 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 観測時刻 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | 端末で発行した観測ID。再送時に維持 |
| `segmentId` | [Id](../schemas/models.md#id) | 必須 | — | 端末で発行した観測ID。再送時に維持 |
| `sourcePointId` | [Id](../schemas/models.md#id) | 必須 | — | 端末で発行した観測ID。再送時に維持 |
| `observedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 観測時刻 |
| `longitude` | number | 必須 | minimum=-180、maximum=180 | 経度 |
| `latitude` | number | 必須 | minimum=-90、maximum=90 | 緯度 |
| `accuracyM` | number | 必須 | minimum=0、maximum=100000 | 測位精度m |

## TrackPointCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 端末で発行した観測ID。再送時に維持 |
| `segmentId` | [Id](../schemas/models.md#id) | 必須 | — | 端末で発行した観測ID。再送時に維持 |
| `sourcePointId` | [Id](../schemas/models.md#id) | 必須 | — | 端末で発行した観測ID。再送時に維持 |
| `observedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 観測時刻 |
| `longitude` | number | 必須 | minimum=-180、maximum=180 | 経度 |
| `latitude` | number | 必須 | minimum=-90、maximum=90 | 緯度 |
| `accuracyM` | number | 必須 | minimum=0、maximum=100000 | 測位精度m |

## TransitSegment

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `lineId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `fromStopId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `toStopId` | [Id](../schemas/models.md#id) | 必須 | — | — |

## TransitPass

保存結果DTO。列の意味は ../01_DB/10_transit_passes.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 定期券を利用する人物 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | 定期券を利用する人物 |
| `operator` | string | 必須 | minLength=1、maxLength=200 | 交通事業者 |
| `segments` | 配列<[TransitSegment](../schemas/models.md#transitsegment)> | 必須 | minItems=1、maxItems=100 | 経由順の路線・乗降駅 |
| `validFrom` | [Date](../schemas/models.md#date) | 必須 | — | 有効終了日。その日を含む |
| `validTo` | [Date](../schemas/models.md#date) | 必須 | — | 有効終了日。その日を含む |

## TransitPassCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `operator` | string | 必須 | minLength=1、maxLength=200 | 交通事業者 |
| `segments` | 配列<[TransitSegment](../schemas/models.md#transitsegment)> | 必須 | minItems=1、maxItems=100 | 経由順の路線・乗降駅 |
| `validFrom` | [Date](../schemas/models.md#date) | 必須 | — | 有効終了日。その日を含む |
| `validTo` | [Date](../schemas/models.md#date) | 必須 | — | 有効終了日。その日を含む |

## TransitPassPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `operator` | string | 省略可 | minLength=1、maxLength=200 | 交通事業者 |
| `segments` | 配列<[TransitSegment](../schemas/models.md#transitsegment)> | 省略可 | minItems=1、maxItems=100 | 経由順の路線・乗降駅 |
| `validFrom` | [Date](../schemas/models.md#date) | 省略可 | — | 有効終了日。その日を含む |
| `validTo` | [Date](../schemas/models.md#date) | 省略可 | — | 有効終了日。その日を含む |

## CheckinAnswers

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `state` | string | 必須 | minLength=0、maxLength=10000 | — |
| `wishes` | 配列<string> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `minutes` | integer または null | 必須 | — | — |
| `note` | string | 必須 | minLength=0、maxLength=10000 | — |

## SelfCheckin

保存結果DTO。列の意味は ../01_DB/11_self_checkins.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 回答した人物 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 提案条件に使える期限 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 提案条件に使える期限 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | 回答した人物 |
| `localDate` | [Date](../schemas/models.md#date) | 必須 | — | 対象日。YYYY-MM-DD |
| `answers` | [CheckinAnswers](../schemas/models.md#checkinanswers) | 必須 | — | 任意の状態・希望・時間・補足 |
| `validUntil` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 提案条件に使える期限 |

## SelfCheckinCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `localDate` | [Date](../schemas/models.md#date) | 必須 | — | 対象日。YYYY-MM-DD |
| `answers` | [CheckinAnswers](../schemas/models.md#checkinanswers) | 必須 | — | 任意の状態・希望・時間・補足 |
| `validUntil` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 提案条件に使える期限 |

## SelfCheckinPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `localDate` | [Date](../schemas/models.md#date) | 省略可 | — | 対象日。YYYY-MM-DD |
| `answers` | [CheckinAnswers](../schemas/models.md#checkinanswers) | 省略可 | — | 任意の状態・希望・時間・補足 |
| `validUntil` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | — | 提案条件に使える期限 |

## SuggestionConditions

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `minutes` | integer | 省略可 | minimum=0、maximum=1440 | — |
| `budget` | integer | 省略可 | minimum=0、maximum=1000000 | — |
| `mode` | walking / cycling / driving / transit | 省略可 | — | — |
| `activity` | string | 省略可 | minLength=1、maxLength=200 | — |
| `note` | string | 省略可 | minLength=0、maxLength=10000 | — |

## Suggestion

保存結果DTO。列の意味は ../01_DB/12_suggestions.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 同じ検索条件で作った候補集合ID |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 提案の有効期限 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 提案の有効期限 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | 同じ検索条件で作った候補集合ID |
| `placeId` | [Id](../schemas/models.md#id) | 必須 | — | 同じ検索条件で作った候補集合ID |
| `batchId` | [Id](../schemas/models.md#id) | 必須 | — | 同じ検索条件で作った候補集合ID |
| `position` | integer | 必須 | minimum=0、maximum=9007199254740991 | 集合内の提示順 |
| `title` | string | 必須 | minLength=1、maxLength=200 | 提案する活動 |
| `activity` | string | 必須 | minLength=1、maxLength=200 | 提案する活動 |
| `reason` | string | 必須 | minLength=0、maxLength=10000 | 見送り・選び直し等の任意の原文 |
| `conditions` | [SuggestionConditions](../schemas/models.md#suggestionconditions) | 必須 | — | 検索・提案時の条件 |
| `checkinId` | [Id](../schemas/models.md#id) または null | 必須 | — | 条件として参照した回答。任意 |
| `sourceRefs` | 配列<[SourceRef](../schemas/models.md#sourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | 提案根拠のIDと版 |
| `status` | offered / later / dismissed / selected / completed / not_done | 必須 | — | 操作状態 |
| `presentedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 実際に提示した時刻。未提示はNULL |
| `selectedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 選んだ時刻。未選択はNULL |
| `expiresAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 提案の有効期限 |
| `routeId` | [Id](../schemas/models.md#id) または null | 必須 | — | 案内に使う保存ルート。任意 |
| `completedVisitId` | [Id](../schemas/models.md#id) または null | 必須 | — | 達成に対応する訪問。未達成はNULL |
| `feedback` | string | 必須 | minLength=0、maxLength=10000 | 見送り・選び直し等の任意の原文 |

## Theme

保存結果DTO。列の意味は ../01_DB/13_themes.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | テーマを作った人物 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | テーマを作った人物 |
| `name` | string | 必須 | minLength=1、maxLength=200 | テーマ名 |
| `description` | string | 必須 | minLength=0、maxLength=10000 | 説明 |
| `recordIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | テーマに含める記録ID |

## ThemeCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `name` | string | 必須 | minLength=1、maxLength=200 | テーマ名 |
| `description` | string | 必須 | minLength=0、maxLength=10000 | 説明 |
| `recordIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | テーマに含める記録ID |

## ThemePatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | minLength=1、maxLength=200 | テーマ名 |
| `description` | string | 省略可 | minLength=0、maxLength=10000 | 説明 |
| `recordIds` | 配列<[Id](../schemas/models.md#id)> | 省略可 | minItems=0、maxItems=1000、uniqueItems=True | テーマに含める記録ID |

## Friendship

保存結果DTO。列の意味は ../01_DB/14_friendships.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 申請先 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `requesterId` | [Id](../schemas/models.md#id) | 必須 | — | 申請先 |
| `recipientId` | [Id](../schemas/models.md#id) | 必須 | — | 申請先 |
| `status` | pending / accepted | 必須 | — | 関係の状態 |

## FriendshipCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 申請先 |
| `recipientId` | [Id](../schemas/models.md#id) | 必須 | — | 申請先 |

## AnalysisAxis

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `key` | detour / newPlace / rest / alone / longStay / farTrip | 必須 | — | — |
| `numerator` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |
| `denominator` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |
| `value` | number または null | 必須 | — | — |
| `unknownDays` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |

## AnalysisResult

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `axes` | 配列<[AnalysisAxis](../schemas/models.md#analysisaxis)> | 必須 | minItems=0、maxItems=6 | — |
| `unknown` | 配列<string> | 必須 | minItems=0、maxItems=1000 | — |

## ComparisonResult

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `common` | 配列<string> | 必須 | minItems=0、maxItems=1000 | — |
| `differences` | 配列<string> | 必須 | minItems=0、maxItems=1000 | — |
| `unknown` | 配列<string> | 必須 | minItems=0、maxItems=1000 | — |

## Insight

保存結果DTO。列の意味は ../01_DB/16_insights.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | この分析・比較を開く人物 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 初期値1。判断・訂正の保存時に1増やす |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | この分析・比較を開く人物 |
| `kind` | analysis / comparison | 必須 | — |  |
| `inputKey` | string | 必須 | minLength=1、maxLength=200 | 集計・説明生成の定義版 |
| `sourceRefs` | 配列<[SourceRef](../schemas/models.md#sourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | 入力に使った記録・訪問・場所・回答・ルートのIDと版 |
| `rangeStart` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 分析対象期間の開始 |
| `rangeEnd` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 分析対象期間の終端 |
| `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | — | 集計に使ったIANA timezone |
| `generatorVersion` | string | 必須 | minLength=1、maxLength=200 | 集計・説明生成の定義版 |
| `model` | string または null | 必須 | — | AIによる説明生成で指定したモデル |
| `summary` | string | 必須 | minLength=0、maxLength=10000 | 説明文 |
| `result` | [AnalysisResult](../schemas/models.md#analysisresult) または [ComparisonResult](../schemas/models.md#comparisonresult) | 必須 | — | 下記の分析・比較の構造化結果 |
| `review` | agree / disagree / unsure / edit または null | 必須 | — |  |
| `reviewNote` | string または null | 必須 | — | 判断・訂正の原文 |
| `reviewedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | 判断した日時 |

`result` の内部：

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `axes` | 配列<[AnalysisAxis](../schemas/models.md#analysisaxis)> | 必須 | minItems=0、maxItems=6 | — |
| `unknown` | 配列<string> | 必須 | minItems=0、maxItems=1000 | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `common` | 配列<string> | 必須 | minItems=0、maxItems=1000 | — |
| `differences` | 配列<string> | 必須 | minItems=0、maxItems=1000 | — |
| `unknown` | 配列<string> | 必須 | minItems=0、maxItems=1000 | — |

## InsightPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `review` | agree / disagree / unsure / edit または null | 省略可 | — |  |
| `reviewNote` | string または null | 省略可 | — | 判断・訂正の原文 |

## RecordView

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 記録した人物 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | 記録した人物 |
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
| `effectivePlaceId` | [Id](../schemas/models.md#id) または null | 必須 | — | — |
| `effectiveStartedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | — |
| `effectiveEndedAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | — |
| `effectiveTimePrecision` | exact / approximate / unknown | 必須 | — | 日時の精度 |

## Error

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `code` | INVALID_REQUEST / UNAUTHENTICATED / FORBIDDEN / NOT_FOUND / STATE_CONFLICT / IDEMPOTENCY_CONFLICT / INPUT_CHANGED / RESULT_EXPIRED / VERSION_CONFLICT / VERSION_REQUIRED / VALIDATION_FAILED / PAYLOAD_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE / RATE_LIMITED / UPSTREAM_FAILED / UNAVAILABLE / TIMEOUT / INTERNAL_ERROR / NOT_READY / INVALID_INPUT / PERSON_REQUIRED / REQUEST_CONFLICT / BUSY / SOURCE_CHANGED / INPUT_TOO_LARGE / OUTPUT_INVALID / ROUTE_NOT_FOUND / MODE_UNSUPPORTED / PROVIDER_UNAVAILABLE / RANGE_NOT_SATISFIABLE | 必須 | — | — |
| `message` | string | 必須 | minLength=0、maxLength=10000 | — |
| `requestId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `details` | object | 省略可 | — | — |

`details` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `currentVersion` | [Version](../schemas/models.md#version) | 省略可 | — | — |
| `fields` | 配列<object> | 省略可 | minItems=1、maxItems=100 | — |
| `retryAfterSec` | integer | 省略可 | minimum=1、maximum=9007199254740991 | — |
| `retryable` | boolean | 省略可 | — | — |

`fields` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `path` | string | 必須 | minLength=1、maxLength=300 | — |
| `reason` | string | 必須 | minLength=0、maxLength=10000 | — |

## ErrorEnvelope

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `error` | [Error](../schemas/models.md#error) | 必須 | — | — |

## MediaPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Media](../schemas/models.md#media)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## RecordDetail

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `record` | [RecordView](../schemas/models.md#recordview) | 必須 | — | — |
| `media` | object または object | 必須 | — | — |

`media` の内部：

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "ready" | 必須 | — | — |
| `data` | [MediaPage](../schemas/models.md#mediapage) | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "failed" | 必須 | — | — |
| `error` | [Error](../schemas/models.md#error) | 必須 | — | — |

## PlacePage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Place](../schemas/models.md#place)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## VisitPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Visit](../schemas/models.md#visit)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## RecordViewPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[RecordView](../schemas/models.md#recordview)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## PlaceDetail

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/PlaceDetail)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `place` | [CommonMapPlace](../schemas/models.md#commonmapplace) | 必須 | — | — |
| `colocated` | 配列<object> | 必須 | minItems=0、maxItems=1000 | — |
| `ownRecords` | object | 必須 | — | — |
| `sharedRecords` | object | 必須 | — | — |
| `visits` | object | 必須 | — | — |

`colocated` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `name` | string | 必須 | minLength=1、maxLength=500 | — |
| `address` | string または null | 必須 | — | — |
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |

`ownRecords` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | ready / failed | 必須 | — | — |
| `items` | 配列<[CommonInfoRecordView](../schemas/models.md#commoninforecordview)> | 必須 | minItems=0、maxItems=100000 | — |
| `error` | [CommonInfoError](../schemas/models.md#commoninfoerror) または null | 必須 | — | — |

`sharedRecords` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | ready / failed | 必須 | — | — |
| `items` | 配列<[CommonInfoRecordView](../schemas/models.md#commoninforecordview)> | 必須 | minItems=0、maxItems=100000 | — |
| `error` | [CommonInfoError](../schemas/models.md#commoninfoerror) または null | 必須 | — | — |

`visits` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | ready / failed | 必須 | — | — |
| `items` | 配列<[CommonInfoVisitView](../schemas/models.md#commoninfovisitview)> | 必須 | minItems=0、maxItems=100000 | — |
| `error` | [CommonInfoError](../schemas/models.md#commoninfoerror) または null | 必須 | — | — |

## Candidate

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/PlaceCandidate)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `candidateId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `placeId` | string または null | 必須 | — | — |
| `name` | string | 必須 | minLength=1、maxLength=500 | — |
| `address` | string または null | 必須 | — | — |
| `position` | [Position](../schemas/models.md#position) | 必須 | — | — |
| `categories` | 配列<string> | 必須 | minItems=0、maxItems=20、uniqueItems=True | — |
| `provider` | string | 必須 | minLength=1、maxLength=100 | — |
| `externalId` | string または null | 必須 | — | — |
| `buildingKey` | string または null | 必須 | — | — |
| `sourceUrl` | string (uri) または null | 必須 | — | — |
| `attribution` | string | 必須 | minLength=0、maxLength=1000 | — |
| `fetchedAt` | integer または null | 必須 | — | — |
| `retention` | storable / temporary | 必須 | — | — |

## CandidateResult

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `resultId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `expiresAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `items` | 配列<[Candidate](../schemas/models.md#candidate)> | 必須 | minItems=0、maxItems=10 | — |

## PlaceCreate

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

## GrowthItem

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `place` | [Place](../schemas/models.md#place) | 必須 | — | — |
| `confirmedVisitCount` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |
| `purposes` | 配列<string> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `sourceRefs` | 配列<[SourceRef](../schemas/models.md#sourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |

## RouteSearchResult

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/RoutePreview)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `resultId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `waypoints` | 配列<object> | 必須 | minItems=2、maxItems=10 | — |
| `mode` | walking / cycling / driving / transit | 必須 | — | — |
| `legs` | 配列<object> | 必須 | minItems=1、maxItems=9 | — |
| `geometry` | [CommonMapGeometry](../schemas/models.md#commonmapgeometry) | 必須 | — | — |
| `distanceM` | number | 必須 | exclusiveMinimum=0 | — |
| `durationSec` | integer | 必須 | minimum=0 | — |
| `provider` | "mapbox-directions" | 必須 | — | — |
| `fetchedAt` | integer | 必須 | minimum=0 | — |
| `expiresAt` | integer | 必須 | minimum=0 | — |
| `retention` | storable / temporary | 必須 | — | — |

`waypoints` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `name` | string | 必須 | minLength=1、maxLength=500 | — |
| `placeId` | string または null | 必須 | — | — |

`legs` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `fromIndex` | integer | 必須 | minimum=0 | — |
| `toIndex` | integer | 必須 | minimum=1 | — |
| `geometry` | [CommonMapGeometry](../schemas/models.md#commonmapgeometry) | 必須 | — | — |
| `distanceM` | number | 必須 | exclusiveMinimum=0 | — |
| `durationSec` | integer | 必須 | minimum=0 | — |

## RouteSearchInput

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/RouteRequest)

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

## SavedRouteCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `resultId` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `title` | string | 必須 | minLength=1、maxLength=100 | ルート名 |

## SavedRoutePatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `title` | string | 省略可 | minLength=1、maxLength=100 | ルート名 |
| `resultId` | [Id](../schemas/models.md#id) | 省略可 | — | — |
| `status` | saved / navigating / finished | 省略可 | — | 案内状態 |
| `currentLeg` | integer | 省略可 | minimum=0、maximum=98 | 現在案内している区間 |
| `visibility` | private / selected / public | 省略可 | — | 表示する範囲 |
| `sharedWith` | 配列<[Id](../schemas/models.md#id)> | 省略可 | minItems=0、maxItems=100、uniqueItems=True | selectedで共有する人物IDの配列 |

## SuggestionBatchInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `checkin` | [SourceRef](../schemas/models.md#sourceref) または null | 必須 | — | — |
| `origin` | [Position](../schemas/models.md#position) | 必須 | — | — |
| `conditions` | [SuggestionConditions](../schemas/models.md#suggestionconditions) | 必須 | — | — |
| `excludedActivities` | 配列<string> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `excludedPlaceIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `expiresAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |

## SuggestionBatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `items` | 配列<[Suggestion](../schemas/models.md#suggestion)> | 必須 | minItems=0、maxItems=20 | — |

## SuggestionPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | offered / later / dismissed / selected / completed / not_done | 省略可 | — | 操作状態 |
| `presented` | true | 省略可 | — | — |
| `routeId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 案内に使う保存ルート。任意 |
| `completedVisitId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 達成に対応する訪問。未達成はNULL |
| `feedback` | string | 省略可 | minLength=0、maxLength=10000 | 見送り・選び直し等の任意の原文 |

## MediaUpload

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `file` | string (binary) | 必須 | — | — |
| `position` | integer | 必須 | minimum=0、maximum=99 | — |

## MediaOrderInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<object> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |

`items` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |

## VersionedId

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |

## TrackDelete

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `segmentId` | [Id](../schemas/models.md#id) または null | 必須 | — | — |
| `from` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `to` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `targets` | 配列<[VersionedId](../schemas/models.md#versionedid)> | 必須 | minItems=1、maxItems=1000、uniqueItems=True | — |

## DeletedCount

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `deletedCount` | integer | 必須 | minimum=0、maximum=1000 | — |

## SourceLookupInput

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/SourcesRequest)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `refs` | 配列<[CommonInfoSourceRef](../schemas/models.md#commoninfosourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |

## SourceLookup

配列<[CommonInfoSourceCheck](../schemas/models.md#commoninfosourcecheck)>。minItems=0、maxItems=1000

## SelfCheckinPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[SelfCheckin](../schemas/models.md#selfcheckin)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## DailyReflection

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `date` | [Date](../schemas/models.md#date) | 必須 | — | — |
| `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | — | — |
| `from` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `to` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `visits` | object または object | 必須 | — | — |
| `records` | object または object | 必須 | — | — |
| `checkins` | object または object | 必須 | — | — |

`visits` の内部：

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "ready" | 必須 | — | — |
| `data` | [VisitPage](../schemas/models.md#visitpage) | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "failed" | 必須 | — | — |
| `error` | [Error](../schemas/models.md#error) | 必須 | — | — |

`records` の内部：

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "ready" | 必須 | — | — |
| `data` | [RecordViewPage](../schemas/models.md#recordviewpage) | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "failed" | 必須 | — | — |
| `error` | [Error](../schemas/models.md#error) | 必須 | — | — |

`checkins` の内部：

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "ready" | 必須 | — | — |
| `data` | [SelfCheckinPage](../schemas/models.md#selfcheckinpage) | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | "failed" | 必須 | — | — |
| `error` | [Error](../schemas/models.md#error) | 必須 | — | — |

## Summary

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `from` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `to` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | — | — |
| `result` | [AnalysisResult](../schemas/models.md#analysisresult) | 必須 | — | — |
| `sourceRefs` | 配列<[SourceRef](../schemas/models.md#sourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |

## MessageSend

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

## MessageAccepted

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `userMessage` | [Message](../schemas/models.md#message) | 必須 | — | — |
| `assistantMessage` | [Message](../schemas/models.md#message) | 必須 | — | — |
| `statusUrl` | string | 必須 | minLength=1、maxLength=400 | — |

## MessageRetry

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `attempt` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

## AIOutput

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `use` | "extract" | 必須 | — | — |
| `value` | [CommonAIextractResult](../schemas/models.md#commonaiextractresult) | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `use` | "diary" | 必須 | — | — |
| `value` | [CommonAIdiaryResult](../schemas/models.md#commonaidiaryresult) | 必須 | — | — |

分岐 3

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `use` | "consult" | 必須 | — | — |
| `value` | [CommonAIconsultResult](../schemas/models.md#commonaiconsultresult) | 必須 | — | — |

分岐 4

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `use` | "comparison" | 必須 | — | — |
| `value` | [CommonAIcompareResult](../schemas/models.md#commonaicompareresult) | 必須 | — | — |

分岐 5

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `use` | "analysis" | 必須 | — | — |
| `value` | [CommonAIanalysisResult](../schemas/models.md#commonaianalysisresult) | 必須 | — | — |

分岐 6

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `use` | "theme-name" | 必須 | — | — |
| `value` | [CommonAIthemeResult](../schemas/models.md#commonaithemeresult) | 必須 | — | — |

分岐 7

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `use` | "map-style" | 必須 | — | — |
| `value` | [CommonAImapstyleResult](../schemas/models.md#commonaimapstyleresult) | 必須 | — | — |

分岐 8

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `use` | "discovery" | 必須 | — | — |
| `value` | [CommonAIdiscoverResult](../schemas/models.md#commonaidiscoverresult) | 必須 | — | — |

## MessageResult

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `message` | [Message](../schemas/models.md#message) | 必須 | — | — |
| `run` | [CommonAIRun](../schemas/models.md#commonairun) または null | 必須 | — | — |
| `output` | [AIOutput](../schemas/models.md#aioutput) または null | 必須 | — | — |

## RetryAccepted

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `message` | [Message](../schemas/models.md#message) | 必須 | — | — |
| `statusUrl` | string | 必須 | minLength=1、maxLength=400 | — |

## PluginDefinition

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `name` | string | 必須 | minLength=1、maxLength=200 | — |
| `description` | string | 必須 | minLength=0、maxLength=10000 | — |
| `settingsSchema` | object | 必須 | — | JSON Schema 2020-12。各プラグインの定義を参照する。 |
| `installed` | [PluginSetting](../schemas/models.md#pluginsetting) または null | 必須 | — | — |

`settingsSchema` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|

## GrowthItemPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[GrowthItem](../schemas/models.md#growthitem)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## TrackPointPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[TrackPoint](../schemas/models.md#trackpoint)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## ConversationPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Conversation](../schemas/models.md#conversation)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## ThemePage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Theme](../schemas/models.md#theme)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## InsightPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Insight](../schemas/models.md#insight)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## SuggestionPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Suggestion](../schemas/models.md#suggestion)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## SavedRoutePage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[SavedRoute](../schemas/models.md#savedroute)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## TransitPassPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[TransitPass](../schemas/models.md#transitpass)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## PersonPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Person](../schemas/models.md#person)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## FriendshipPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[Friendship](../schemas/models.md#friendship)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## PluginSettingPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[PluginSetting](../schemas/models.md#pluginsetting)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## FeatureRequestPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[FeatureRequest](../schemas/models.md#featurerequest)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## CommonAISourceRef

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/SourceRef)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | record / visit / place / checkin / route | 必須 | — | — |
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `version` | integer | 必須 | minimum=1 | — |

## CommonAIError

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/Error)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `code` | string | 必須 | minLength=1、maxLength=80 | — |
| `message` | string | 必須 | minLength=1、maxLength=2000 | — |
| `retryable` | boolean | 必須 | — | — |

## CommonAIRun

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/Run)

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `conversationId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `userMessageId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | — |
| `attempt` | integer | 必須 | minimum=1 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `model` | string | 必須 | minLength=1、maxLength=200 | — |
| `promptVersion` | string | 必須 | minLength=1、maxLength=100 | — |
| `error` | [CommonAIError](../schemas/models.md#commonaierror) または null | 必須 | — | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `insightId` | string または null | 必須 | — | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `task` | "extract" | 必須 | — | — |
| `result` | object または null | 必須 | — | — |

`result` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `purpose` | string または null | 必須 | — | — |
| `reason` | string または null | 必須 | — | — |
| `context` | object | 必須 | — | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `question` | object または null | 必須 | — | — |

`context` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `weather` | clear / rain / snow / other または null | 必須 | — | — |
| `companion` | alone / friend / family / colleague / other または null | 必須 | — | — |
| `timeBudgetMinutes` | integer または null | 必須 | — | — |
| `timeBand` | morning / day / evening / night または null | 必須 | — | — |
| `notes` | string または null | 必須 | — | — |

`question` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `topic` | purpose / reason / context / alternative | 必須 | — | — |
| `text` | string | 必須 | minLength=1、maxLength=500 | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `conversationId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `userMessageId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | — |
| `attempt` | integer | 必須 | minimum=1 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `model` | string | 必須 | minLength=1、maxLength=200 | — |
| `promptVersion` | string | 必須 | minLength=1、maxLength=100 | — |
| `error` | [CommonAIError](../schemas/models.md#commonaierror) または null | 必須 | — | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `insightId` | string または null | 必須 | — | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `task` | "diary" | 必須 | — | — |
| `result` | object または null | 必須 | — | — |

`result` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `text` | string | 必須 | minLength=1、maxLength=20000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=1、maxItems=1000、uniqueItems=True | — |

分岐 3

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `conversationId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `userMessageId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | — |
| `attempt` | integer | 必須 | minimum=1 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `model` | string | 必須 | minLength=1、maxLength=200 | — |
| `promptVersion` | string | 必須 | minLength=1、maxLength=100 | — |
| `error` | [CommonAIError](../schemas/models.md#commonaierror) または null | 必須 | — | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `insightId` | string または null | 必須 | — | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `task` | "consult" | 必須 | — | — |
| `result` | object または null | 必須 | — | — |

`result` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `summary` | string | 必須 | minLength=0、maxLength=2000 | — |
| `candidates` | 配列<object> | 必須 | minItems=0、maxItems=20 | — |
| `unknowns` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

`candidates` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `placeId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `reason` | string | 必須 | minLength=1、maxLength=2000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `unknowns` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

分岐 4

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `conversationId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `userMessageId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | — |
| `attempt` | integer | 必須 | minimum=1 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `model` | string | 必須 | minLength=1、maxLength=200 | — |
| `promptVersion` | string | 必須 | minLength=1、maxLength=100 | — |
| `error` | [CommonAIError](../schemas/models.md#commonaierror) または null | 必須 | — | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `insightId` | string または null | 必須 | — | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `task` | "compare" | 必須 | — | — |
| `result` | object または null | 必須 | — | — |

`result` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `mappings` | 配列<object> | 必須 | minItems=0、maxItems=400 | — |

`mappings` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `fromRecordId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `toRecordId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `relation` | same-place-same-purpose / same-place-different-purpose / different-place-same-role / practical-tip / similar-but-different-reason | 必須 | — | — |
| `explanation` | string | 必須 | minLength=1、maxLength=1500 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `rejected` | false | 必須 | — | — |

分岐 5

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `conversationId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `userMessageId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | — |
| `attempt` | integer | 必須 | minimum=1 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `model` | string | 必須 | minLength=1、maxLength=200 | — |
| `promptVersion` | string | 必須 | minLength=1、maxLength=100 | — |
| `error` | [CommonAIError](../schemas/models.md#commonaierror) または null | 必須 | — | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `insightId` | string または null | 必須 | — | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `task` | "analysis" | 必須 | — | — |
| `result` | object または null | 必須 | — | — |

`result` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `summary` | string | 必須 | minLength=1、maxLength=2000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `unknowns` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

分岐 6

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `conversationId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `userMessageId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | — |
| `attempt` | integer | 必須 | minimum=1 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `model` | string | 必須 | minLength=1、maxLength=200 | — |
| `promptVersion` | string | 必須 | minLength=1、maxLength=100 | — |
| `error` | [CommonAIError](../schemas/models.md#commonaierror) または null | 必須 | — | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `insightId` | string または null | 必須 | — | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `task` | "theme" | 必須 | — | — |
| `result` | object または null | 必須 | — | — |

`result` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 必須 | minLength=1、maxLength=100 | — |
| `description` | string | 必須 | minLength=0、maxLength=1000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |

分岐 7

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `conversationId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `userMessageId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | — |
| `attempt` | integer | 必須 | minimum=1 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `model` | string | 必須 | minLength=1、maxLength=200 | — |
| `promptVersion` | string | 必須 | minLength=1、maxLength=100 | — |
| `error` | [CommonAIError](../schemas/models.md#commonaierror) または null | 必須 | — | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `insightId` | string または null | 必須 | — | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `task` | "mapstyle" | 必須 | — | — |
| `result` | object または null | 必須 | — | — |

`result` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `proposal` | object | 必須 | — | — |
| `explanation` | string | 必須 | minLength=1、maxLength=1000 | — |

`proposal` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `theme` | default / faded / monochrome | 必須 | — | — |
| `lightPreset` | dawn / day / dusk / night | 必須 | — | — |
| `showPedestrianRoads` | boolean | 必須 | — | — |
| `showAdminBoundaries` | boolean | 必須 | — | — |
| `showIndoor` | boolean | 必須 | — | — |
| `colors` | object または null | 必須 | — | — |

`colors` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `water` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |
| `greenspace` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |
| `roads` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |
| `buildings` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |

分岐 8

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `conversationId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `userMessageId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | — |
| `attempt` | integer | 必須 | minimum=1 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `model` | string | 必須 | minLength=1、maxLength=200 | — |
| `promptVersion` | string | 必須 | minLength=1、maxLength=100 | — |
| `error` | [CommonAIError](../schemas/models.md#commonaierror) または null | 必須 | — | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `insightId` | string または null | 必須 | — | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `task` | "discover" | 必須 | — | — |
| `result` | object または null | 必須 | — | — |

`result` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `anchor` | object | 必須 | — | — |
| `bridge` | string | 必須 | minLength=0、maxLength=1500 | — |
| `knowledge` | string | 必須 | minLength=0、maxLength=2500 | — |
| `observationPrompt` | string | 必須 | minLength=0、maxLength=1000 | — |
| `conceptIds` | 配列<string> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `sources` | 配列<object> | 必須 | minItems=0、maxItems=50 | — |

`anchor` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | place / building / photo | 必須 | — | — |
| `targetId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `features` | 配列<string> | 必須 | minItems=1、maxItems=10 | — |

`sources` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `url` | string (uri) または null | 必須 | — | — |
| `title` | string | 必須 | minLength=1、maxLength=300 | — |
| `claimScope` | general / place-specific | 必須 | — | — |
| `sourceId` | string または null | 必須 | — | — |

## CommonAIMessage

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/Message)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `conversationId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `position` | integer | 必須 | minimum=0 | — |
| `role` | user / assistant | 必須 | — | — |
| `body` | string | 必須 | minLength=0、maxLength=20000 | — |
| `status` | pending / running / complete / failed / cancelled | 必須 | — | — |
| `attempt` | integer | 必須 | minimum=1 | — |
| `model` | string または null | 必須 | — | — |
| `insightId` | string または null | 必須 | — | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `version` | integer | 必須 | minimum=1 | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |

## CommonAIMessagePage

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/MessagePage)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[CommonAIMessage](../schemas/models.md#commonaimessage)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## CommonAIOrigin

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/Origin)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `label` | string | 必須 | minLength=1、maxLength=200 | — |
| `kind` | current-location / map-center / selected / demo | 必須 | — | — |

## CommonAIDialogueRequest

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/DialogueRequest)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `text` | string | 必須 | minLength=1、maxLength=300 | — |
| `origin` | [CommonAIOrigin](../schemas/models.md#commonaiorigin) | 必須 | — | — |

## CommonAIDialogueSelect

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/DialogueSelect)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `resultId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `candidateId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |

## CommonAIDialogueCancel

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/DialogueCancel)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `requestId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |

## CommonAIDialogueResult

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/DialogueResult)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `resultId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `text` | string | 必須 | minLength=1、maxLength=4000 | — |
| `places` | 配列<[CommonMapPlaceCandidate](../schemas/models.md#commonmapplacecandidate)> | 必須 | minItems=0、maxItems=5 | — |
| `routes` | 配列<[CommonMapRoutePreview](../schemas/models.md#commonmaproutepreview)> | 必須 | minItems=0、maxItems=3 | — |
| `origin` | [CommonAIOrigin](../schemas/models.md#commonaiorigin) | 必須 | — | — |
| `expiresAt` | integer | 必須 | minimum=0 | — |

## CommonAIextractInput

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/extractInput)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `recordId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `answers` | 配列<object> | 必須 | minItems=0、maxItems=10 | — |

`answers` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `question` | string | 必須 | minLength=1、maxLength=500 | — |
| `text` | string | 必須 | minLength=1、maxLength=4000 | — |

## CommonAIextractResult

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/extractResult)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `purpose` | string または null | 必須 | — | — |
| `reason` | string または null | 必須 | — | — |
| `context` | object | 必須 | — | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `question` | object または null | 必須 | — | — |

`context` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `weather` | clear / rain / snow / other または null | 必須 | — | — |
| `companion` | alone / friend / family / colleague / other または null | 必須 | — | — |
| `timeBudgetMinutes` | integer または null | 必須 | — | — |
| `timeBand` | morning / day / evening / night または null | 必須 | — | — |
| `notes` | string または null | 必須 | — | — |

`question` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `topic` | purpose / reason / context / alternative | 必須 | — | — |
| `text` | string | 必須 | minLength=1、maxLength=500 | — |

## CommonAIdiaryInput

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/diaryInput)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `date` | string (date) | 必須 | — | — |
| `timezone` | string | 必須 | minLength=1、maxLength=100 | — |
| `recordIds` | 配列<string> | 必須 | minItems=1、maxItems=100、uniqueItems=True | — |

## CommonAIdiaryResult

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/diaryResult)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `text` | string | 必須 | minLength=1、maxLength=20000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=1、maxItems=1000、uniqueItems=True | — |

## CommonAIconsultInput

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/consultInput)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `placeIds` | 配列<string> | 必須 | minItems=1、maxItems=20、uniqueItems=True | — |
| `recordIds` | 配列<string> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `conditions` | string | 必須 | minLength=0、maxLength=4000 | — |

## CommonAIconsultResult

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/consultResult)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `summary` | string | 必須 | minLength=0、maxLength=2000 | — |
| `candidates` | 配列<object> | 必須 | minItems=0、maxItems=20 | — |
| `unknowns` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

`candidates` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `placeId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `reason` | string | 必須 | minLength=1、maxLength=2000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `unknowns` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

## CommonAIcompareInput

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/compareInput)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `fromRecordIds` | 配列<string> | 必須 | minItems=1、maxItems=20、uniqueItems=True | — |
| `toRecordIds` | 配列<string> | 必須 | minItems=1、maxItems=20、uniqueItems=True | — |

## CommonAIcompareResult

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/compareResult)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `mappings` | 配列<object> | 必須 | minItems=0、maxItems=400 | — |

`mappings` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `fromRecordId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `toRecordId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `relation` | same-place-same-purpose / same-place-different-purpose / different-place-same-role / practical-tip / similar-but-different-reason | 必須 | — | — |
| `explanation` | string | 必須 | minLength=1、maxLength=1500 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `rejected` | false | 必須 | — | — |

## CommonAIanalysisInput

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/analysisInput)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `insightId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |

## CommonAIanalysisResult

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/analysisResult)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `summary` | string | 必須 | minLength=1、maxLength=2000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `unknowns` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

## CommonAIthemeInput

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/themeInput)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `recordIds` | 配列<string> | 必須 | minItems=1、maxItems=100、uniqueItems=True | — |
| `currentName` | string | 必須 | minLength=0、maxLength=100 | — |

## CommonAIthemeResult

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/themeResult)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 必須 | minLength=1、maxLength=100 | — |
| `description` | string | 必須 | minLength=0、maxLength=1000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |

## CommonAImapstyleInput

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/mapstyleInput)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `current` | object | 必須 | — | — |

`current` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `theme` | default / faded / monochrome | 必須 | — | — |
| `lightPreset` | dawn / day / dusk / night | 必須 | — | — |
| `showPedestrianRoads` | boolean | 必須 | — | — |
| `showAdminBoundaries` | boolean | 必須 | — | — |
| `showIndoor` | boolean | 必須 | — | — |
| `colors` | object または null | 必須 | — | — |

`colors` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `water` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |
| `greenspace` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |
| `roads` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |
| `buildings` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |

## CommonAImapstyleResult

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/mapstyleResult)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `proposal` | object | 必須 | — | — |
| `explanation` | string | 必須 | minLength=1、maxLength=1000 | — |

`proposal` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `theme` | default / faded / monochrome | 必須 | — | — |
| `lightPreset` | dawn / day / dusk / night | 必須 | — | — |
| `showPedestrianRoads` | boolean | 必須 | — | — |
| `showAdminBoundaries` | boolean | 必須 | — | — |
| `showIndoor` | boolean | 必須 | — | — |
| `colors` | object または null | 必須 | — | — |

`colors` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `water` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |
| `greenspace` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |
| `roads` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |
| `buildings` | string | 必須 | pattern=^#[0-9A-Fa-f]{6}$ | — |

## CommonAIdiscoverInput

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/discoverInput)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `anchor` | object | 必須 | — | — |
| `factKeys` | 配列<string> | 必須 | minItems=0、maxItems=50、uniqueItems=True | — |

`anchor` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | place / building / photo | 必須 | — | — |
| `targetId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `features` | 配列<string> | 必須 | minItems=1、maxItems=10 | — |

## CommonAIdiscoverResult

[共通型の照合元](../../02_common/01_ai/schemas.json#/definitions/discoverResult)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `anchor` | object | 必須 | — | — |
| `bridge` | string | 必須 | minLength=0、maxLength=1500 | — |
| `knowledge` | string | 必須 | minLength=0、maxLength=2500 | — |
| `observationPrompt` | string | 必須 | minLength=0、maxLength=1000 | — |
| `conceptIds` | 配列<string> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `sources` | 配列<object> | 必須 | minItems=0、maxItems=50 | — |

`anchor` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | place / building / photo | 必須 | — | — |
| `targetId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `features` | 配列<string> | 必須 | minItems=1、maxItems=10 | — |

`sources` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `url` | string (uri) または null | 必須 | — | — |
| `title` | string | 必須 | minLength=1、maxLength=300 | — |
| `claimScope` | general / place-specific | 必須 | — | — |
| `sourceId` | string または null | 必須 | — | — |

## CommonMapGeometry

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/Geometry)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "LineString" | 必須 | — | — |
| `coordinates` | 配列<配列<座標2値>> | 必須 | minItems=2、maxItems=100000 | — |

## CommonMapPlace

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/Place)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `name` | string | 必須 | minLength=1、maxLength=500 | — |
| `address` | string または null | 必須 | — | — |
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `categories` | 配列<string> | 必須 | minItems=0、maxItems=20、uniqueItems=True | — |
| `provider` | string | 必須 | minLength=1、maxLength=100 | — |
| `externalId` | string または null | 必須 | — | — |
| `buildingKey` | string または null | 必須 | — | — |
| `sourceUrl` | string (uri) または null | 必須 | — | — |
| `attribution` | string | 必須 | minLength=0、maxLength=1000 | — |
| `fetchedAt` | integer または null | 必須 | — | — |
| `version` | integer | 必須 | minimum=1 | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |

## CommonMapPlaceCandidate

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/PlaceCandidate)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `candidateId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `placeId` | string または null | 必須 | — | — |
| `name` | string | 必須 | minLength=1、maxLength=500 | — |
| `address` | string または null | 必須 | — | — |
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `categories` | 配列<string> | 必須 | minItems=0、maxItems=20、uniqueItems=True | — |
| `provider` | string | 必須 | minLength=1、maxLength=100 | — |
| `externalId` | string または null | 必須 | — | — |
| `buildingKey` | string または null | 必須 | — | — |
| `sourceUrl` | string (uri) または null | 必須 | — | — |
| `attribution` | string | 必須 | minLength=0、maxLength=1000 | — |
| `fetchedAt` | integer または null | 必須 | — | — |
| `retention` | storable / temporary | 必須 | — | — |

## CommonMapRoutePreview

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/RoutePreview)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `previewId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `waypoints` | 配列<object> | 必須 | minItems=2、maxItems=10 | — |
| `mode` | walking / cycling / driving / transit | 必須 | — | — |
| `legs` | 配列<object> | 必須 | minItems=1、maxItems=9 | — |
| `geometry` | [CommonMapGeometry](../schemas/models.md#commonmapgeometry) | 必須 | — | — |
| `distanceM` | number | 必須 | exclusiveMinimum=0 | — |
| `durationSec` | integer | 必須 | minimum=0 | — |
| `provider` | "mapbox-directions" | 必須 | — | — |
| `fetchedAt` | integer | 必須 | minimum=0 | — |
| `expiresAt` | integer | 必須 | minimum=0 | — |
| `retention` | storable / temporary | 必須 | — | — |

`waypoints` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `name` | string | 必須 | minLength=1、maxLength=500 | — |
| `placeId` | string または null | 必須 | — | — |

`legs` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `fromIndex` | integer | 必須 | minimum=0 | — |
| `toIndex` | integer | 必須 | minimum=1 | — |
| `geometry` | [CommonMapGeometry](../schemas/models.md#commonmapgeometry) | 必須 | — | — |
| `distanceM` | number | 必須 | exclusiveMinimum=0 | — |
| `durationSec` | integer | 必須 | minimum=0 | — |

## CommonInfoSourceRef

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/SourceRef)

項目・型・必須条件・制約は [CommonAISourceRef](#commonaisourceref) と同一。

## CommonInfoError

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/Error)

項目・型・必須条件・制約は [CommonAIError](#commonaierror) と同一。

## CommonInfoMediaView

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/MediaView)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `kind` | photo / video / audio | 必須 | — | — |
| `mimeType` | string | 必須 | minLength=1、maxLength=200 | — |
| `byteSize` | integer | 必須 | minimum=0 | — |
| `position` | integer | 必須 | minimum=0 | — |
| `status` | pending / ready / failed | 必須 | — | — |
| `contentUrl` | string または null | 必須 | — | — |

## CommonInfoRecordView

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/RecordView)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `person` | object | 必須 | — | — |
| `kind` | experience / diary / memo | 必須 | — | — |
| `body` | string | 必須 | minLength=0、maxLength=20000 | — |
| `place` | object または null | 必須 | — | — |
| `effectiveAt` | integer または null | 必須 | — | — |
| `endedAt` | integer または null | 必須 | — | — |
| `timePrecision` | exact / approximate / unknown | 必須 | — | — |
| `visitStatus` | candidate / confirmed / rejected または null | 必須 | — | — |
| `purposes` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `impression` | string | 必須 | minLength=0、maxLength=4000 | — |
| `topicKey` | string または null | 必須 | — | — |
| `visibility` | private / selected / public | 必須 | — | — |
| `version` | integer | 必須 | minimum=1 | — |
| `sourceRefs` | 配列<[CommonInfoSourceRef](../schemas/models.md#commoninfosourceref)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | — |
| `media` | 配列<[CommonInfoMediaView](../schemas/models.md#commoninfomediaview)> | 必須 | minItems=0、maxItems=100 | — |

`person` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `displayName` | string | 必須 | minLength=1、maxLength=200 | — |
| `iconPath` | string または null | 必須 | — | — |

`place` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `name` | string | 必須 | minLength=1、maxLength=500 | — |
| `address` | string または null | 必須 | — | — |
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |

## CommonInfoRecordPage

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/RecordPage)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[CommonInfoRecordView](../schemas/models.md#commoninforecordview)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |
| `totalCount` | integer | 必須 | minimum=0 | — |

## CommonInfoRecordMap

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/RecordMap)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<object> | 必須 | minItems=0、maxItems=2000 | — |
| `totalCount` | integer | 必須 | minimum=0 | — |

`items` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `recordId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `personId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `placeId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `mediaId` | string または null | 必須 | — | — |

## CommonInfoSourceCheck

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/SourceCheck)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `ref` | [CommonInfoSourceRef](../schemas/models.md#commoninfosourceref) | 必須 | — | — |
| `state` | current / changed / unavailable | 必須 | — | — |
| `currentVersion` | integer または null | 必須 | — | — |

## CommonInfoVisitView

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/VisitView)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `placeId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `startedAt` | integer または null | 必須 | — | — |
| `endedAt` | integer または null | 必須 | — | — |
| `timePrecision` | exact / approximate / unknown | 必須 | — | — |
| `origin` | manual / gps | 必須 | — | — |
| `status` | candidate / confirmed / rejected | 必須 | — | — |
| `version` | integer | 必須 | minimum=1 | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |

## DiscoveryCard

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `anchor` | object | 必須 | — | — |
| `bridge` | string | 必須 | minLength=0、maxLength=1500 | — |
| `knowledge` | string | 必須 | minLength=0、maxLength=2500 | — |
| `observationPrompt` | string | 必須 | minLength=0、maxLength=1000 | — |
| `conceptIds` | 配列<string> | 必須 | minItems=0、maxItems=100、uniqueItems=True | — |
| `sources` | 配列<object> | 必須 | minItems=0、maxItems=50 | — |
| `sourceRefs` | 配列<[CommonAISourceRef](../schemas/models.md#commonaisourceref)> | 必須 | minItems=0、maxItems=1000 | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |

`anchor` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | place / building / photo | 必須 | — | — |
| `targetId` | string | 必須 | minLength=1、maxLength=80、pattern=\S | — |
| `features` | 配列<string> | 必須 | minItems=1、maxItems=10 | — |

`sources` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `url` | string (uri) または null | 必須 | — | — |
| `title` | string | 必須 | minLength=1、maxLength=300 | — |
| `claimScope` | general / place-specific | 必須 | — | — |
| `sourceId` | string または null | 必須 | — | — |

## DiscoveryReaction

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `cardId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `reaction` | known / interested / saved / blocked / dismissed | 必須 | — | — |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |

## DiscoveryCardPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[DiscoveryCard](../schemas/models.md#discoverycard)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |

## DiscoveryReactionPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[DiscoveryReaction](../schemas/models.md#discoveryreaction)> | 必須 | minItems=0、maxItems=100 | — |
| `nextCursor` | string または null | 必須 | — | — |
