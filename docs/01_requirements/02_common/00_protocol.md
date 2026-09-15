# 共通の値・要求・エラー

地図、チャット、記録、共有の画面から共通基盤を呼ぶときの約束を定める。
各処理の業務入力は、それぞれの基盤の入出力文書を使う。

## 呼出し時に固定するもの

サーバー内部では次のcontextを各共通処理へ渡す。

| 項目 | 値 | 用途 |
|---|---|---|
| personId | peopleに存在する本人ID | 所有者と閲覧範囲を照合する |
| dataMode | live / demo | 実データ用とデモ用のDB接続・一時領域を選ぶ |
| requestId | 要求ごとのUUID文字列 | 画面とサーバーの要求を対応させる |
| signal | AbortSignal | 終了・取消を外部通信へ伝える |

本人はアプリの本人選択・ログイン処理から渡す。
共通基盤のHTTP本文にはpersonIdを含めず、サーバーの本人解決処理がcontextを作る。
本人を解決できない要求は401、存在しない本人は403とする。
ローカルの仮本人を使う場合も、サーバーで登録済み本人へ対応させる。
contextの作成はHTTP入口、所有権の確認は各読出し・更新処理の責務とする。

dataModeごとにDBファイルと一時キャッシュを分ける。
同じpersonIdでもliveとdemoの結果は共有しない。
モード切替では旧signalを取り消し、要求番号を更新する。

## 値と単位

| 値 | 規則 |
|---|---|
| ID | 1〜80文字の文字列。空白だけは不可。同じ対象の編集で変えない |
| version | 1以上の整数。変更時に1増やす |
| 日時 | API・DBともUTC Unixミリ秒の整数 |
| 日付 | YYYY-MM-DDとIANAタイムゾーンの組 |
| 期間 | startAt以上、endAt未満。endAt＞startAt |
| 座標 | [経度, 緯度]。経度−180〜180、緯度−90〜90の有限数 |
| 地図表示範囲 | 緯度は−85〜85。極域は地図操作の入力エラー |
| 距離 | メートルの有限数 |
| 時間 | 秒。表示するときだけ分へ丸める |
| 不明 | NULL。0件は空配列、数値0は実際のゼロ |
| 任意項目 | schemas.jsonにdefaultがあればサーバーで補い、それ以外は文書の省略規則に従う |

JSONの項目はschemas.jsonで許可したものだけを受け付ける。
文字数はUnicodeコードポイント数。検索用の正規化は元の入力を別に保持して行う。
外部のISO日時は取得処理の境界でUnixミリ秒へ変換する。

## 成功と失敗

共通関数は各schemaの結果を返す。
HTTPでは[通信規約](../04_api/conventions/01_http.md)に従い、単体は{data}、一覧は{items,nextCursor}を基礎とする。totalCountがある一覧は同じ階層へ追加する。
requestIdはX-Request-Idヘッダーで往復させる。非同期受付は202で、dataに状態取得先statusUrlを追加する。

共通関数の失敗は次の形で表す。HTTPのエラーへは[接続表](references/http-bindings.md#openapiの型との接続変更)で変換する。

```json
{"code":"SOURCE_CHANGED","message":"参照した記録が更新されました。","retryable":false}
```

| HTTP | code | 起きる条件 | 画面の操作 |
|---|---|---|---|
| 400 | INVALID_INPUT | 型、範囲、必須項目、条件の矛盾 | 入力欄を維持して修正 |
| 401 | PERSON_REQUIRED | 本人を解決できない | 本人選択へ戻る |
| 403 | FORBIDDEN | 本人に許可されない操作 | 対象を閉じる |
| 404 | NOT_FOUND | 対象がない、または読めない | 選択を解除 |
| 409 | VERSION_CONFLICT | 保存時の版が違う | 新しい内容を読んで再確認 |
| 409 | REQUEST_CONFLICT | 同じ操作IDを違う入力で使用 | 新しい操作として送信 |
| 409 | BUSY | 同じ本人・用途で実行中 | 完了か取消を待つ |
| 409 | SOURCE_CHANGED | 生成・取得の材料が更新された | 条件を読み直して新しく実行 |
| 410 | RESULT_EXPIRED | 一時候補が期限切れ | 同じ条件で検索し直す |
| 413 | INPUT_TOO_LARGE | 材料全体の上限超過 | 期間や記録数を減らす |
| 422 | OUTPUT_INVALID | AIや外部応答が契約外 | 入力を維持し明示再試行 |
| 422 | ROUTE_NOT_FOUND | 道路経路を取得できない | 出発点・目的地を変更 |
| 429 | RATE_LIMITED | 接続先が利用制限 | 案内された時刻以降に再試行 |
| 501 | MODE_UNSUPPORTED | 移動種別などが未対応 | 対応する条件を選ぶ |
| 503 | PROVIDER_UNAVAILABLE | 外部接続・AI設定・認証の失敗 | 入力を維持し再試行 |
| 504 | TIMEOUT | 設定した期限に到達 | 入力を維持し再試行 |

retryable=trueは同じ入力の明示再試行に意味がある場合。
取得先の生の例外とトークンはmessageへ入れない。
タイムアウトや503をサーバーが自動で連続再実行する処理は置かず、AIループ内の次の判断と利用者の再試行を入口にする。

## 更新の再送

保存する対象のIDを初回送信時に発行する。
同じID・同じ正規化入力の再送は、保存済みの結果を返す。
同じIDで入力が違えばREQUEST_CONFLICT。
編集はexpectedVersionを必須とし、UPDATEのWHERE条件にも含める。

入力の比較にはcanonical JSONを使う。
オブジェクトのキーをコードポイント昇順に整列し、配列は順序を維持する。
ID集合は重複を拒否した後にソートし、順序が意味を持つ地点列・会話列はそのまま使う。
SHA-256の小文字16進文字列をrequestHashとする。

## ページ分割

共通関数の一覧既定件数は50、最大100。
通常はeffectiveAt降順、同時刻はID昇順。不明日時は末尾、ID昇順。
nextCursorはbase64url化したJSON {queryHash, time, id, unknown}。
queryHashは本人・モード・正規化した検索条件・並び順から作る。
ページ件数はqueryHashに含めない。
次ページではハッシュを照合し、違えばINVALID_INPUT。
同じ日時の比較も含むキー条件で続きを読む。

ページをまたぐ間の追加は、最初のページの再取得で反映する。
共有権限はページごとに現在値を照合する。

## 採用・作成の応答を再取得する

場所採用とルート保存は、期限付きの候補を一度だけ永続化する。
再送時は候補の期限確認より先に作成済みの受付記録を照合する。

creation_receiptsを次の列で保存する。
person_id、operation、target_id、input_hash、result_type、result_id、created_at。
主キーはperson_id・operation・target_id。
operationはplace-adopt / route-save、result_typeはplace / route。
input_hashはHTTP本文を正規化したハッシュ。

対象の作成と受付記録のINSERTは一つのトランザクションにする。
同じ受付キー・同じハッシュなら、result_idの現在の対象を取得して返す。
ハッシュが違えばREQUEST_CONFLICT。
対象が削除済みならNOT_FOUND。古い受付記録から削除済み内容を復元しない。

各共通関数は(context, input)を基本署名とし、指定IDがある関数は(context, id, input)とする。成功値を返すか、表のcode・message・retryableを持つCommonErrorを投げる。HTTP adapterがHTTP状態へ変換し、UIへ返す。
