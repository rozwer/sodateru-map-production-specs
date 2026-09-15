# HTTPから共通処理を呼ぶ

製品のURLと外側の応答は[API仕様](../../04_api/README.md)を使う。
この表は共通処理を接続するHTTP操作と、その接続仕様を示す。
schemas.jsonは共通関数に渡すinputと返す値を定義する。
HTTP本文は[OpenAPI](../../04_api/openapi.json)で検査し、共通関数のJSONをそのままHTTPへ公開しない。
OpenAPIに既に定義されたMessageSend・AIOutput等との具体的な対応と、必要な変更は末尾にまとめる。

| HTTP（/api/v1から） | 共通関数 | 変換 |
|---|---|---|
| POST /conversations | createConversation | 本文をConversationCreateで検査。結果は201のdata |
| POST /conversations/{id}/messages | startRun | パスidをconversationIdへ追加。本文に重複指定不可。結果は202のdataにstatusUrl=/api/v1/messages/{応答ID}を付ける |
| GET /messages/{id} | getRun | Runをdataへ。表示文は同じIDのMessage.bodyをbodyとして付ける |
| POST /messages/{id}/cancel | cancelRun | AttemptAction。結果は200のdata |
| POST /messages/{id}/retry | retryRun | AttemptAction。結果は202のdataにstatusUrlを付ける |
| GET /conversations/{id}/messages | listMessages | limitは整数へ変換。MessagePageを一覧として返す |
| GET /place-candidates | searchPlaces / searchNearby | qをqueryへ。category指定時はlongitude/latitudeをoriginへ。qとcategoryは同時不可。limitの文字列を整数化 |
| POST /places | adoptPlace | 候補採用の本文はAdoptRequest。手動登録はこの共通処理を通さず場所機能が保存 |
| GET /places/{id} | getPlaceDetail | 内部でgetPlaceを呼び、記録・訪問を組み立てる。PlaceDetailをdataへ |
| POST /route-searches | previewRoute | RouteRequest。結果をdataへ |
| POST /saved-routes | saveRoute | RouteSave。結果を201のdataへ |
| GET /saved-routes/{id} | getSavedRoute | SavedRouteをdataへ |
| PATCH /saved-routes/{id} | updateRoute | 経路置換時はRouteUpdate。案内状態・共有変更はルート機能の更新処理 |
| GET /shared-records | searchRecords | 下記の検索query変換。結果のitems・nextCursor・totalCountを本文へ |
| GET /shared-records/map | mapRecords | 同じ条件。cursorは受け付けず全件上限2,000を適用。RecordMapをdataへ |
| GET /places/{id}/voices | searchTopics | placeIdをパスから、topicKeyをqueryから固定。RecordPageを一覧本文へ |
| GET /media/{id}/content | 媒体取得 | 各取得・Range要求で権限を確認してバイナリを返す |

日記や分析からsearchRecordsを使うときは、サーバー内部でaudience=ownを渡す。
getPlaceは基礎情報の内部読出しに使い、別のHTTP場所詳細を作らない。

## 検索queryの変換

q→text、timeZone→range.timezone、from/to→range.startAt/endAt、longitude/latitude→centerの順に変換する。
personIds・purposesは同名queryの繰返し、他の項目はRecordQueryと同名を使う。
rangeを使うときはfrom・to・timeZoneの三つを必須にする。
includeUndatedは文字列true/falseだけ、数値は有限の10進表記を検査してから変換する。
未知のquery名・重複した単一値・JSON文字列での配列送信はINVALID_INPUT。

## 街歩きと根拠再照合の入口

以下は[既存一覧](../../04_api/README.md)に対する追加の接続である。

| Method・パス | 共通関数 | 入力・出力 |
|---|---|---|
| POST /map-dialogues | runDialogue | DialogueRequest → DialogueResult |
| POST /map-dialogues/select | selectDialogueCandidate | DialogueSelect → DialogueResult |
| POST /map-dialogues/cancel | cancelDialogue | DialogueCancel。取消済み・実行なしも204。別本人の実行には作用しない |
| GET /map-dialogues/results/{id} | getDialogueResult | ID → DialogueResult |
| POST /source-checks | checkSources | SourcesRequest → SourceCheck配列をdataへ |

共通処理のエラー分類は[共通エラー](../00_protocol.md#成功と失敗)へ対応させる。
本文のrequestId指定は取消対象IDに限る。新しいHTTP要求自身のIDはX-Request-Idで扱う。

## OpenAPIの型との接続変更

APIの詳細化で追加された型と、共通関数の型は次のように対応させる。
上表の入力・結果は共通関数の値であり、次の変換後に使う。

| HTTPの型・項目 | 共通処理への対応 |
|---|---|
| MessageSend.body / use / context | body→text。useのcomparison→compare、theme-name→theme、map-style→mapstyle、discovery→discover。その他は同名 |
| diary.context.recordRefs / timeZone | refsのID→recordIds、refs全体→expectedRefs、timeZone→timezone |
| extract.context.record / additionalAnswer | record.id→recordId。record→expectedRefs。additionalAnswerは直前の未回答questionと組にしてanswersへ。質問がなければ新しい回答を受け付けない |
| comparison.context.left / right | 各IDをfromRecordIds/toRecordIdsの一要素にし、両refsをexpectedRefsへ |
| analysis.context.from/to/timeZone | 分析機能が先に期間集計を保存し、そのinsightIdを共通AIへ渡す |
| theme-name.context.recordRefs | ID集合をrecordIdsへ、currentNameは新規なら空。改名では対象テーマの保存名を読む |
| consult.context.origin / originLabel / selection | 永続候補比較のconsultと分け、街歩きrunDialogueまたはselectDialogueCandidateへ渡す。Search Box結果をmessagesへ自動保存しない |
| RouteSearchInput.waypoints | placeIdありはstored、なしはpointへ変換。座標はlng/lat→coordinates。titleは保存時に決まるのでpreviewでは空 |
| Candidate.position | coordinatesをlongitude/latitudeへ変換。categories・retention・buildingKeyはサーバーの候補キャッシュにも保持 |
| RouteSearchResult | previewId→resultId。waypointsをlng/lat形式へ、geometry/legsをrouteへまとめる。保存要求の取得結果IDはpreviewIdへ戻す |
| MessageResult | Messageをmessageへ、Run.resultを用途ごとのAIOutputへ変換。引用IDは対応表からsourceRefsへ解決 |
| AIOutput.diary / theme-name / map-style | text→body、evidenceIds→sourceRefs、proposal→proposed。analysis/comparisonは保存したinsightIdを返す |

現在のHTTP型へ次の項目と条件を反映して接続する。

1. MessageSendのextractは追加回答をquestion/textの配列へ、discoveryはanchorとfactKeysへ対応させる。地図設定の4色と発見のNULL出典URL・claimScope・sourceIdを落とさずAIOutputへ持たせる。
2. 各用途の文字数・件数は共通schemaの上限へ合わせる。HTTP受付で長い入力を切り捨てず拒否する。経路は最大10地点、街歩きは300文字・特徴は最大10件。
3. 一時相談の入口と永続会話の入口を上表の通り分ける。取得結果のretentionを画面へ渡し、temporaryの保存をUIとサーバーで拒否する。
4. RecordQueryのincludeUndated・topicKey・audienceと複数人物・用途条件をqueryへ反映する。共有地図はRecordMapの全件上限方式へ合わせる。内部で切ったページを全件として返さない。
5. HTTPエラーの外形はOpenAPIのerror.code/message/requestId/details。内部のINVALID_INPUT→INVALID_REQUEST、PERSON_REQUIRED→UNAUTHENTICATEDへ変換する。他の分類もHTTPのenumへ登録し、retryableはUIの分類表へ対応させる。

入力のない型変換で条件を推測しない。モデル用の情報とHTTP表示用の情報は、この対応を通して明示的に変換する。
