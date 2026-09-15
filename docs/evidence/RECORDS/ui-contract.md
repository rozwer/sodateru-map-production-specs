# RECORDS 接続用の具体例

契約断片 e6485b2、固有サービス 2612b24。現時点はCOREのHTTP再送入口へ接続前で、実API成功の証拠ではない。

## 手入力 → 保存 → 再表示 → 訂正

既存operationIdとRecordCreate/RecordViewを維持。本文だけでも全必須fieldを次の形で送る。本人IDは本文へ含めずCOREのsessionを使う。

```json
{
  "id": "画面で発行し再送時も保持するUUID",
  "kind": "experience",
  "visitId": null,
  "placeId": null,
  "occurredAt": null,
  "endedAt": null,
  "timePrecision": "unknown",
  "body": "原文をそのまま",
  "purposes": [],
  "activities": [],
  "impression": "",
  "periodAnswers": {},
  "bookmarked": false,
  "useForSuggestions": true,
  "topicKey": null,
  "visibility": "private",
  "sharedWith": []
}
```

- POST `/api/v1/records`: Idempotency-Keyを保存開始時に生成し応答喪失後も保持。201 `{data:RecordView}`。
- GET `/api/v1/records/{id}`: 200 `{data:{record:RecordView,media:{status:"ready",data:{items:Media[],nextCursor}}}}`。
- PATCH 同path: `If-Match: "1"`等、本文 `{body:"訂正した原文"}`。200 `{data:RecordView}`。省略fieldは保持、競合412では再取得して本人へ確認する。
- 場所なし/日時なしはnullを送る。visitIdありはkind=experience、直接の場所と日時はnull/unknownにし、表示にはeffectivePlaceId/effectiveStartedAt等を使う。
- 媒体だけの記録はbodyを空文字として先に同じ保存を行う。AI提案で原文を勝手に置換しない。

## 媒体

POST `/records/{id}/media`はFormData `id,file,position`、親記録版のIf-Matchと媒体ごとのIdempotency-Key。1ファイル50MiB、記録100件。失敗したファイルだけ再送する。成功すると親版が増えるため次の添付/編集前にGETで親版を得る。失敗時も本文と成功済み媒体を保持する。

GET媒体contentは現在の共有権限を確認する。live/demoのX-Data-Modeを維持して共通clientからblob取得し、表示用object URLへ渡す。Rangeは単一bytesに対応する。

## 削除と文書控え

- GET `/records/{id}/deletion-preview`: `{data:{recordId,version,deletes:{record,mediaIds,themeMembershipIds},preserves:{visitId,independentRecords},dependentResults,exportUrl}}`。
- GET exportUrl: `text/html`の添付ダウンロード。原文と媒体を内包する人が読める単体文書。ready媒体欠損は503で完了扱いしない。
- DELETE `/records/{id}`へpreview.versionをIf-Matchとして送る。204。preview後に記録/媒体が変われば412で再確認。本文・媒体・テーマ所属を削除し、訪問・独立メモは保持する。

全要求のX-Request-Id、本人session、live/demo切替はCORE共通clientに従う。UI側ファイルはRECORDS担当が編集しない。
