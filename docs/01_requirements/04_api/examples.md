# 入出力例と確認条件

以下はAPI実装を検証するときの入力と期待値で、実サーバーでの成功報告ではない。
各操作の本文Schemaと合成例は[機能別契約](README.md#機能別契約)、共通処理の具体値は各共通基盤のexamples.jsonを参照する。

## 記録の保存と再表示

本人がperson-001で、place-001を参照できる場合の例。
全必須項目を送り、サーバーが人物・保存版・日時を決める。

```http
POST /api/v1/records
Content-Type: application/json
X-Request-Id: 123e4567-e89b-42d3-a456-426614174000
Idempotency-Key: save-record-001
```

```json
{
  "id": "record-001",
  "kind": "experience",
  "visitId": null,
  "placeId": "place-001",
  "occurredAt": 1789430400000,
  "endedAt": 1789434000000,
  "timePrecision": "exact",
  "body": "本を読んで過ごした。",
  "purposes": ["読書"],
  "activities": [],
  "impression": "落ち着けた。",
  "periodAnswers": {},
  "bookmarked": false,
  "useForSuggestions": true,
  "topicKey": null,
  "visibility": "private",
  "sharedWith": []
}
```

期待結果は201、Locationは `/api/v1/records/record-001`、ETagは `"1"`。
dataはRecordViewで、保存内容にpersonId=person-001、version=1、createdAt/updatedAtと実効的な場所・日時を加える。
GETで再取得して原文・用途・感想が一致することを確認する。
この操作ではvisitsを増やさない。

同じIdempotency-Key・同じ入力の通信再送では重複行を作らない。
同じキーでbodyだけ変えた場合は409 IDEMPOTENCY_CONFLICT。
共通の永続受付は[CORE契約](conventions/07_core-runtime.md)へ具体化した。各機能は業務更新と受付を接続し、契約検査だけで全機能の永続保証済みとはしない。

## 編集の競合

record-001のDB版が2へ進んだ状態で、If-Match: "1"を付けたPATCHを送る。
本文は `{ "impression": "別の感想" }`。

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "保存後に内容が変更されています。",
    "requestId": "123e4567-e89b-42d3-a456-426614174000",
    "details": { "currentVersion": 2 }
  }
}
```

HTTPは412、DB内容とversionは変更しない。
画面は入力を保持し、GETで版2を読んでから再編集する。

## 型検査以外にも必要なケース

| ケース | 入力・前提 | 期待結果 |
|---|---|---|
| 必須キーなし | 記録bodyを省略 | 422、行を作らない |
| 所有者の偽装 | 記録POSTへpersonIdを追加 | 未定義入力として422。所有者は認証contextから決める |
| 訪問への追加 | 本人のvisitIdを指定し、場所・日時の直接列をnullにする | 記録だけ保存。実効値はvisitsから取得 |
| 訪問と直接場所の混在 | visitIdとplaceIdの両方が非null | 422、変更なし |
| 別人の訪問 | 他人のvisitIdで保存 | 404または非開示の閲覧拒否。本文・訪問情報を返さない |
| 訪問の確認取消 | 達成提案が参照するconfirmed訪問をrejectedへ | 同一トランザクションで提案をselected、completedVisitId=nullへ |
| 媒体の順序交換 | 親版と全媒体ID・版を指定し、順序を逆転 | 重複positionを残さず一括成功。途中状態を保存しない |
| 媒体版の競合 | 並べ替え対象の一件だけ別版 | 412、全件変更なし |
| 共有取消後のRange取得 | 共有先が動画の次のbytes区間を取得 | 現在権限で404。過去の許可を使わない |
| AI取消後の遅着 | 同じid/attemptのrunningをcancelledへ確定後に生成完了 | 条件付きUPDATEは0件、本文・resultを保存しない |
| AI完了後の取消 | status=completeに取消要求 | 409。新しい依頼は別ID |
| 再試行時の材料変更 | request_jsonのsourceRefsより原文版が新しい | 409 SOURCE_CHANGED。新材料を古い発言に黙って置き換えない |
| 再起動 | pending/runningが残る | API受付前にfailed/INTERRUPTEDへ整理。本人の再試行だけで再開 |
| 一時候補の採用 | retention=temporaryをPOST /placesへ | 409 REQUEST_CONFLICT。名前検索・手動場所選択へ戻す |
| 空の共有検索 | 条件に合う閲覧可能投稿なし | 200、items=[]、nextCursor=null、totalCount=0 |
| 未読ページの共有投稿 | 101件目以降に条件一致がある | ページ分割前の検索対象に含める |
| 共有地図2,001件 | 同じ検索条件が上限超過 | 413 INPUT_TOO_LARGE。先頭2,000件を全件として返さない |
| 道路経路なし | providerがNoRoute | 422 ROUTE_NOT_FOUND。直線へ代替しない |
| 非対応の交通種別 | cyclingまたはtransit | 501 MODE_UNSUPPORTED |
| 根拠の版変更 | checkSourcesで閲覧可能な別版 | changedとcurrentVersion。削除・権限なしはunavailable/null |
| 発見を非表示 | 最新のsaved反応後にblocked | 保存一覧から除外。known/interestedは表示状態を変えない |

HTTP入口のSchema検査と、所有権・版・保存・再表示の意味条件を別々に実装検証する。
[check_contracts.mjs](tools/check_contracts.mjs)は前者と文書整合の検査であり、後者の完了証拠ではない。
