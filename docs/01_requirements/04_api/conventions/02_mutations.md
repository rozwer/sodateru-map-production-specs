# 保存・権限・エラー

[DB共通規約](../../01_DB/common.json)と[共通通信](../../02_common/00_protocol.md)をHTTPへ対応させる。

## 本人と閲覧範囲

サーバーが確定したpersonId/dataModeを使う。
本人の記録・回答・会話を他人が更新できないことを各操作で検査する。
本人を解決できなければ401、登録されていない本人なら403。
ローカルでの識別方法とセッションは[CORE契約](07_core-runtime.md)。人物の削除・プロフィール公開範囲など残るQ01は各機能が扱う。

共有記録・ルートは現在のvisibilityとsharedWithで判定する。
友人関係だけで非公開の記録は読めない。
友人解除後も明示したselected共有は残り、取消には対象の共有更新を使う。
媒体の取得、共有検索、生成の根拠にも同じ現在の閲覧判定を適用する。

## 版と再送

更新・削除・状態変更は `If-Match: "<version>"` を必須とする。
不一致は412、指定なしは428。
共通処理のexpectedVersionへ変換し、UPDATEの条件にも含める。
関連表の更新と版増加は同じトランザクション。
入力はUIで保持し、現在値を再取得してから確認する。

POSTにはIdempotency-Keyを付ける。
本人・dataMode・HTTP操作・キー・正規化入力の組で照合し、異なる入力は409 IDEMPOTENCY_CONFLICT。
同時再送・再起動・削除後を含む共通保存先はmode別DBのcore_requests。[CORE契約](07_core-runtime.md#q02永続再送)の受付を各機能の業務更新へ接続する。API一覧の存在だけで各機能の接続完了とはしない。

業務IDによる以下の再送処理は共通仕様で定義済み。

| 操作 | 照合先 | 再送結果 |
|---|---|---|
| 場所採用・ルート保存 | creation_receipts | 候補の期限より先に照合。同じ入力は現在の資源、対象削除済みは404 |
| AI送信 | messages.request_hash/request_json | 同じassistantMessageId・同じ入力は現在のRun。異なる入力は409 REQUEST_CONFLICT |
| 位置観測 | 本人とsourcePointIdの一意組 | 同じ観測は同じ点。異なる内容は409 |
| 発見の反応 | 反応ID | 同じ内容は既存反応、異なる内容は409 |

入力ハッシュは共通通信のcanonical JSONとSHA-256を使う。
本文の保存前にIDを固定し、ID集合の正規化と順序付き配列の違いを保つ。
PATCH/DELETEの応答を失った場合はGETで現在状態を確認し、古い版のまま更新を繰り返さない。

## 保存境界

訪問確認の変更と達成提案の見直しは一つの更新処理。
記録削除では媒体の対応・テーマ所属を削除し、訪問は保持。
訪問削除ではrecords.visitIdを解除し、本文は保持。
会話削除では発言を削除し、保存済み分析・比較は保持。

AI・外部通信・ファイル書込みはDBトランザクションの外側で行い、結果保存前に対象・版・権限を再確認する。
AIの下書きは本人が採用するまで記録本文へ適用しない。
媒体が保存できなければ成功を返さず、未参照ファイルを清掃する。

## エラー

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "保存後に内容が変更されています。",
    "requestId": "123e4567-e89b-42d3-a456-426614174000",
    "details": { "currentVersion": 3 }
  }
}
```

codeは機械判定、messageは説明、detailsは定義済みの補足項目。
CommonError.retryableはdetails.retryableへ写す。
内部パス・秘密値・他人の原文を含めない。
操作ごとのエラー候補は各一覧とOpenAPIへ列挙する。

| HTTP | 主なcode |
|---|---|
| 400 / 401 / 403 / 404 | INVALID_REQUEST / UNAUTHENTICATED / FORBIDDEN / NOT_FOUND |
| 409 | STATE_CONFLICT、REQUEST_CONFLICT、IDEMPOTENCY_CONFLICT、BUSY、SOURCE_CHANGED、INPUT_CHANGED |
| 410 | RESULT_EXPIRED |
| 412 / 428 | VERSION_CONFLICT / VERSION_REQUIRED |
| 413 | PAYLOAD_TOO_LARGE、INPUT_TOO_LARGE |
| 415 / 416 | UNSUPPORTED_MEDIA_TYPE / RANGE_NOT_SATISFIABLE |
| 422 | VALIDATION_FAILED、OUTPUT_INVALID、ROUTE_NOT_FOUND |
| 429 | RATE_LIMITED |
| 501 | MODE_UNSUPPORTED |
| 502 / 503 / 504 | UPSTREAM_FAILED / PROVIDER_UNAVAILABLE・UNAVAILABLE / TIMEOUT |
| 500 | INTERNAL_ERROR |

## 部分失敗と取消

共通PlaceDetailは主対象の場所取得が失敗したら全体失敗。
ownRecords/sharedRecords/visitsは共通Schemaのstatus/items/error形式を使う。
独自の日別・記録詳細はSectionのstatus/dataまたはstatus/error形式を使い、どちらも各操作のSchemaに固定する。
0件を失敗に変換しない。

通信を取り消しても保存が取り消されたとは限らない。
永続AIは取消操作で状態を先に更新し、遅着結果をid/attempt/runningの条件で除外する。
すでにcompleteなら取消は409。応答を失った場合は状態GETで確認する。
一時街歩きは専用のrequestIdに対する取消を使い、未実行・取消済みも204とする。
