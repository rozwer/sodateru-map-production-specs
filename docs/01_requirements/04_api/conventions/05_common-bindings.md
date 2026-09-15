# HTTPと共通関数の対応

パス・外側のHTTP応答はこのAPI仕様、業務入力の制約と処理は共通基盤を使う。
[align_common.py](../tools/align_common.py)が共通Schemaを読み、同じ型をOpenAPIへ取り込む。
CommonAI / CommonMap / CommonInfoで始まる型は、共通Schemaの同名定義に対応する。

## 要求とエラー

X-Request-Idは新しい要求のUUID。
サーバーの本人解決処理がpersonId/dataMode/requestId/signalを共通contextへ渡す。
本文中のpersonIdで本人を切り替えない。
dataModeごとにDBファイル・候補・経路・AI一時状態を分離する。

| HTTP | 共通処理 |
|---|---|
| If-Matchの引用符内の整数 | expectedVersion |
| 取消・再試行本文のattempt | expectedAttempt |
| Error.error.code=INVALID_REQUEST | 共通INVALID_INPUTを変換 |
| Error.error.code=UNAUTHENTICATED | 共通PERSON_REQUIREDを変換 |
| HTTP 412 VERSION_CONFLICT | 共通409 VERSION_CONFLICTを変換 |
| その他のCommonError | codeを保持しHTTPへ変換。retryableはerror.details.retryableへ |

REQUEST_CONFLICTは同じ対象IDの異なる要求、IDEMPOTENCY_CONFLICTはHTTP再送キーの異なる本文。
BUSY・SOURCE_CHANGED・OUTPUT_INVALID・MODE_UNSUPPORTEDなどの分類を失わない。
HTTPの型・必須・未知フィールド検査は機能別契約、共通関数の意味条件は共通仕様に従う。

## 永続AIと一時街歩き

| HTTP入力 | startRunへの入力 |
|---|---|
| パスのconversationId | conversationId |
| userMessageId / assistantMessageId | 同名 |
| body | text |
| use | comparison→compare、theme-name→theme、map-style→mapstyle、discovery→discover。他は同名 |
| context | 対応taskのInputをそのまま渡す |
| expectedRefs | 同名。画面で見ていた版の配列 |

contextは共通Inputと同じキーを使う。
たとえばdiaryはdate/timezone/recordIds、extractはrecordId/answers、analysisはinsightId。
旧案のrecordRefs・additionalAnswer・left/right・from/toという別形を同時には受け付けない。

MessageAcceptedでは保存した本人発言と応答発言、statusUrlを返す。
MessageResultでは保存したMessageとRunを返し、完了時はRun.taskをuseへ変換しRun.resultをAIOutput.valueへコピーする。
resultのevidenceIds・NULL出典URL・claimScope・sourceId・地図設定4色を落とさない。
user発言ではrun/outputはnull。
Run.insightIdで保存した比較・分析を開く。

街歩きのtext/originはPOST /map-dialogues、候補ボタンはPOST /map-dialogues/selectへ渡す。
永久保存のconsultは保存済みplaceIds/recordIds/conditionsの比較に使う。
一時Search Box候補をmessagesへ自動保存しない。

## 場所と経路

名前検索はq→query、category検索はlongitude/latitude→originの座標配列。
名前検索のlimitは1〜10、周辺は5件固定。
SearchResult.itemsのcoordinatesだけをCandidate.positionのlongitude/latitudeへ変換し、categories・retention・buildingKey・出典を保持する。
Placeの取得結果は共通Placeと同じcoordinates形式。

RouteSearchInputは共通RouteRequestのwaypoints/mode/titleを使う。
waypointsはstored/candidate/pointの分岐を保持し、2〜10地点。
RoutePreview.previewIdだけをHTTPのresultIdへ改名し、地点名・mode・各区間geometry・retentionを失わない。
保存時はresultId→previewId。
新規保存はprivateで行い、共有は本人の確認後のPATCHで変更する。
SavedRouteは共通SavedRoute形式で返し、DBのwaypoints_json/route_jsonへ相互変換する。

## 情報取得

GET /shared-recordsはRecordPageをitems/nextCursor/totalCountとして返す。
GET /shared-records/mapはRecordMapをdataへ返し、cursorとlimitを受け付けない。
地図全体の上限2,000件を超えた場合は413で範囲を絞る操作へ戻す。

queryはq→text、from/to/timeZone→range、longitude/latitude→center。
personIdsとpurposesは同名queryを繰り返し、JSON文字列にはしない。
audience/topicKey/includeUndatedも共通の検索へ渡す。

GET /places/{id}は共通PlaceDetailをdataへ返す。
colocated、ownRecords、sharedRecords、visitsの名前と領域状態を維持する。
POST /source-checksは共通checkSourcesの結果配列をdataへ返し、原文を直接返す入口にしない。
媒体の単一Rangeは206、範囲外・複数Rangeは416とする。
