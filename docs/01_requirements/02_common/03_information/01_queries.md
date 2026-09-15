# 取得・検索の入出力と手順

場所詳細、日記、傾向、共有検索へ、同じ場所・日時・原文を返す。
APIの本人と値の規則は [共通通信](../00_protocol.md)、全項目は [schemas.json](schemas.json)に従う。

## API

各関数は先頭引数にcontextを受け取る。HTTP接続は[接続表](../references/http-bindings.md)へ対応させる。

| 操作 | 共通関数 | 入力 | 結果 |
|---|---|---|---|
| 場所詳細 | getPlaceDetail(placeId) | なし | PlaceDetail |
| 記録検索 | searchRecords | RecordQuery | RecordPage |
| 共有検索の地図 | mapRecords | RecordQuery。cursorはNULL | RecordMap |
| 根拠の再取得 | checkSources | refs | SourceCheck[] |
| 地域の声 | searchTopics | topicKey、RecordQueryの他条件 | RecordPage |

### RecordQuery

| 項目 | 型・既定 |
|---|---|
| text | 0〜200文字。既定空 |
| audience | own / visible / public / selected / friends。既定visible |
| placeId | IDまたはNULL。既定NULL |
| personIds | ID配列0〜100。既定空 |
| purposes | 用途名の配列0〜20。既定空 |
| range | NULLまたは{startAt,endAt,timezone}。既定NULL |
| center / radiusM | 両方NULL、または座標と1〜100,000m。既定NULL |
| topicKey | NULLまたは1〜200文字。既定NULL |
| includeUndated | 真偽値。既定false |
| cursor | NULLまたはページ位置。既定NULL |
| limit | 1〜100。既定50 |

personIdsとpurposesは集合として正規化する。
中心だけ、半径だけはINVALID_INPUT。
期間のタイムゾーンはIANA名として検査する。
日付を選ぶ画面は、その地域の0時と次の0時をUTCへ変換してrangeを作る。

## 実効的な場所・日時

recordsをvisitsへLEFT JOINする。
visit_idがある記録はvisitsのplace_id・started_at・ended_at・time_precisionを使う。
visit_idがない記録はrecordsのplace_id・occurred_at・ended_at・time_precisionを使う。
本文は常にrecords.body。
取消済み訪問に結び付いた文章も読めるが、visitStatusをrejectedとして返し、訪問回数の計算へ含めない。

RecordViewはid、person、kind、body、place、effectiveAt、endedAt、timePrecision、visitStatus、purposes、impression、topicKey、visibility、version、sourceRefs、media。
personは{id,displayName,iconPath}、placeはNULLか{id,name,address,coordinates}。
visitStatusはNULLまたは訪問の状態、mediaはMediaView配列。
sourceRefsにはrecord、使ったvisitとplaceを含める。
型はschemas.jsonに定義する。

## 検索の順序

1. [閲覧条件](02_access-media.md)で読めるrecordsをSQLで選ぶ。
2. visits・places・peopleを結び、実効的な場所と日時を作る。
3. textをNFKC、trim、小文字化する。名前・住所・本文・表示名を同じ規則で比較し、どれかの部分一致を採用する。
4. audience・placeId・personIds・topicKey・期間・距離をANDで適用する。
5. purposesの指定があれば、記録の用途配列と一件以上一致するものを残す。
6. effectiveAt降順、同時刻はid昇順、不明日時は最後のid昇順に並べる。
7. cursorより後をlimit+1件読み、余りがあればnextCursorを作る。
8. 選んだページの媒体をrecord_idで一括取得し、各記録へ結ぶ。

初期実装は、閲覧条件をSQL、Unicode正規化と残りの条件をNodeの純粋関数で実行する。
ページを切る前に条件を適用する。
SQLiteのlowerだけで日本語や全角文字の同一視を済ませない。

期間内の判定は、日時ありの点記録ならstartAt≦effectiveAt＜endAt。
終了日時ありなら、記録開始＜検索終端かつ記録終了＞検索開始。
開始と終了が同時刻なら点記録の条件を使う。
終了が検索開始と等しい記録は期間外。日記の材料は開始日で選ぶ。
日時不明はrangeなし、またはincludeUndated=trueのときに含め、日数集計はunknownへ渡す。

距離は実効的な場所の座標からhaversineで求め、radiusM以下を含める。
場所不明は距離条件に一致しない。
personIdsは投稿者に適用し、閲覧許可を広げる条件にはしない。

## RecordPageと地図検索

RecordPageは{items, nextCursor, totalCount}。
totalCountはその読出し時点で閲覧・検索条件に一致した件数。
部分的な媒体失敗はMediaViewの状態へ返す。

RecordMapは{items,totalCount}。
itemsはrecordId、personId、placeId、coordinates、mediaId（代表媒体・NULL可）を持つ。
同じ検索条件の場所が分かる全投稿を返す。地点上限は2,000投稿。
超過ならINPUT_TOO_LARGEとして範囲・期間を絞る操作へ返す。
場所不明の投稿はtotalCountに含め、itemsからは外す。
UIはtotalCount−items.lengthを「場所が未登録の投稿」として表示する。

## 場所詳細

1. placeIdの場所を取得する。存在しなければNOT_FOUND。
2. building_keyが同じでNULLでない場所を名前・ID順に読む。
3. 本人の訪問を場所で絞って全ページ取得する。
4. 本人の記録と閲覧可能な他者記録を同じ実効場所で検索する。
5. 記録の媒体をまとめて読み、状態を付けて返す。

PlaceDetailはplace、colocated、ownRecords、sharedRecords、visitsを持つ。
ownRecords/sharedRecordsは{status:"ready"|"failed",items,error}、visitsも同じ領域形式。
0件はreadyと空配列。
共有の取得失敗だけなら、場所と本人記録は表示する。
メインの場所が読めなければ詳細全体を失敗にする。

## 地域の声

topicKeyはrecords.topic_keyとの完全一致。
原文はbody、投稿者はpeople、日時は実効日時を使う。
話題の分類・題名は、登録されたtopicKeyの定義から読む。
表示順と共有条件は通常の記録検索と同じ。
デモの声はdemo用DBにだけ置き、liveの検索へ混ぜない。

people.nameをperson.displayName、people.avatar_pathをperson.iconPathへ変換する。kindはexperience / diary / memo。感想が空の場合もimpressionは空文字を返す。
