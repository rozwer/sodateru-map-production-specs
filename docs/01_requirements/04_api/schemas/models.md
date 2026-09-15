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
| `name` | string | 必須 | minLength=1、maxLength=20 | 表示名 |
| `bio` | string | 必須 | minLength=0、maxLength=200 | 紹介文 |
| `avatarUrl` | string (uri) または null | 必須 | — | アイコンのURLまたはアセットパス |

## PersonPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | minLength=1、maxLength=20 | — |
| `bio` | string | 省略可 | maxLength=200 | — |
| `avatarUrl` | string (uri) または null | 省略可 | — | — |

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

Manual values override provider refresh. resetFields removes corrections and restores latest saved provider values. refreshExternal performs Nominatim lookup before the version-checked transaction. All active local users in the same dataMode may collaboratively edit; If-Match is required.

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | minLength=1、maxLength=200 | 場所名 |
| `address` | string または null | 省略可 | — | — |
| `buildingKey` | string または null | 省略可 | — | — |
| `openingHours` | [PlaceOpeningHours](../schemas/models.md#placeopeninghours) または null | 省略可 | — | — |
| `entrances` | 配列<[PlaceEntrance](../schemas/models.md#placeentrance)> | 省略可 | maxItems=100 | — |
| `resetFields` | 配列<name / address / buildingKey / openingHours / entrances> | 省略可 | minItems=1、uniqueItems=True | — |
| `refreshExternal` | true | 省略可 | — | — |

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
| `memo` | [MemoPresentation](../schemas/models.md#memopresentation) | 省略可 | — | — |

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
| `memo` | [MemoPresentation](../schemas/models.md#memopresentation) | 省略可 | — | — |

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
| `requestedConditions` | [RouteConditions](../schemas/models.md#routeconditions) | 省略可 | — | — |
| `conditionEvaluations` | 配列<[RouteConditionEvaluation](../schemas/models.md#routeconditionevaluation)> | 省略可 | — | — |

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
| `steps` | 配列<[RouteStep](../schemas/models.md#routestep)> | 省略可 | minItems=1 | 同一Directions応答のターン案内。別取得の形状へ継ぎ足さない。 |

## PluginValues

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|

各プラグインのSchemaを必ず追加適用する。自由なJSONを無検査で保存しない。

## PluginSetting

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `pluginVersion` | string | 必須 | minLength=1、maxLength=80 | — |
| `settings` | [PluginValues](../schemas/models.md#pluginvalues) | 必須 | — | — |
| `icon` | [PluginIconId](../schemas/models.md#pluginiconid) | 必須 | — | — |
| `declarations` | 配列<[PluginDeclaration](../schemas/models.md#plugindeclaration)> | 必須 | maxItems=1000 | — |
| `manifest` | [PluginManifest](../schemas/models.md#pluginmanifest) | 必須 | — | — |
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `installId` | string | 必須 | minLength=1、maxLength=80 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `enabled` | boolean | 必須 | — | — |
| `previousVersion` | string または null | 必須 | — | — |

## PluginSettingCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `confirmed` | true | 必須 | — | — |
| `stateRevision` | string | 必須 | minLength=1、maxLength=64 | — |
| `resolutions` | 配列<[PluginConflictResolution](../schemas/models.md#pluginconflictresolution)> | 省略可 | maxItems=1000 | — |
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `pluginVersion` | string | 必須 | minLength=1、maxLength=80 | — |
| `settings` | [PluginValues](../schemas/models.md#pluginvalues) | 必須 | — | — |
| `enabled` | boolean | 必須 | — | — |
| `icon` | [PluginIconId](../schemas/models.md#pluginiconid) | 省略可 | — | — |

## PluginSettingPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 省略可 | — | — |
| `settings` | [PluginValues](../schemas/models.md#pluginvalues) | 省略可 | — | — |
| `icon` | [PluginIconId](../schemas/models.md#pluginiconid) | 省略可 | — | — |
| `resolutions` | 配列<[PluginConflictResolution](../schemas/models.md#pluginconflictresolution)> | 省略可 | maxItems=1000 | — |

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
| `body` | string | 必須 | minLength=0、maxLength=200 | 要望本文 |
| `visibility` | private / public | 必須 | — | 公開範囲 |
| `displayName` | string | 必須 | minLength=1、maxLength=20 | — |
| `regionTags` | 配列<string> | 必須 | maxItems=5、uniqueItems=True | — |
| `purposeTags` | 配列<string> | 必須 | maxItems=5、uniqueItems=True | — |
| `empathyCount` | integer | 必須 | minimum=0 | — |
| `myEmpathy` | boolean | 必須 | — | — |

## FeatureRequestCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `title` | string | 省略可 | minLength=1、maxLength=200 | タイトル |
| `body` | string | 必須 | minLength=0、maxLength=200 | 要望本文 |
| `visibility` | private / public | 必須 | — | 公開範囲 |
| `displayName` | string | 必須 | minLength=1、maxLength=20 | — |
| `regionTags` | 配列<string> | 省略可 | maxItems=5、uniqueItems=True | — |
| `purposeTags` | 配列<string> | 省略可 | maxItems=5、uniqueItems=True | — |

## FeatureRequestPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `title` | string | 省略可 | minLength=1、maxLength=200 | タイトル |
| `body` | string | 省略可 | minLength=0、maxLength=200 | 要望本文 |
| `visibility` | private / public | 省略可 | — | 公開範囲 |
| `displayName` | string | 省略可 | minLength=1、maxLength=20 | — |
| `regionTags` | 配列<string> | 省略可 | maxItems=5、uniqueItems=True | — |
| `purposeTags` | 配列<string> | 省略可 | maxItems=5、uniqueItems=True | — |

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
| `breakBefore` | boolean | 必須 | — | Break line before this point: first in segment or deleted observations interrupt continuity. Never connect across this flag. |

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
| `wishes` | 配列<string> | 必須 | maxItems=100、uniqueItems=True | — |
| `minutes` | integer または null | 必須 | — | — |
| `note` | string | 必須 | minLength=0、maxLength=10000 | — |
| `timeBudget` | [SuggestionTimeBudget](../schemas/models.md#suggestiontimebudget) | 省略可 | — | — |
| `companion` | solo / friends_family / children / pet / None | 省略可 | — | — |
| `effort` | easy / moderate / any / None | 省略可 | — | — |
| `mode` | walking / cycling / driving / transit / any | 省略可 | — | — |
| `stayMinutes` | integer | 省略可 | minimum=1、maximum=1440 | User specified activity duration; never inferred from the overall budget |

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
| `timezone` | string | 省略可 | — | IANA timezone of localDate |

## SelfCheckinCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `localDate` | [Date](../schemas/models.md#date) | 必須 | — | 対象日。YYYY-MM-DD |
| `answers` | [CheckinAnswers](../schemas/models.md#checkinanswers) | 必須 | — | 任意の状態・希望・時間・補足 |
| `validUntil` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 提案条件に使える期限 |
| `timezone` | string | 省略可 | — | IANA timezone of localDate |

## SelfCheckinPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `localDate` | [Date](../schemas/models.md#date) | 省略可 | — | 対象日。YYYY-MM-DD |
| `answers` | [CheckinAnswers](../schemas/models.md#checkinanswers) | 省略可 | — | 任意の状態・希望・時間・補足 |
| `validUntil` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | — | 提案条件に使える期限 |
| `timezone` | string | 省略可 | — | IANA timezone of localDate |

## SuggestionConditions

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `minutes` | integer | 省略可 | minimum=0、maximum=1440 | — |
| `budget` | integer | 省略可 | minimum=0、maximum=1000000 | — |
| `mode` | walking / cycling / driving / transit / any | 省略可 | — | — |
| `activity` | string | 省略可 | minLength=1、maxLength=200 | — |
| `note` | string | 省略可 | minLength=0、maxLength=10000 | — |
| `timeBudget` | [SuggestionTimeBudget](../schemas/models.md#suggestiontimebudget) | 省略可 | — | — |
| `companion` | solo / friends_family / children / pet / None | 省略可 | — | — |
| `effort` | easy / moderate / any / None | 省略可 | — | — |
| `wishes` | 配列<string> | 省略可 | maxItems=100、uniqueItems=True | — |
| `stayMinutes` | integer | 省略可 | minimum=1、maximum=1440 | User specified activity duration; never inferred from the overall budget |
| `state` | string | 省略可 | maxLength=10000 | — |

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
| `checkinVersion` | ['integer', 'null'] | 省略可 | minimum=1 | — |
| `checkinSnapshot` | [SelfCheckin](../schemas/models.md#selfcheckin) または null | 省略可 | — | — |
| `travelMinutes` | ['number', 'null'] | 省略可 | minimum=0 | — |
| `stayMinutes` | ['number', 'null'] | 省略可 | minimum=0 | — |
| `totalMinutes` | ['number', 'null'] | 省略可 | minimum=0 | — |
| `stay` | ['object', 'null'] | 省略可 | — | — |
| `evaluations` | 配列<[SuggestionConditionEvaluation](../schemas/models.md#suggestionconditionevaluation)> | 省略可 | — | — |
| `memo` | string | 省略可 | maxLength=10000 | — |
| `sourceState` | current / changed / unavailable | 省略可 | — | — |
| `evaluationState` | unevaluated / rated | 省略可 | — | — |
| `rating` | ['number', 'null'] | 省略可 | — | — |
| `matchedWishes` | 配列<string> | 省略可 | — | — |
| `routeEvidence` | [CommonMapRoutePreview](../schemas/models.md#commonmaproutepreview) | 省略可 | — | — |
| `unknowns` | 配列<string> | 省略可 | — | — |
| `generator` | object | 省略可 | — | — |
| `viewedAt` | ['integer', 'null'] | 省略可 | minimum=0 | 最初に詳細を実際に閲覧した時刻。表示・選択とは独立。 |

`generator` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `model` | string | 必須 | — | — |
| `promptVersion` | string | 必須 | — | — |

## Theme

保存結果DTO。列の意味は ../01_DB/13_themes.json。API別名・非公開項目はschemas/README.md。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | テーマを作った人物 |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | 保存内容の版。編集時に1増やす。初期値1 |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | 更新日時。UTC Unixミリ秒 |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | テーマを作った人物 |
| `name` | string | 必須 | minLength=1、maxLength=20 | テーマ名 |
| `description` | string | 必須 | minLength=0、maxLength=100 | 説明 |
| `recordIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | テーマに含める記録ID |
| `colorKey` | [ThemeColorKey](../schemas/models.md#themecolorkey) | 必須 | — | — |
| `coverMediaId` | [Id](../schemas/models.md#id) または null | 必須 | — | 本人のready写真の非複製参照。元媒体削除後はnull。 |

## ThemeCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | 保存開始時に発行し、再送・編集で使い続けるID。1〜80文字 |
| `name` | string | 必須 | minLength=1、maxLength=20 | テーマ名 |
| `description` | string | 必須 | minLength=0、maxLength=100 | 説明 |
| `recordIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | minItems=0、maxItems=1000、uniqueItems=True | テーマに含める記録ID |
| `colorKey` | [ThemeColorKey](../schemas/models.md#themecolorkey) | 省略可 | — | — |
| `coverMediaId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 本人のready写真の非複製参照。元媒体削除後はnull。 |

## ThemePatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | minLength=1、maxLength=20 | テーマ名 |
| `description` | string | 省略可 | minLength=0、maxLength=100 | 説明 |
| `recordIds` | 配列<[Id](../schemas/models.md#id)> | 省略可 | minItems=0、maxItems=1000、uniqueItems=True | テーマに含める記録ID |
| `colorKey` | [ThemeColorKey](../schemas/models.md#themecolorkey) | 省略可 | — | — |
| `coverMediaId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 本人のready写真の非複製参照。元媒体削除後はnull。 |

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
| `memo` | [MemoPresentation](../schemas/models.md#memopresentation) または null | 必須 | — | — |

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

openingHours=null and entrances=[] mean not acquired. No open-now or accessibility inference from unknown data. All provider-derived details are unverified until explicitly confirmed.

[共通型の照合元](../../02_common/03_information/schemas.json#/definitions/PlaceDetail)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `place` | [CommonMapPlace](../schemas/models.md#commonmapplace) | 必須 | — | — |
| `colocated` | 配列<object> | 必須 | minItems=0、maxItems=1000 | — |
| `ownRecords` | object | 必須 | — | — |
| `sharedRecords` | object | 必須 | — | — |
| `visits` | object | 必須 | — | — |
| `openingHours` | [PlaceOpeningHours](../schemas/models.md#placeopeninghours) または null | 必須 | — | — |
| `entrances` | 配列<[PlaceEntrance](../schemas/models.md#placeentrance)> | 必須 | maxItems=100 | — |
| `correctedFields` | 配列<name / address / buildingKey / openingHours / entrances> | 必須 | uniqueItems=True | — |
| `description` | [PlaceDescription](../schemas/models.md#placedescription) または null | 必須 | — | — |
| `photos` | 配列<[PlacePhoto](../schemas/models.md#placephoto)> | 必須 | maxItems=1 | — |

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
| `stage` | integer | 必須 | minimum=1、maximum=3 | 1 confirmed visit -> 1; 2-4 -> 2; 5+ -> 3. Recalculated on current data. |

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
| `requestedConditions` | [RouteConditions](../schemas/models.md#routeconditions) | 省略可 | — | — |
| `conditionEvaluations` | 配列<[RouteConditionEvaluation](../schemas/models.md#routeconditionevaluation)> | 省略可 | — | — |

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
| `steps` | 配列<[RouteStep](../schemas/models.md#routestep)> | 省略可 | minItems=1 | 同一Directions応答のターン案内。別取得の形状へ継ぎ足さない。 |

## RouteSearchInput

[共通型の照合元](../../02_common/02_places-routes/schemas.json#/definitions/RouteRequest)

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `waypoints` | 配列<object または object または object> | 必須 | minItems=2、maxItems=10 | — |
| `mode` | walking / cycling / driving / transit | 必須 | — | — |
| `title` | string | 必須 | minLength=0、maxLength=100 | — |
| `conditions` | [RouteConditions](../schemas/models.md#routeconditions) | 省略可 | — | — |

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
| `localDate` | [Date](../schemas/models.md#date) | 省略可 | — | — |
| `timezone` | string | 省略可 | — | — |
| `trigger` | onOpen / continuous | 省略可 | default=onOpen | — |

## SuggestionBatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `items` | 配列<[Suggestion](../schemas/models.md#suggestion)> | 必須 | minItems=0、maxItems=20 | — |
| `expiresAt` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | — | — |
| `emptyReason` | ['string', 'null'] | 省略可 | — | — |
| `conditions` | [SuggestionConditions](../schemas/models.md#suggestionconditions) | 省略可 | — | — |

## SuggestionPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | offered / later / dismissed / selected / completed / not_done | 省略可 | — | 操作状態 |
| `presented` | true | 省略可 | — | — |
| `routeId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 案内に使う保存ルート。任意 |
| `completedVisitId` | [Id](../schemas/models.md#id) または null | 省略可 | — | 達成に対応する訪問。未達成はNULL |
| `feedback` | string | 省略可 | minLength=0、maxLength=10000 | 見送り・選び直し等の任意の原文 |
| `memo` | string | 省略可 | maxLength=10000 | — |
| `viewed` | true | 省略可 | — | 詳細が実際に表示された時に送信。最初の閲覧時刻だけ保存。 |

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
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `name` | string | 必須 | minLength=1、maxLength=200 | — |
| `description` | string | 必須 | maxLength=10000 | — |
| `category` | string | 必須 | minLength=1、maxLength=200 | — |
| `author` | string | 必須 | minLength=1、maxLength=200 | — |
| `pluginVersion` | string | 必須 | minLength=1、maxLength=80 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `changeLog` | string | 必須 | maxLength=10000 | — |
| `icon` | [PluginIconId](../schemas/models.md#pluginiconid) | 必須 | — | — |
| `usageInfo` | 配列<string> | 必須 | maxItems=1000 | — |
| `sources` | 配列<[PluginSource](../schemas/models.md#pluginsource)> | 必須 | maxItems=1000 | — |
| `settingsSchema` | object | 必須 | — | — |
| `defaultSettings` | [PluginValues](../schemas/models.md#pluginvalues) | 必須 | — | — |
| `trialConditions` | 配列<string> | 必須 | maxItems=1000 | — |
| `order` | integer | 省略可 | — | — |
| `installed` | [PluginSetting](../schemas/models.md#pluginsetting) または null | 必須 | — | — |
| `versions` | 配列<[PluginManifest](../schemas/models.md#pluginmanifest)> | 必須 | maxItems=1000 | — |
| `iconOptions` | 配列<[PluginIconOption](../schemas/models.md#pluginiconoption)> | 必須 | minItems=6、maxItems=6 | — |

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
| `emptyReason` | ['string', 'null'] | 省略可 | — | — |
| `expiresAt` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | — | — |
| `conditions` | [SuggestionConditions](../schemas/models.md#suggestionconditions) | 省略可 | — | — |

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
| `items` | 配列<[PluginSetting](../schemas/models.md#pluginsetting)> | 必須 | maxItems=100 | — |
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
| `requestedConditions` | [RouteConditions](../schemas/models.md#routeconditions) | 省略可 | — | — |
| `conditionEvaluations` | 配列<[RouteConditionEvaluation](../schemas/models.md#routeconditionevaluation)> | 省略可 | — | — |

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
| `steps` | 配列<[RouteStep](../schemas/models.md#routestep)> | 省略可 | minItems=1 | 同一Directions応答のターン案内。別取得の形状へ継ぎ足さない。 |

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

## BikeSettings

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `region` | object | 必須 | — | — |
| `vehicle` | object | 必須 | — | — |
| `highwayPolicy` | allow / avoid | 必須 | — | — |

`region` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `bounds` | 配列<number> | 必須 | minItems=4、maxItems=4 | — |

`vehicle` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `class` | moped / light_motorcycle / motorcycle / electric_motorcycle | 必須 | — | — |
| `displacementCc` | number | 省略可 | exclusiveMinimum=0、maximum=3000 | — |

## BikeSource

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | — | — |
| `name` | string | 必須 | — | — |
| `url` | string (uri) | 必須 | — | — |
| `attribution` | string | 必須 | — | — |
| `fetchedAt` | integer | 必須 | — | — |
| `updatedAt` | integer または null | 必須 | — | — |

## BikeAssessment

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | verified / ineligible / unknown | 必須 | — | — |
| `reason` | string | 必須 | — | — |
| `sourceRefs` | 配列<string> | 必須 | — | — |
| `checkedAt` | integer | 必須 | — | — |

## BikePlace

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | — | — |
| `name` | string | 必須 | — | — |
| `position` | object | 必須 | — | — |
| `category` | motorcycle_parking / fuel / motorcycle_shop | 必須 | — | — |
| `tags` | object | 必須 | — | — |
| `source` | [BikeSource](../schemas/models.md#bikesource) | 必須 | — | — |
| `vehicleAssessment` | [BikeAssessment](../schemas/models.md#bikeassessment) | 必須 | — | — |

`position` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `longitude` | number | 必須 | — | — |
| `latitude` | number | 必須 | — | — |

`tags` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|

## BikeRoadObservation

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | — | — |
| `geometry` | object | 必須 | — | — |
| `tags` | object | 必須 | — | — |
| `source` | [BikeSource](../schemas/models.md#bikesource) | 必須 | — | — |
| `vehicleAssessment` | [BikeAssessment](../schemas/models.md#bikeassessment) | 必須 | — | — |

`geometry` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "LineString" | 必須 | — | — |
| `coordinates` | 配列<配列<number>> | 必須 | minItems=2 | — |

`tags` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|

## BikeSearchResult

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `installId` | string | 必須 | — | — |
| `settingsVersion` | integer | 必須 | — | — |
| `settingsHash` | string | 必須 | — | — |
| `settings` | [BikeSettings](../schemas/models.md#bikesettings) | 必須 | — | — |
| `id` | string | 必須 | — | — |
| `kind` | "search" | 必須 | — | — |
| `dataKind` | "real" | 必須 | — | — |
| `fetchedAt` | integer | 必須 | — | — |
| `expiresAt` | integer | 必須 | — | — |
| `places` | 配列<[BikePlace](../schemas/models.md#bikeplace)> | 必須 | — | — |
| `roads` | 配列<[BikeRoadObservation](../schemas/models.md#bikeroadobservation)> | 必須 | — | — |
| `source` | [BikeSource](../schemas/models.md#bikesource) | 必須 | — | — |

## BikeRouteAssessment

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `installId` | string | 必須 | — | — |
| `settingsVersion` | integer | 必須 | — | — |
| `settingsHash` | string | 必須 | — | — |
| `settings` | [BikeSettings](../schemas/models.md#bikesettings) | 必須 | — | — |
| `id` | string | 必須 | — | — |
| `kind` | "assessment" | 必須 | — | — |
| `dataKind` | "real" | 必須 | — | — |
| `previewId` | string | 必須 | — | — |
| `searchId` | string | 必須 | — | — |
| `geometryHash` | string | 必須 | — | — |
| `geometry` | object | 必須 | — | — |
| `routeFetchedAt` | integer | 必須 | — | — |
| `vehicleAssessment` | [BikeAssessment](../schemas/models.md#bikeassessment) | 必須 | — | — |
| `highwayAssessment` | [BikeAssessment](../schemas/models.md#bikeassessment) | 必須 | — | — |
| `adoptable` | boolean | 必須 | — | — |
| `checkedAt` | integer | 必須 | — | — |
| `expiresAt` | integer | 必須 | — | — |

`geometry` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "LineString" | 必須 | — | — |
| `coordinates` | 配列<配列<number>> | 必須 | minItems=2 | — |

## BikeAdoption

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `installId` | string | 必須 | — | — |
| `settingsVersion` | integer | 必須 | — | — |
| `settingsHash` | string | 必須 | — | — |
| `settings` | [BikeSettings](../schemas/models.md#bikesettings) | 必須 | — | — |
| `id` | string | 必須 | — | — |
| `kind` | "adoption" | 必須 | — | — |
| `assessment` | [BikeRouteAssessment](../schemas/models.md#bikerouteassessment) | 必須 | — | — |
| `routeId` | string | 必須 | — | — |
| `adoptedAt` | integer | 必須 | — | — |

## BikeResult

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `installId` | string | 必須 | — | — |
| `settingsVersion` | integer | 必須 | — | — |
| `settingsHash` | string | 必須 | — | — |
| `settings` | [BikeSettings](../schemas/models.md#bikesettings) | 必須 | — | — |
| `id` | string | 必須 | — | — |
| `kind` | "search" | 必須 | — | — |
| `dataKind` | "real" | 必須 | — | — |
| `fetchedAt` | integer | 必須 | — | — |
| `expiresAt` | integer | 必須 | — | — |
| `places` | 配列<[BikePlace](../schemas/models.md#bikeplace)> | 必須 | — | — |
| `roads` | 配列<[BikeRoadObservation](../schemas/models.md#bikeroadobservation)> | 必須 | — | — |
| `source` | [BikeSource](../schemas/models.md#bikesource) | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `installId` | string | 必須 | — | — |
| `settingsVersion` | integer | 必須 | — | — |
| `settingsHash` | string | 必須 | — | — |
| `settings` | [BikeSettings](../schemas/models.md#bikesettings) | 必須 | — | — |
| `id` | string | 必須 | — | — |
| `kind` | "assessment" | 必須 | — | — |
| `dataKind` | "real" | 必須 | — | — |
| `previewId` | string | 必須 | — | — |
| `searchId` | string | 必須 | — | — |
| `geometryHash` | string | 必須 | — | — |
| `geometry` | object | 必須 | — | — |
| `routeFetchedAt` | integer | 必須 | — | — |
| `vehicleAssessment` | [BikeAssessment](../schemas/models.md#bikeassessment) | 必須 | — | — |
| `highwayAssessment` | [BikeAssessment](../schemas/models.md#bikeassessment) | 必須 | — | — |
| `adoptable` | boolean | 必須 | — | — |
| `checkedAt` | integer | 必須 | — | — |
| `expiresAt` | integer | 必須 | — | — |

`geometry` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "LineString" | 必須 | — | — |
| `coordinates` | 配列<配列<number>> | 必須 | minItems=2 | — |

分岐 3

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `installId` | string | 必須 | — | — |
| `settingsVersion` | integer | 必須 | — | — |
| `settingsHash` | string | 必須 | — | — |
| `settings` | [BikeSettings](../schemas/models.md#bikesettings) | 必須 | — | — |
| `id` | string | 必須 | — | — |
| `kind` | "adoption" | 必須 | — | — |
| `assessment` | [BikeRouteAssessment](../schemas/models.md#bikerouteassessment) | 必須 | — | — |
| `routeId` | string | 必須 | — | — |
| `adoptedAt` | integer | 必須 | — | — |

## BikeMapFeature

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "Feature" | 必須 | — | — |
| `id` | string | 必須 | — | — |
| `geometry` | object | 必須 | — | — |
| `properties` | object | 必須 | — | — |

`geometry` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "Point" | 必須 | — | — |
| `coordinates` | 配列<number> | 必須 | minItems=2、maxItems=2 | — |

`properties` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `ownerKey` | string | 必須 | — | — |
| `name` | string | 必須 | — | — |
| `category` | string | 必須 | — | — |
| `assessmentStatus` | verified / ineligible / unknown | 必須 | — | — |
| `source` | [BikeSource](../schemas/models.md#bikesource) | 必須 | — | — |
| `stale` | boolean | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "Feature" | 必須 | — | — |
| `id` | string | 必須 | — | — |
| `geometry` | object | 必須 | — | — |
| `properties` | object | 必須 | — | — |

`geometry` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "LineString" | 必須 | — | — |
| `coordinates` | 配列<配列<number>> | 必須 | minItems=2 | — |

`properties` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `ownerKey` | string | 必須 | — | — |
| `assessmentStatus` | "verified" | 必須 | — | — |
| `checkedAt` | integer | 必須 | — | — |
| `stale` | boolean | 必須 | — | — |

## BikeState

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `installation` | object または null | 必須 | — | — |
| `results` | 配列<[BikeResult](../schemas/models.md#bikeresult)> | 必須 | — | — |
| `display` | object | 必須 | — | — |

`installation` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `installId` | string | 必須 | — | — |
| `version` | integer | 必須 | — | — |
| `enabled` | boolean | 必須 | — | — |
| `settings` | [BikeSettings](../schemas/models.md#bikesettings) | 必須 | — | — |
| `visible` | boolean | 必須 | — | — |

`display` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `ownerKey` | string または null | 必須 | — | — |
| `visible` | boolean | 必須 | — | — |
| `clearOwnerKeys` | 配列<string> | 必須 | — | — |
| `geojson` | object | 必須 | — | — |

`geojson` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "FeatureCollection" | 必須 | — | — |
| `features` | 配列<[BikeMapFeature](../schemas/models.md#bikemapfeature)> | 必須 | — | — |

## BikeRouteAssessmentInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `previewId` | string | 必須 | minLength=1、maxLength=80 | — |
| `searchId` | string | 必須 | minLength=1、maxLength=80 | — |

## BikeAdoptionInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string (uuid) | 必須 | — | — |
| `assessmentId` | string | 必須 | minLength=1、maxLength=80 | — |
| `title` | string | 必須 | minLength=1、maxLength=100 | — |

## CommunityBookmarkTarget

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "record" | 必須 | — | — |
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "place" | 必須 | — | — |
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |

分岐 3

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "candidate" | 必須 | — | — |
| `resultId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `candidateId` | [Id](../schemas/models.md#id) | 必須 | — | — |

## CommunityBookmarkCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `target` | [CommunityBookmarkTarget](../schemas/models.md#communitybookmarktarget) | 必須 | — | — |

## CommunityBookmark

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `target` | [CommunityBookmarkTarget](../schemas/models.md#communitybookmarktarget) | 必須 | — | — |
| `expiresAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | — |
| `status` | available / expired / unavailable | 必須 | — | — |
| `resource` | [CommonInfoRecordView](../schemas/models.md#commoninforecordview) または [CommonMapPlace](../schemas/models.md#commonmapplace) または [CommonMapPlaceCandidate](../schemas/models.md#commonmapplacecandidate) または null | 必須 | — | — |

## CommunityTopic

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `topicKey` | food / rest / walk | 必須 | — | — |
| `title` | string | 必須 | — | — |
| `purposes` | 配列<string> | 必須 | — | — |

## CommunityThemeSharing

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `visibility` | private / selected / public | 必須 | — | — |
| `sharedWith` | 配列<[Id](../schemas/models.md#id)> | 必須 | maxItems=100、uniqueItems=True | — |

## CommunityThemeSharingPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `visibility` | private / selected / public | 必須 | — | — |
| `sharedWith` | 配列<[Id](../schemas/models.md#id)> | 必須 | maxItems=100、uniqueItems=True | — |

## CommunitySharedTheme

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `name` | string | 必須 | — | — |
| `description` | string | 必須 | — | — |
| `recordIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | — | — |
| `records` | 配列<[CommonInfoRecordView](../schemas/models.md#commoninforecordview)> | 必須 | — | — |
| `sharing` | [CommunityThemeSharing](../schemas/models.md#communitythemesharing) | 必須 | — | — |
| `colorKey` | teal / pink / orange / yellow / green / blue / purple | 必須 | — | — |
| `coverMedia` | [CommonInfoMediaView](../schemas/models.md#commoninfomediaview) または null | 必須 | — | — |

## CommunityBookmarkPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[CommunityBookmark](../schemas/models.md#communitybookmark)> | 必須 | — | — |
| `nextCursor` | string または null | 必須 | — | — |

## CommunitySharedThemePage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[CommunitySharedTheme](../schemas/models.md#communitysharedtheme)> | 必須 | — | — |
| `nextCursor` | string または null | 必須 | — | — |

## CommunityKnowledgeCategory

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `key` | tips / experiences / people | 必須 | — | — |
| `title` | string | 必須 | — | — |
| `entity` | record / person | 必須 | — | — |
| `topicKey` | ['string', 'null'] | 必須 | — | — |
| `purposes` | 配列<string> | 必須 | — | — |
| `kind` | experience / None | 必須 | — | — |

## CompanionDraftInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 必須 | maxLength=20 | — |
| `appearance` | string | 必須 | maxLength=200 | — |
| `referenceImageId` | ['string', 'null'] | 必須 | minLength=1、maxLength=80 | — |

## CompanionDraft

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `name` | string | 必須 | maxLength=20 | — |
| `appearance` | string | 必須 | maxLength=200 | — |
| `referenceImageId` | ['string', 'null'] | 必須 | minLength=1、maxLength=80 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |

## CompanionSettingsInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `selectedCompanionId` | ['string', 'null'] | 必須 | minLength=1、maxLength=80 | — |
| `visible` | boolean | 必須 | — | — |
| `size` | small / medium | 必須 | — | — |
| `reducedMotion` | boolean | 必須 | — | — |

## CompanionSettings

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `selectedCompanionId` | ['string', 'null'] | 必須 | minLength=1、maxLength=80 | — |
| `visible` | boolean | 必須 | — | — |
| `size` | small / medium | 必須 | — | — |
| `reducedMotion` | boolean | 必須 | — | — |
| `version` | integer | 必須 | minimum=1 | — |

## CompanionImport

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `name` | string | 必須 | — | — |
| `manifest` | [CompanionManifestV2](../schemas/models.md#companionmanifestv2) | 必須 | — | — |
| `requiredActions` | 配列<idle / running-right / running-left / waving / jumping / failed / waiting / running / review / gaze-0 / gaze-22.5 / gaze-45 / gaze-67.5 / gaze-90 / gaze-112.5 / gaze-135 / gaze-157.5 / gaze-180 / gaze-202.5 / gaze-225 / gaze-247.5 / gaze-270 / gaze-292.5 / gaze-315 / gaze-337.5> | 必須 | — | — |
| `confirmedActions` | 配列<idle / running-right / running-left / waving / jumping / failed / waiting / running / review / gaze-0 / gaze-22.5 / gaze-45 / gaze-67.5 / gaze-90 / gaze-112.5 / gaze-135 / gaze-157.5 / gaze-180 / gaze-202.5 / gaze-225 / gaze-247.5 / gaze-270 / gaze-292.5 / gaze-315 / gaze-337.5> | 必須 | — | — |
| `version` | integer | 必須 | minimum=1 | — |
| `createdAt` | integer | 必須 | minimum=0 | — |

## Companion

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `importId` | string | 必須 | minLength=1、maxLength=80 | — |
| `name` | string | 必須 | — | — |
| `source` | import / generation | 必須 | — | — |
| `version` | integer | 必須 | minimum=1 | — |
| `createdAt` | integer | 必須 | minimum=0 | — |

## CompanionConfirmation

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `actions` | 配列<idle / running-right / running-left / waving / jumping / failed / waiting / running / review / gaze-0 / gaze-22.5 / gaze-45 / gaze-67.5 / gaze-90 / gaze-112.5 / gaze-135 / gaze-157.5 / gaze-180 / gaze-202.5 / gaze-225 / gaze-247.5 / gaze-270 / gaze-292.5 / gaze-315 / gaze-337.5> | 必須 | uniqueItems=True | — |

## CompanionRegistrationInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `selectCurrent` | boolean | 必須 | default=False | — |
| `settingsVersion` | integer または null | 省略可 | — | — |

## CompanionRegistration

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `companion` | [Companion](../schemas/models.md#companion) | 必須 | — | — |
| `settings` | [CompanionSettings](../schemas/models.md#companionsettings) | 必須 | — | — |

## CompanionGenerationInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `draftId` | string | 必須 | minLength=1、maxLength=80 | — |
| `draftVersion` | integer | 必須 | minimum=1 | — |

## CompanionGeneration

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `draftId` | string | 必須 | minLength=1、maxLength=80 | — |
| `input` | [CompanionDraft](../schemas/models.md#companiondraft) | 必須 | — | — |
| `provider` | string | 必須 | — | — |
| `upstreamJobId` | ['string', 'null'] | 必須 | — | — |
| `status` | queued / running / succeeded / failed / cancelled | 必須 | — | — |
| `progress` | integer | 必須 | minimum=0、maximum=100 | — |
| `resultImportId` | ['string', 'null'] | 必須 | minLength=1、maxLength=80 | — |
| `failureCode` | ['string', 'null'] | 必須 | — | — |
| `version` | integer | 必須 | minimum=1 | — |
| `adoptedCompanionId` | ['string', 'null'] | 必須 | minLength=1、maxLength=80 | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |

## CompanionProviderStatus

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `connected` | boolean | 必須 | — | — |
| `provider` | ['string', 'null'] | 必須 | — | — |
| `reason` | ['string', 'null'] | 必須 | — | — |

## CompanionInstructions

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `draft` | [CompanionDraft](../schemas/models.md#companiondraft) | 必須 | — | — |
| `instructions` | string | 必須 | — | — |
| `referenceImageUrl` | ['string', 'null'] | 必須 | — | — |

## CompanionMedia

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `mime` | image/png / image/webp / image/jpeg | 必須 | — | — |
| `byteLength` | integer | 必須 | minimum=1 | — |
| `url` | string | 必須 | — | — |

## CompanionDraftPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 省略可 | maxLength=20 | — |
| `appearance` | string | 省略可 | maxLength=200 | — |
| `referenceImageId` | ['string', 'null'] | 省略可 | minLength=1、maxLength=80 | — |

## CompanionSettingsPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `selectedCompanionId` | ['string', 'null'] | 省略可 | minLength=1、maxLength=80 | — |
| `visible` | boolean | 省略可 | — | — |
| `size` | small / medium | 省略可 | — | — |
| `reducedMotion` | boolean | 省略可 | — | — |

## CompanionManifestV2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | pattern=^[a-z0-9][a-z0-9_-]{0,79}$ | — |
| `displayName` | string | 必須 | minLength=1、maxLength=120 | — |
| `description` | string | 必須 | minLength=1、maxLength=2000 | — |
| `spriteVersionNumber` | 2 | 必須 | — | — |
| `spritesheetPath` | spritesheet.png / spritesheet.webp | 必須 | — | — |

## LocalProfile

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `profileKey` | string | 必須 | minLength=1、maxLength=80 | — |
| `name` | string | 必須 | minLength=1、maxLength=200 | — |

## SessionInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `profileKey` | string | 必須 | minLength=1、maxLength=80 | — |

## LocalSession

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `person` | [Person](../schemas/models.md#person) | 必須 | — | — |
| `dataMode` | [DataMode](../schemas/models.md#datamode) | 必須 | — | — |
| `version` | integer | 必須 | minimum=1 | — |
| `expiresAt` | integer | 必須 | — | — |

## DisasterBounds

WGS84 [west,south,east,north]。取得地域と個別タイルの実範囲を区別する。

配列<number>。minItems=4、maxItems=4

## DisasterLayerId

flood-hazard / terrain / rainfall。—

## DisasterStatus

available / partial / missing / outOfCoverage / providerError。—

## DisasterSettings

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `region` | object | 必須 | — | — |
| `layerIds` | 配列<[DisasterLayerId](../schemas/models.md#disasterlayerid)> | 必須 | minItems=1、maxItems=3、uniqueItems=True | — |

`region` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | — | — |
| `bounds` | [DisasterBounds](../schemas/models.md#disasterbounds) | 必須 | — | — |

## DisasterTile

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `z` | integer | 必須 | — | — |
| `x` | integer | 必須 | — | — |
| `y` | integer | 必須 | — | — |
| `bounds` | [DisasterBounds](../schemas/models.md#disasterbounds) | 必須 | — | — |
| `role` | data / noDataMask | 必須 | — | — |
| `status` | [DisasterStatus](../schemas/models.md#disasterstatus) | 必須 | — | — |
| `sourceUrl` | string | 必須 | — | — |
| `fetchedAt` | integer | 必須 | — | — |
| `sourceUpdatedAt` | integer または null | 必須 | — | — |
| `sha256` | string または null | 必須 | — | — |
| `imageDataUrl` | string または null | 必須 | — | — |
| `error` | string または null | 必須 | — | — |

## DisasterLayer

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `layerId` | [DisasterLayerId](../schemas/models.md#disasterlayerid) | 必須 | — | — |
| `kind` | hazard / terrain / observation | 必須 | — | — |
| `label` | string | 必須 | — | — |
| `status` | [DisasterStatus](../schemas/models.md#disasterstatus) | 必須 | — | — |
| `sourceUrl` | string | 必須 | — | — |
| `attribution` | string | 必須 | — | — |
| `unit` | string または null | 必須 | — | — |
| `legend` | object | 必須 | — | — |
| `meaning` | string | 必須 | — | — |
| `fetchedAt` | integer | 必須 | — | — |
| `sourceUpdatedAt` | integer または null | 必須 | — | — |
| `sourceUpdatedAtMeaning` | string | 必須 | — | — |
| `validAt` | integer または null | 必須 | — | — |
| `issuedAt` | integer または null | 必須 | — | — |
| `bounds` | [DisasterBounds](../schemas/models.md#disasterbounds) | 必須 | — | — |
| `coverage` | object | 必須 | — | — |
| `tiles` | 配列<[DisasterTile](../schemas/models.md#disastertile)> | 必須 | — | — |
| `unknowns` | 配列<string> | 必須 | — | — |
| `noDataMask` | [DisasterNoDataMask](../schemas/models.md#disasternodatamask) または null | 必須 | — | — |

`legend` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `url` | string | 必須 | — | — |
| `description` | string | 必須 | — | — |

`coverage` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `envelope` | [DisasterBounds](../schemas/models.md#disasterbounds) | 必須 | — | — |
| `description` | string | 必須 | — | — |

## DisasterSnapshot

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `resultId` | string | 必須 | — | — |
| `dataKind` | "live" | 必須 | — | — |
| `settings` | [DisasterSettings](../schemas/models.md#disastersettings) | 必須 | — | — |
| `installId` | string | 必須 | — | — |
| `settingsVersion` | integer | 必須 | — | — |
| `pluginVersion` | string | 必須 | — | — |
| `fetchedAt` | integer | 必須 | — | — |
| `expiresAt` | integer | 必須 | — | — |
| `status` | [DisasterStatus](../schemas/models.md#disasterstatus) | 必須 | — | — |
| `layers` | 配列<[DisasterLayer](../schemas/models.md#disasterlayer)> | 必須 | — | — |
| `unknowns` | 配列<string> | 必須 | — | — |

## DisasterAttempt

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `attemptedAt` | integer | 必須 | — | — |
| `status` | complete / partial / failed | 必須 | — | — |
| `settings` | [DisasterSettings](../schemas/models.md#disastersettings) | 必須 | — | — |
| `layers` | 配列<[DisasterLayer](../schemas/models.md#disasterlayer)> | 必須 | — | — |

## DisasterView

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `dataKind` | "live" | 必須 | — | — |
| `settings` | [PluginSetting](../schemas/models.md#pluginsetting) または null | 必須 | — | — |
| `result` | [DisasterSnapshot](../schemas/models.md#disastersnapshot) または null | 必須 | — | — |
| `lastAttempt` | [DisasterAttempt](../schemas/models.md#disasterattempt) または null | 必須 | — | — |
| `stale` | boolean | 必須 | — | — |
| `map` | object | 必須 | — | — |

`map` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `action` | apply / clear | 必須 | — | — |
| `ownerKey` | string または null | 必須 | — | — |
| `pluginRevision` | string | 必須 | — | — |
| `settingsVersion` | integer または null | 必須 | — | — |
| `resultId` | string または null | 必須 | — | — |
| `bounds` | [DisasterBounds](../schemas/models.md#disasterbounds) または null | 必須 | — | — |
| `reason` | stale / ready / disabledOrUnresolved / settingsChanged / noResult | 必須 | — | — |
| `layerIds` | 配列<[DisasterLayerId](../schemas/models.md#disasterlayerid)> | 必須 | — | — |

## DisasterNoDataMask

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `sourceUrl` | string | 必須 | — | — |
| `fetchedAt` | integer | 必須 | — | — |
| `sourceUpdatedAt` | integer または null | 必須 | — | — |
| `sha256` | string | 必須 | — | — |
| `hasNoData` | boolean | 必須 | — | — |
| `geojson` | object | 必須 | — | — |

`geojson` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "FeatureCollection" | 必須 | — | — |
| `features` | 配列<object> | 必須 | — | — |

`features` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "Feature" | 必須 | — | — |
| `properties` | object | 必須 | — | — |
| `geometry` | object | 必須 | — | — |

`properties` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | "missing" | 必須 | — | — |
| `label` | string | 必須 | — | — |

`geometry` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "Polygon" | 必須 | — | — |
| `coordinates` | 配列<配列<配列<number>>> | 必須 | — | — |

## ExplorationHistoryLink

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `conversationId` | [Id](../schemas/models.md#id) | 必須 | — | — |

## ExplorationHistoryResume

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `conversationId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `resultId` | [Id](../schemas/models.md#id) または null | 必須 | — | — |
| `result` | [CommonAIDialogueResult](../schemas/models.md#commonaidialogueresult) または null | 必須 | — | — |
| `expiresAt` | [Timestamp](../schemas/models.md#timestamp) または null | 必須 | — | — |
| `resumeAction` | continue / search | 必須 | — | — |

## ExplorationFact

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `factKey` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `text` | string | 必須 | minLength=1、maxLength=10000 | — |
| `conceptIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | maxItems=100、uniqueItems=True | — |
| `source` | object | 必須 | — | — |
| `anchor` | object または null | 必須 | — | — |

`source` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `url` | string (uri) または null | 必須 | — | — |
| `title` | string | 必須 | minLength=1、maxLength=300 | — |
| `claimScope` | general / place-specific | 必須 | — | — |
| `sourceId` | [Id](../schemas/models.md#id) または null | 必須 | — | — |

`anchor` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | place / building / photo | 必須 | — | — |
| `targetId` | [Id](../schemas/models.md#id) | 必須 | — | — |

## ExplorationHistoryResumeEnvelope

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [ExplorationHistoryResume](../schemas/models.md#explorationhistoryresume) | 必須 | — | — |

## ExplorationFactPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[ExplorationFact](../schemas/models.md#explorationfact)> | 必須 | maxItems=100 | — |
| `nextCursor` | null | 必須 | — | — |

## FeatureRequestEmpathyPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `empathy` | boolean | 必須 | — | — |

## FeatureRequestGuide

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `title` | string | 必須 | — | — |
| `url` | string (uri) | 必須 | — | — |

## PlaceOpeningHours

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `rawText` | string | 必須 | minLength=1、maxLength=2000 | — |
| `timezone` | string または null | 必須 | — | — |
| `sourceUrl` | string または null | 必須 | — | — |
| `fetchedAt` | integer または null | 必須 | — | — |
| `verificationStatus` | unverified / confirmed | 必須 | — | — |

## PlaceEntrance

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `coordinates` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `label` | string または null | 必須 | — | — |
| `accessibility` | unknown / accessible / restricted | 必須 | — | — |
| `sourceUrl` | string または null | 必須 | — | — |
| `fetchedAt` | integer または null | 必須 | — | — |
| `verificationStatus` | unverified / confirmed | 必須 | — | — |

## PlaceDescription

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `text` | string | 必須 | minLength=1、maxLength=2000 | — |
| `sourceUrl` | string または null | 必須 | — | — |
| `fetchedAt` | integer | 必須 | minimum=0 | — |
| `verificationStatus` | "unverified" | 必須 | — | — |

## PlacePhoto

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `url` | string | 必須 | maxLength=2048、pattern=^https?:// | — |
| `sourceUrl` | string | 必須 | maxLength=2048、pattern=^https?:// | — |
| `attribution` | string または null | 必須 | — | — |
| `fetchedAt` | integer | 必須 | minimum=0 | — |
| `verificationStatus` | "unverified" | 必須 | — | — |

## PluginDeclaration

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `targetKey` | string | 必須 | minLength=1、maxLength=200 | — |
| `property` | string | 必須 | minLength=1、maxLength=100 | — |
| `value` | 未指定 | 必須 | — | — |

## PluginAppliedDeclaration

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `targetKey` | string | 必須 | minLength=1、maxLength=200 | — |
| `property` | string | 必須 | minLength=1、maxLength=100 | — |
| `value` | 未指定 | 必須 | — | — |
| `pluginId` | string | 必須 | minLength=1、maxLength=80 | — |
| `pluginVersion` | string | 必須 | minLength=1、maxLength=80 | — |

## PluginSource

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 必須 | minLength=1、maxLength=200 | — |
| `url` | string (uri) | 必須 | — | — |
| `attribution` | string | 必須 | minLength=1、maxLength=10000 | — |

## PluginManifest

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `name` | string | 必須 | minLength=1、maxLength=200 | — |
| `description` | string | 必須 | maxLength=10000 | — |
| `category` | string | 必須 | minLength=1、maxLength=200 | — |
| `author` | string | 必須 | minLength=1、maxLength=200 | — |
| `pluginVersion` | string | 必須 | minLength=1、maxLength=80 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `changeLog` | string | 必須 | maxLength=10000 | — |
| `icon` | [PluginIconId](../schemas/models.md#pluginiconid) | 必須 | — | — |
| `usageInfo` | 配列<string> | 必須 | maxItems=1000 | — |
| `sources` | 配列<[PluginSource](../schemas/models.md#pluginsource)> | 必須 | maxItems=1000 | — |
| `settingsSchema` | object | 必須 | — | — |
| `defaultSettings` | [PluginValues](../schemas/models.md#pluginvalues) | 必須 | — | — |
| `trialConditions` | 配列<string> | 必須 | maxItems=1000 | — |
| `order` | integer | 省略可 | — | — |

`settingsSchema` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|

## PluginSnapshot

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `pluginVersion` | string | 必須 | minLength=1、maxLength=80 | — |
| `settings` | [PluginValues](../schemas/models.md#pluginvalues) | 必須 | — | — |
| `icon` | [PluginIconId](../schemas/models.md#pluginiconid) | 必須 | — | — |
| `declarations` | 配列<[PluginDeclaration](../schemas/models.md#plugindeclaration)> | 必須 | maxItems=1000 | — |
| `manifest` | [PluginManifest](../schemas/models.md#pluginmanifest) | 必須 | — | — |

## PluginConflict

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `key` | string | 必須 | minLength=1、maxLength=64 | — |
| `targetKey` | string | 必須 | minLength=1、maxLength=200 | — |
| `property` | string | 必須 | minLength=1、maxLength=100 | — |
| `declarations` | 配列<[PluginAppliedDeclaration](../schemas/models.md#pluginapplieddeclaration)> | 必須 | maxItems=1000 | — |

## PluginConflictResolution

preferは1つの機能を適用。coexistは列挙した各機能の独立ownerレイヤーを同時表示し、単一値を黙って上書きしない。版/宣言hashに結び付けて保存。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `key` | string | 必須 | minLength=1、maxLength=64 | — |
| `strategy` | prefer / coexist | 必須 | — | — |
| `pluginIds` | 配列<string> | 必須 | maxItems=1000、minItems=1、uniqueItems=True | — |

## PluginUpdateInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `confirmed` | true | 必須 | — | — |
| `stateRevision` | string | 必須 | minLength=1、maxLength=64 | — |
| `resolutions` | 配列<[PluginConflictResolution](../schemas/models.md#pluginconflictresolution)> | 省略可 | maxItems=1000 | — |
| `pluginVersion` | string | 必須 | minLength=1、maxLength=80 | — |

## PluginRollbackInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `confirmed` | true | 必須 | — | — |
| `stateRevision` | string | 必須 | minLength=1、maxLength=64 | — |
| `resolutions` | 配列<[PluginConflictResolution](../schemas/models.md#pluginconflictresolution)> | 省略可 | maxItems=1000 | — |

## PluginTrialInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `pluginVersion` | string | 必須 | minLength=1、maxLength=80 | — |
| `settings` | [PluginValues](../schemas/models.md#pluginvalues) | 省略可 | — | — |
| `icon` | [PluginIconId](../schemas/models.md#pluginiconid) | 省略可 | — | — |

## PluginTrialPreview

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `dataKind` | "mock" | 必須 | — | — |
| `label` | string | 必須 | minLength=1、maxLength=200 | — |
| `declarations` | 配列<[PluginDeclaration](../schemas/models.md#plugindeclaration)> | 必須 | maxItems=1000 | — |
| `features` | 配列<[PluginTrialFeature](../schemas/models.md#plugintrialfeature)> | 必須 | minItems=0、maxItems=10000 | — |
| `warnings` | 配列<string> | 必須 | maxItems=1000 | — |
| `legends` | 配列<[PluginTrialLegend](../schemas/models.md#plugintriallegend)> | 必須 | minItems=0、maxItems=10000 | — |
| `sources` | 配列<[PluginTrialSource](../schemas/models.md#plugintrialsource)> | 必須 | minItems=0、maxItems=10000 | — |
| `generatedAt` | integer | 必須 | minimum=0 | — |

## PluginTrialResult

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `snapshot` | [PluginSnapshot](../schemas/models.md#pluginsnapshot) | 必須 | — | — |
| `stateRevision` | string | 必須 | minLength=1、maxLength=64 | — |
| `preview` | [PluginTrialPreview](../schemas/models.md#plugintrialpreview) | 必須 | — | — |
| `conflicts` | 配列<[PluginConflict](../schemas/models.md#pluginconflict)> | 必須 | maxItems=1000 | — |

## PluginStateEntry

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `pluginId` | string | 必須 | minLength=1、maxLength=80 | — |
| `installId` | string | 必須 | minLength=1、maxLength=80 | — |
| `ownerKey` | string | 必須 | minLength=1、maxLength=100 | — |
| `installedVersion` | string | 必須 | minLength=1、maxLength=80 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `enabled` | boolean | 必須 | — | — |
| `resolvedDeclarations` | 配列<[PluginAppliedDeclaration](../schemas/models.md#pluginapplieddeclaration)> | 必須 | maxItems=1000 | — |

## PluginState

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `personId` | string | 必須 | minLength=1、maxLength=80 | — |
| `dataMode` | live / demo | 必須 | — | — |
| `revision` | string | 必須 | minLength=1、maxLength=64 | — |
| `items` | 配列<[PluginSetting](../schemas/models.md#pluginsetting)> | 必須 | maxItems=1000 | — |
| `plugins` | 配列<[PluginStateEntry](../schemas/models.md#pluginstateentry)> | 必須 | maxItems=1000 | — |
| `appliedDeclarations` | 配列<[PluginAppliedDeclaration](../schemas/models.md#pluginapplieddeclaration)> | 必須 | maxItems=1000 | — |
| `conflicts` | 配列<[PluginConflict](../schemas/models.md#pluginconflict)> | 必須 | maxItems=1000 | — |
| `resolutions` | 配列<[PluginConflictResolution](../schemas/models.md#pluginconflictresolution)> | 必須 | maxItems=1000 | — |

## PluginCatalog

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[PluginDefinition](../schemas/models.md#plugindefinition)> | 必須 | maxItems=1000 | — |

## PluginVersions

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[PluginManifest](../schemas/models.md#pluginmanifest)> | 必須 | maxItems=1000 | — |

## PluginSettingResponse

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [PluginSetting](../schemas/models.md#pluginsetting) | 必須 | — | — |

## PluginStateResponse

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [PluginState](../schemas/models.md#pluginstate) | 必須 | — | — |

## PluginTrialResultResponse

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [PluginTrialResult](../schemas/models.md#plugintrialresult) | 必須 | — | — |

## PluginTrialPosition

配列<座標2値>。minItems=2、maxItems=2

## PluginTrialGeometry

分岐 1

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "Point" | 必須 | — | — |
| `coordinates` | [PluginTrialPosition](../schemas/models.md#plugintrialposition) | 必須 | — | — |

分岐 2

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "LineString" | 必須 | — | — |
| `coordinates` | 配列<[PluginTrialPosition](../schemas/models.md#plugintrialposition)> | 必須 | minItems=2、maxItems=10000 | — |

分岐 3

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "Polygon" | 必須 | — | — |
| `coordinates` | 配列<配列<[PluginTrialPosition](../schemas/models.md#plugintrialposition)>> | 必須 | minItems=1、maxItems=10000 | — |

分岐 4

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "MultiPolygon" | 必須 | — | — |
| `coordinates` | 配列<配列<配列<[PluginTrialPosition](../schemas/models.md#plugintrialposition)>>> | 必須 | minItems=1、maxItems=10000 | — |

## PluginTrialFeature

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | "Feature" | 必須 | — | — |
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `geometry` | [PluginTrialGeometry](../schemas/models.md#plugintrialgeometry) | 必須 | — | — |
| `properties` | object | 必須 | — | — |

`properties` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | place / route / hazard / observation / forecast / terrain / pilgrimage | 必須 | — | — |
| `label` | string | 必須 | minLength=1、maxLength=200 | — |
| `legendId` | string | 必須 | minLength=1、maxLength=80 | — |
| `sourceIds` | 配列<string> | 必須 | minItems=1、maxItems=10000、uniqueItems=True | — |
| `status` | simulated / unknown | 必須 | — | — |
| `value` | number または null | 必須 | — | — |
| `unit` | string または null | 必須 | — | — |

## PluginTrialLegend

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `label` | string | 必須 | minLength=1、maxLength=200 | — |
| `color` | string | 必須 | pattern=^#[0-9a-fA-F]{6}$ | — |
| `meaning` | string | 必須 | minLength=1、maxLength=2000 | — |

## PluginTrialSource

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `title` | string | 必須 | minLength=1、maxLength=200 | — |
| `url` | string (uri) または null | 必須 | — | — |
| `attribution` | string | 必須 | minLength=1、maxLength=2000 | — |
| `dataKind` | "mock" | 必須 | — | — |
| `fetchedAt` | integer または null | 必須 | — | — |
| `sourceUpdatedAt` | integer または null | 必須 | — | — |
| `observedAt` | integer または null | 必須 | — | — |
| `issuedAt` | integer または null | 必須 | — | — |
| `validAt` | integer または null | 必須 | — | — |

## PluginIconId

pin / motorcycle / shield / book / star / map。—

## PluginIconOption

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [PluginIconId](../schemas/models.md#pluginiconid) | 必須 | — | — |
| `label` | string | 必須 | — | — |
| `symbol` | string | 必須 | — | — |

## RecordDeletionPreview

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `recordId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |
| `deletes` | object | 必須 | — | — |
| `preserves` | object | 必須 | — | — |
| `dependentResults` | "unavailable" | 必須 | — | 削除後の根拠再検査で依存する生成結果は表示対象外となる。 |
| `exportUrl` | string | 必須 | — | — |

`deletes` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `record` | true | 必須 | — | — |
| `mediaIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | — | — |
| `themeMembershipIds` | 配列<[Id](../schemas/models.md#id)> | 必須 | — | — |

`preserves` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `visitId` | [Id](../schemas/models.md#id) または null | 必須 | — | — |
| `independentRecords` | true | 必須 | — | — |

## ReflectionQuestion

生成質問は根拠の現在権限/版を照合し、changed/unavailableではquestionText=null。本人の回答原文と状態は別の正本から保持。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `targetRecordId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `topic` | purpose / reason / context / alternative | 必須 | — | — |
| `questionText` | string または null | 必須 | — | — |
| `sourceRefs` | 配列<[SourceRef](../schemas/models.md#sourceref)> | 必須 | maxItems=1000 | — |
| `generatorVersion` | string | 必須 | minLength=1、maxLength=200 | — |
| `status` | pending / later / skipped / answered | 必須 | — | — |
| `answerRecordId` | [Id](../schemas/models.md#id) または null | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `answerText` | string または null | 必須 | — | — |
| `answerVersion` | [Version](../schemas/models.md#version) または null | 必須 | — | — |
| `answerRef` | [SourceRef](../schemas/models.md#sourceref) または null | 必須 | — | — |
| `answerUnavailable` | boolean | 必須 | — | — |
| `evidenceState` | current / changed / unavailable | 必須 | — | — |

## ReflectionQuestionPage

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[ReflectionQuestion](../schemas/models.md#reflectionquestion)> | 必須 | — | — |
| `nextCursor` | string または null | 必須 | — | — |

## ReflectionQuestionFromRun

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |

## ReflectionQuestionPatch

answeredには回答原文を必須。訂正にはGETしたanswerVersionも必須。本文はRECORDS private memo正本。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `status` | later / skipped / answered | 必須 | — | — |
| `answerText` | string | 省略可 | minLength=1、maxLength=4000 | — |
| `answerVersion` | [Version](../schemas/models.md#version) | 省略可 | — | — |

## ReflectionComparisonCreate

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `left` | [SourceRef](../schemas/models.md#sourceref) | 必須 | — | — |
| `right` | [SourceRef](../schemas/models.md#sourceref) | 必須 | — | — |
| `common` | string | 必須 | minLength=0、maxLength=100 | — |
| `differences` | string | 必須 | minLength=0、maxLength=100 | — |
| `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | — | — |

## ReflectionComparisonPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `left` | [SourceRef](../schemas/models.md#sourceref) | 必須 | — | — |
| `right` | [SourceRef](../schemas/models.md#sourceref) | 必須 | — | — |
| `common` | string | 必須 | minLength=0、maxLength=100 | — |
| `differences` | string | 必須 | minLength=0、maxLength=100 | — |
| `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | — | — |

## ReflectionComparison

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `personId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `left` | [SourceRef](../schemas/models.md#sourceref) | 必須 | — | — |
| `right` | [SourceRef](../schemas/models.md#sourceref) | 必須 | — | — |
| `common` | string | 必須 | minLength=0、maxLength=100 | — |
| `differences` | string | 必須 | minLength=0、maxLength=100 | — |
| `timeZone` | [TimeZone](../schemas/models.md#timezone) | 必須 | — | — |
| `insightId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |
| `createdAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `updatedAt` | [Timestamp](../schemas/models.md#timestamp) | 必須 | — | — |
| `evidenceState` | current / changed | 必須 | — | — |
| `insight` | [Insight](../schemas/models.md#insight) または null | 必須 | — | — |

## ReflectionAdopt

extractはfieldsのみ採用しbodyを書き換えない。diaryは本人確認body、既存はIf-Match、新規はcreate=trueと対象日内occurredAt。 表示中RunのexpectedAttemptを固定し、採用済み同内容は保存先の現在版を再取得。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `assistantMessageId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `recordId` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `fields` | 配列<purpose / reason> | 省略可 | minItems=1、maxItems=2、uniqueItems=True | — |
| `body` | string | 省略可 | minLength=0、maxLength=20000 | — |
| `create` | boolean | 省略可 | — | — |
| `occurredAt` | [Timestamp](../schemas/models.md#timestamp) | 省略可 | — | — |
| `expectedAttempt` | integer | 必須 | minimum=1 | — |

## RouteStep

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `geometry` | [CommonMapGeometry](../schemas/models.md#commonmapgeometry) | 必須 | — | — |
| `distanceM` | number | 必須 | minimum=0 | — |
| `durationSec` | integer | 必須 | minimum=0 | — |
| `location` | 配列<座標2値> | 必須 | minItems=2、maxItems=2 | — |
| `type` | string | 必須 | minLength=1 | — |
| `modifier` | ['string', 'null'] | 必須 | — | — |
| `instruction` | string | 必須 | — | — |
| `name` | string | 必須 | — | — |

## RouteConditions

指定条件を黙って除外しない。avoidMotorwaysはdrivingの実provider評価に対応。他の有効な条件指定は501 MODE_UNSUPPORTED。日時はUTC Unixミリ秒。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `departAt` | integer | 省略可 | minimum=0 | 出発日時、UTC Unixミリ秒 |
| `returnBy` | integer | 省略可 | minimum=0 | 行程終点への帰着期限、UTC Unixミリ秒 |
| `avoidStairs` | boolean | 省略可 | — | — |
| `preferCovered` | boolean | 省略可 | — | — |
| `transitPassIds` | 配列<[Id](../schemas/models.md#id)> | 省略可 | maxItems=100、uniqueItems=True | — |
| `stayDurationSec` | integer | 省略可 | minimum=0 | — |
| `avoidMotorways` | boolean | 省略可 | — | drivingのみ。全区間にexclude=motorwayを指定し、provider違反通知・道路分類を検査。違反は採用不可。 |

## RouteComparisonResult

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `items` | 配列<[RouteSearchResult](../schemas/models.md#routesearchresult)> | 必須 | minItems=1、maxItems=3 | — |

## RouteConditionEvaluation

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `key` | "avoidMotorways" | 必須 | — | — |
| `status` | "applied" | 必須 | — | — |
| `reason` | string | 必須 | — | — |
| `provider` | "mapbox-directions" | 必須 | — | — |
| `sourceUrl` | string (uri) | 必須 | — | — |
| `fetchedAt` | integer | 必須 | minimum=0 | — |

## Settings

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `version` | integer | 必須 | minimum=1 | — |
| `createdAt` | integer | 必須 | minimum=0 | — |
| `updatedAt` | integer | 必須 | minimum=0 | — |
| `display` | object | 必須 | — | — |
| `location` | object | 必須 | — | — |
| `media` | object | 必須 | — | — |
| `ai` | object | 必須 | — | — |
| `notifications` | object | 必須 | — | — |
| `retention` | object | 必須 | — | — |
| `suggestions` | object | 必須 | — | — |
| `profileVisibility` | private / friends / public | 必須 | — | — |

`display` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `fontSize` | standard / large / extraLarge | 必須 | — | — |
| `reduceMotion` | boolean | 必須 | — | — |

`location` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 必須 | — | — |
| `saveTrack` | boolean | 必須 | — | — |

`media` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `photosEnabled` | boolean | 必須 | — | — |
| `microphoneEnabled` | boolean | 必須 | — | — |

`ai` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 必須 | — | — |
| `allowRecords` | boolean | 必須 | — | — |
| `allowLocation` | boolean | 必須 | — | — |
| `allowMedia` | boolean | 必須 | — | — |
| `allowProfile` | boolean | 必須 | — | — |

`notifications` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 必須 | — | — |
| `timing` | immediate / daily | 必須 | — | — |
| `dailyAt` | string | 必須 | pattern=^([01][0-9]|2[0-3]):[0-5][0-9]$ | — |
| `timeZone` | string | 必須 | minLength=1、maxLength=80 | — |

`retention` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `recordsDays` | integer または null | 必須 | — | — |
| `trackDays` | integer または null | 必須 | — | — |

`suggestions` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 必須 | — | — |
| `timing` | onOpen / continuous | 必須 | — | — |
| `summaryDays` | integer | 必須 | minimum=1、maximum=36500 | — |
| `stopped` | 配列<未指定 または 未指定> | 必須 | maxItems=1000、uniqueItems=True | — |

`stopped` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `placeId` | string または null | 必須 | — | — |
| `activity` | string または null | 必須 | — | — |

## SettingsPatch

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `display` | object | 省略可 | — | — |
| `location` | object | 省略可 | — | — |
| `media` | object | 省略可 | — | — |
| `ai` | object | 省略可 | — | — |
| `notifications` | object | 省略可 | — | — |
| `retention` | object | 省略可 | — | — |
| `suggestions` | object | 省略可 | — | — |
| `profileVisibility` | private / friends / public | 省略可 | — | — |

`display` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `fontSize` | standard / large / extraLarge | 必須 | — | — |
| `reduceMotion` | boolean | 必須 | — | — |

`location` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 必須 | — | — |
| `saveTrack` | boolean | 必須 | — | — |

`media` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `photosEnabled` | boolean | 必須 | — | — |
| `microphoneEnabled` | boolean | 必須 | — | — |

`ai` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 必須 | — | — |
| `allowRecords` | boolean | 必須 | — | — |
| `allowLocation` | boolean | 必須 | — | — |
| `allowMedia` | boolean | 必須 | — | — |
| `allowProfile` | boolean | 必須 | — | — |

`notifications` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 必須 | — | — |
| `timing` | immediate / daily | 必須 | — | — |
| `dailyAt` | string | 必須 | pattern=^([01][0-9]|2[0-3]):[0-5][0-9]$ | — |
| `timeZone` | string | 必須 | minLength=1、maxLength=80 | — |

`retention` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `recordsDays` | integer または null | 必須 | — | — |
| `trackDays` | integer または null | 必須 | — | — |

`suggestions` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `enabled` | boolean | 必須 | — | — |
| `timing` | onOpen / continuous | 必須 | — | — |
| `summaryDays` | integer | 必須 | minimum=1、maximum=36500 | — |
| `stopped` | 配列<未指定 または 未指定> | 必須 | maxItems=1000、uniqueItems=True | — |

`stopped` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `placeId` | string または null | 必須 | — | — |
| `activity` | string または null | 必須 | — | — |

## SettingsResult

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [Settings](../schemas/models.md#settings) | 必須 | — | — |

## OwnDataSummary

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `person` | [Person](../schemas/models.md#person) | 必須 | — | — |
| `settings` | [Settings](../schemas/models.md#settings) | 必須 | — | — |
| `categories` | 配列<object> | 必須 | — | — |
| `recordActions` | object | 必須 | — | — |

`categories` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | profile / settings / records | 必須 | — | — |
| `label` | string | 必須 | — | — |
| `count` | integer | 必須 | minimum=0 | — |
| `readUrl` | string | 必須 | — | — |
| `exportUrl` | string または null | 必須 | — | — |
| `deletionPreviewUrl` | string または null | 必須 | — | — |
| `deleteUrl` | string または null | 必須 | — | — |
| `version` | integer または null | 必須 | — | — |
| `deletionEffect` | string | 必須 | — | — |

`recordActions` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `exportTemplate` | string | 必須 | — | — |
| `deletionPreviewTemplate` | string | 必須 | — | — |
| `deleteTemplate` | string | 必須 | — | — |

## OwnDataSummaryResult

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `data` | [OwnDataSummary](../schemas/models.md#owndatasummary) | 必須 | — | — |

## SuggestionTimeBudget

exact is a finite upper budget; atLeast(120) is not an upper ceiling; unspecified requires minutes:null

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `kind` | exact / atLeast / unspecified | 必須 | — | — |
| `minutes` | ['integer', 'null'] | 必須 | minimum=1、maximum=1440 | — |

## SuggestionConditionEvaluation

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `key` | string | 必須 | — | — |
| `status` | matched / unmatched / unknown | 必須 | — | — |
| `reason` | string | 必須 | — | — |
| `hard` | boolean | 省略可 | — | — |
| `sourceRefs` | 配列<[SourceRef](../schemas/models.md#sourceref)> | 省略可 | — | — |

## ThemeColorKey

青緑、ピンク、オレンジ、黄、緑、青、紫。省略時teal。

teal / pink / orange / yellow / green / blue / purple。—

## MemoOrigin

由来表示用の参照。AI SourceRefとは別。削除時は参照だけ除去しメモ本文を保持。

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | record / suggestion | 必須 | — | — |
| `id` | [Id](../schemas/models.md#id) | 必須 | — | — |
| `version` | [Version](../schemas/models.md#version) | 必須 | — | — |

## MemoPresentation

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `name` | string | 必須 | minLength=1、maxLength=20 | — |
| `originRefs` | 配列<[MemoOrigin](../schemas/models.md#memoorigin)> | 必須 | maxItems=100、uniqueItems=True | — |
| `keywords` | 配列<string> | 必須 | maxItems=50、uniqueItems=True | — |

## TransferRecipeInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `title` | string | 必須 | minLength=1、maxLength=200 | — |
| `meaning` | string | 必須 | minLength=1、maxLength=2000 | — |
| `sourceRefs` | 配列<object> | 必須 | minItems=1、maxItems=200 | — |
| `steps` | 配列<object> | 必須 | minItems=1、maxItems=9 | — |
| `requiredConditions` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `allowedChanges` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |

`sourceRefs` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | record / visit / place / checkin / route | 必須 | — | — |
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `version` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

`steps` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `meaning` | string | 必須 | minLength=1、maxLength=2000 | — |
| `sourceRecordIds` | 配列<string> | 必須 | minItems=1、maxItems=20 | — |
| `stayMinutes` | integer | 必須 | minimum=0、maximum=1440 | — |
| `required` | boolean | 必須 | — | — |

## TransferRecipe

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `title` | string | 必須 | minLength=1、maxLength=200 | — |
| `meaning` | string | 必須 | minLength=1、maxLength=2000 | — |
| `sourceRefs` | 配列<object> | 必須 | minItems=1、maxItems=200 | — |
| `steps` | 配列<object> | 必須 | minItems=1、maxItems=9 | — |
| `requiredConditions` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `allowedChanges` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `version` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |
| `createdAt` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |
| `updatedAt` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |

`sourceRefs` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | record / visit / place / checkin / route | 必須 | — | — |
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `version` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

`steps` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `meaning` | string | 必須 | minLength=1、maxLength=2000 | — |
| `sourceRecordIds` | 配列<string> | 必須 | minItems=1、maxItems=20 | — |
| `stayMinutes` | integer | 必須 | minimum=0、maximum=1440 | — |
| `required` | boolean | 必須 | — | — |

## TransferPlanInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `recipeId` | string | 必須 | minLength=1、maxLength=200 | — |
| `recipeVersion` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |
| `region` | string | 必須 | minLength=1、maxLength=300 | — |
| `start` | object | 必須 | — | — |
| `mode` | walking / driving | 必須 | — | — |
| `timeBudgetMinutes` | integer | 必須 | minimum=1、maximum=1440 | — |
| `preferences` | string | 必須 | minLength=0、maxLength=4000 | — |

`start` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `longitude` | number | 必須 | minimum=-180、maximum=180 | — |
| `latitude` | number | 必須 | minimum=-90、maximum=90 | — |

## TransferPlanSet

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=80 | — |
| `recipeId` | string | 必須 | minLength=1、maxLength=200 | — |
| `recipeVersion` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |
| `region` | string | 必須 | minLength=1、maxLength=300 | — |
| `start` | object | 必須 | — | — |
| `mode` | walking / driving | 必須 | — | — |
| `timeBudgetMinutes` | integer | 必須 | minimum=1、maximum=1440 | — |
| `preferences` | string | 必須 | minLength=0、maxLength=4000 | — |
| `recipe` | object | 必須 | — | — |
| `sourceRefs` | 配列<object> | 必須 | minItems=1、maxItems=200 | — |
| `candidates` | 配列<object> | 必須 | minItems=0、maxItems=100 | — |
| `generatorVersion` | string | 必須 | minLength=1、maxLength=100 | — |
| `status` | pending / running / complete / incomplete / failed / cancelled / adopted | 必須 | — | — |
| `assistantMessageId` | string または null | 必須 | — | — |
| `assistantAttempt` | integer または null | 必須 | — | — |
| `plans` | 配列<object> | 必須 | minItems=0、maxItems=2 | — |
| `commonalities` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `differences` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `selectedVariant` | faithful / personalized または null | 必須 | — | — |
| `savedRouteId` | string または null | 必須 | — | — |
| `error` | object または null | 必須 | — | — |
| `version` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |
| `createdAt` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |
| `updatedAt` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |

`start` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `longitude` | number | 必須 | minimum=-180、maximum=180 | — |
| `latitude` | number | 必須 | minimum=-90、maximum=90 | — |

`recipe` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `title` | string | 必須 | minLength=1、maxLength=200 | — |
| `meaning` | string | 必須 | minLength=1、maxLength=2000 | — |
| `sourceRefs` | 配列<object> | 必須 | minItems=1、maxItems=200 | — |
| `steps` | 配列<object> | 必須 | minItems=1、maxItems=9 | — |
| `requiredConditions` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `allowedChanges` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `version` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |
| `createdAt` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |
| `updatedAt` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |

`sourceRefs` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | record / visit / place / checkin / route | 必須 | — | — |
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `version` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

`steps` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `meaning` | string | 必須 | minLength=1、maxLength=2000 | — |
| `sourceRecordIds` | 配列<string> | 必須 | minItems=1、maxItems=20 | — |
| `stayMinutes` | integer | 必須 | minimum=0、maximum=1440 | — |
| `required` | boolean | 必須 | — | — |

`sourceRefs` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | record / visit / place / checkin / route | 必須 | — | — |
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `version` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

`candidates` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `placeId` | string | 必須 | minLength=1、maxLength=200 | — |
| `version` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |
| `name` | string | 必須 | minLength=1、maxLength=500 | — |
| `position` | object | 必須 | — | — |
| `stepIds` | 配列<string> | 必須 | minItems=1、maxItems=9 | — |

`position` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `longitude` | number | 必須 | minimum=-180、maximum=180 | — |
| `latitude` | number | 必須 | minimum=-90、maximum=90 | — |

`plans` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `variant` | faithful / personalized | 必須 | — | — |
| `steps` | 配列<object> | 必須 | minItems=1、maxItems=9 | — |
| `explanation` | string | 必須 | minLength=1、maxLength=2000 | — |
| `conditionChecks` | 配列<object> | 必須 | minItems=0、maxItems=20 | — |
| `unmetConditions` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `unknowns` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `route` | object または null | 必須 | — | — |
| `travelMinutes` | number または null | 必須 | — | — |
| `stayMinutes` | number | 必須 | minimum=0、maximum=1000000000000 | — |
| `totalMinutes` | number または null | 必須 | — | — |
| `eligible` | boolean | 必須 | — | — |

`steps` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `stepId` | string | 必須 | minLength=1、maxLength=200 | — |
| `placeId` | string または null | 必須 | — | — |
| `explanation` | string | 必須 | minLength=1、maxLength=2000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

`conditionChecks` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `condition` | string | 必須 | minLength=1、maxLength=2000 | — |
| `status` | satisfied / unmet / unknown | 必須 | — | — |
| `explanation` | string | 必須 | minLength=1、maxLength=2000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

`route` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `durationSeconds` | number | 必須 | minimum=0、maximum=1000000000000 | — |
| `distanceMeters` | number | 必須 | minimum=0、maximum=1000000000000 | — |
| `expiresAt` | integer | 必須 | minimum=0、maximum=9007199254740991 | — |
| `sourceRefs` | 配列<object> | 必須 | minItems=0、maxItems=200 | — |

`sourceRefs` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `type` | record / visit / place / checkin / route | 必須 | — | — |
| `id` | string | 必須 | minLength=1、maxLength=200 | — |
| `version` | integer | 必須 | minimum=1、maximum=9007199254740991 | — |

`error` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `code` | string | 必須 | minLength=1、maxLength=100 | — |
| `message` | string | 必須 | minLength=1、maxLength=2000 | — |
| `retryable` | boolean | 必須 | — | — |

## TransferAiInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `planSetId` | string | 必須 | minLength=1、maxLength=80 | — |

## TransferAiOutput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `plans` | 配列<object> | 必須 | minItems=2、maxItems=2 | — |
| `commonalities` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `differences` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |

`plans` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `variant` | faithful / personalized | 必須 | — | — |
| `steps` | 配列<object> | 必須 | minItems=1、maxItems=9 | — |
| `explanation` | string | 必須 | minLength=1、maxLength=2000 | — |
| `conditionChecks` | 配列<object> | 必須 | minItems=0、maxItems=20 | — |
| `unmetConditions` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |
| `unknowns` | 配列<string> | 必須 | minItems=0、maxItems=20 | — |

`steps` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `stepId` | string | 必須 | minLength=1、maxLength=200 | — |
| `placeId` | string または null | 必須 | — | — |
| `explanation` | string | 必須 | minLength=1、maxLength=2000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

`conditionChecks` の内部：

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `condition` | string | 必須 | minLength=1、maxLength=2000 | — |
| `status` | satisfied / unmet / unknown | 必須 | — | — |
| `explanation` | string | 必須 | minLength=1、maxLength=2000 | — |
| `evidenceIds` | 配列<string> | 必須 | minItems=0、maxItems=100 | — |

## TransferAdoptionInput

| 項目 | 型 | 必須 | 制約 | 意味 |
|---|---|---|---|---|
| `variant` | faithful / personalized | 必須 | — | — |

## DataMode

live / demo。—
