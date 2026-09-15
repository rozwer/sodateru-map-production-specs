# 場所検索と登録

地図の検索欄、投稿の場所選択、今日の提案、街歩き相談、拡張機能の目的地選択から使う。
検索結果はPlaceCandidateで返し、利用側が選択した候補を同じIDで引き継ぐ。

## 入出力

HTTP接続は[接続表](../references/http-bindings.md)。型・必須項目は [schemas.json](schemas.json)。

| 操作 | 共通関数 | 入力 | 結果 |
|---|---|---|---|
| 名前検索 | searchPlaces | query、limit | SearchResult |
| 周辺検索 | searchNearby | category、origin | SearchResult |
| 場所採用 | adoptPlace | id、resultId、candidateId | Place |
| 場所取得 | getPlace(id) | なし | Place |

名前検索のqueryは1〜200文字、前後空白を除いて空ならINVALID_INPUT。
limitは1〜10、既定10。
周辺categoryはcoffee / restaurant / bakery / park、originは地図範囲内の座標。

SearchResultは{resultId,items,expiresAt}。
itemsの順序が画面の候補番号になる。
結果が0件でもresultIdと空配列を返す。
expiresAtは作成から15分。一時結果は本人・モード・検索条件とともにメモリへ保持する。

### PlaceCandidateの全項目

| 項目 | 値・意味 |
|---|---|
| candidateId | この結果内のID。candidate-1から順番 |
| placeId | 登録済みなら場所ID、それ以外はNULL |
| name / address | 名称。住所不明はNULL |
| coordinates | [経度,緯度] |
| categories | 取得できた分類。なしは空配列 |
| provider / externalId | 提供元。外部IDがなければNULL |
| buildingKey | 建物との対応。不明はNULL |
| sourceUrl | 出典URL。不明はNULL |
| attribution | 画面に表示する帰属文 |
| fetchedAt | 取得日時。手入力はNULL |
| retention | storable / temporary |

Nominatimと本人登録の候補はstorable、Search Boxの周辺候補はtemporaryとして扱う。
temporaryの候補をadoptへ送った場合は409 REQUEST_CONFLICT「この検索候補は一時表示です」を返す。
記録や保存ルートへ採用する場所は、名前検索または本人の地点指定で確定する。

## 名前検索の処理

1. queryを前後trimし、検索用にUnicode NFKCと小文字化を行う。元の入力も保持する。
2. 保存済みplacesのname・addressを同じ方法で正規化し、部分一致を探す。
3. 一致する場所はcreated_at昇順、同時刻はid昇順でlimit件返す。
4. 保存済み一致が0件ならNominatimへ問い合わせる。
5. 外部応答の有効な行を変換し、外部応答順のままlimit件を返す。

保存済みと外部候補を混ぜる検索は行わず、保存済み優先のリハーサルの順序を使う。
本番では保存前の外部候補は一時メモリに置き、adoptでDBへ登録する。

### Nominatimの呼出し

URLはNOMINATIM_BASE_URL（既定https://nominatim.openstreetmap.org）に/searchを付ける。
以下のqueryを送る。

| キー | 値 |
|---|---|
| q | trim後のquery |
| format | jsonv2 |
| addressdetails / namedetails | 1 / 1 |
| limit | 入力limit |
| accept-language | ja |
| countrycodes | NOMINATIM_COUNTRY_CODES。既定jp |

User-AgentはNOMINATIM_USER_AGENT、既定sodateru-map-production/1.0。
一つのAPIプロセス内で全Nominatim要求を一列にし、開始間隔を1,100ミリ秒空ける。
待機を含む期限は30秒、通信開始後の期限は10秒。短い方で終了する。
待機中の取消では外部呼出しを開始しない。

HTTP成功でも配列でなければOUTPUT_INVALID。
osm_type、osm_id、lat、lon、display_nameを検査する。
lat/lonの文字列はNumberで変換し、有限数と座標範囲を確認する。
外部IDはosm_type先頭大文字とosm_idの連結。例：node・123→N123。
nameが空ならdisplay_nameの最初のカンマまでを名前にする。
categoriesはcategory・typeの空でない値を入力順に重複除去する。
住所はdisplay_name。帰属は© OpenStreetMap contributors (ODbL)。
URLはOSMの種類とIDからhttps://www.openstreetmap.org/{種類}/{番号}を作る。
必要項目が欠けた行は除外し、有効行0なら空配列を返す。

## 周辺検索

接続先はhttps://api.mapbox.com/search/searchbox/v1/category/{category}。
MAPBOX_ACCESS_TOKENをサーバーで読み、access_tokenとして送る。

language=ja、limit=5、proximity=経度,緯度。
bboxは経度±dx・緯度±0.018で、dx=0.018/max(0.2,cos(緯度×π/180))。
緯度は−85〜85へ切り詰める。経度は日付変更線の分割後に−180〜180で表す。
日付変更線をまたぐ検索は二つのbboxへ分割し、providerの外部IDで重複除去して最初の5件を使う。
片側の取得失敗は全体のPROVIDER_UNAVAILABLE。
期限は10秒、件数順はproviderの返却順を維持する。

各featureのgeometry.coordinates、properties.name、full_addressまたはaddressを読む。
名前・有効座標が欠けた行は除外する。
externalIdはproperties.mapbox_idがあれば使い、なければNULL。
候補はtemporaryで、DBへの自動登録を行わない。

## 場所の採用と更新

idは利用側が初回採用時に発行する。
最初に[作成受付記録](../00_protocol.md#採用作成の応答を再取得する)を照合し、保存済みの同一要求なら期限切れ後も現在の場所を返す。
一時結果の本人・モード・期限を照合し、candidateIdが含まれることを確認する。
storableの候補だけを受け付ける。

providerとexternal_idが一致する既存場所があれば、その行のIDを返す。
新規ならidでplacesへINSERTする。
同じidが別の内容に使われていればREQUEST_CONFLICT。
保存した結果を返すまでを一つのトランザクションにする。

| 候補 | places |
|---|---|
| name、address、coordinates | name、address、longitude、latitude |
| provider、externalId | provider、external_id |
| buildingKey | building_key |
| sourceUrl、attribution、fetchedAt | source_url、attribution、fetched_at |

分類は検索・AIに使うため、placesにcategories_json TEXT NOT NULL DEFAULT '[]'を追加する。
値は重複のない文字列配列。
外部情報の更新は専用の更新操作でversionを照合して行い、検索だけで本人の保存済み情報を上書きしない。
