# THEMESの画面接続

以下は契約上の呼出し例。実接続の成功証拠はprogress.mdへ別記する。

## テーマ保存

- 一覧: getThemes、単体: getThemesThemeId。
- 新規: postThemes、既存: patchThemesThemeId。成功本文は`{data:Theme}`、ETagはテーマ版。
- `name`20文字、`description`100文字、`recordIds`、`colorKey`、`coverMediaId`を一度に保存。
- 色は`teal,pink,orange,yellow,green,blue,purple`。同名テーマは`id`で区別。
- 端末の写真は追加先記録を本人が選び、RECORDSの媒体受付で保存してreadyになった媒体IDを代表写真へ指定。取消ではアップロードしない。
- 削除はdeleteThemesThemeIdへ編集時の版を指定。所属記録は保持。

## メモ保存

RECORDSの通常create/patchを使い、次の構造を追加する。

```json
{
  "body": "雨の日は屋内で休みたい",
  "useForSuggestions": true,
  "memo": {
    "name": "次の希望",
    "originRefs": [{"type": "record", "id": "元の記録ID", "version": 1}],
    "keywords": ["雨", "休憩"]
  }
}
```

作成時のid/kind等、RECORDS必須項目は既存契約どおり指定する。memoなしの通常記録/回答原文は既存契約を保持。presentation付きだけ名前20文字/本文200文字を適用。

由来を解除するときは、残す由来だけのoriginRefsをPATCHする。元記録/候補そのものの削除でも参照は解除され、メモ本文・名前・キーワードは残る。由来の変更はメモ版へ反映し、古い版での保存は再確認へ戻す。

## AI命名の本人採用（THEMES 1.1.0）

1. 共通会話API `POST /conversations/{conversationId}/messages`（postConversationsConversationIdMessages）へ `use:"theme-name"`、`context:{recordIds,currentName}`、本人の依頼文body、userMessageId/assistantMessageId、記録版のexpectedRefsを送る。会話は通常のPOST /conversationsで作成する。
2. run.resultの名前・説明を候補として表示する。編集中の値は置き換えない。
3. 本人が採用した時だけpostThemesThemeIdAdoptNameへrunId/expectedAttempt/expectedRunVersionとテーマ版を送る。
4. 本人が修正した場合はname/descriptionを追加する。上限超過は編集してから送る。
5. 版/所属/根拠変更は保存せず再確認する。採用済み参照とテーマ更新を一度に保存する。

```json
{
  "runId": "assistantMessageIdと同じID",
  "expectedAttempt": 1,
  "expectedRunVersion": 3,
  "name": "本人が整えた名前",
  "description": "本人が整えた説明"
}
```

採用は `POST /themes/{themeId}/adopt-name`。If-Matchには本人が確認したテーマversion、Idempotency-Keyには採用操作の固定keyを指定する。同じkey/同じ入力/同じIf-Matchの再送は現在のテーマを返し、候補を再適用しない。変更後の入力を採用する新しい操作には新しいkeyを使う。name/descriptionを省略すると候補の値を採用する。生成候補もname20/description100を上限とする。

runは `GET /messages/{assistantMessageId}` の `data.run` から取得する。採用後は共通のappliedRefsにtheme ID/version/contentHashが付く。AI候補完成前・run版/attempt変更・所属変更・根拠変更は409、本人が編集中にテーマ版が変われば412となる。元のフォーム値を保ち、最新内容を確認させる。

新規テーマは手動作成でIDを確定してから命名採用へ進む。採用は既存テーマの名前・説明だけを更新し、所属・色・写真を変更しない。
