# consult-history v1
既存の一時map-dialoguesはDBへ保存しない。本人が保存するconsult会話はAI #7のconversations/messagesの正本。
- 保存会話を作成し、永続化可能な場所IDを材料に共通AI consultを実行する。
- POST /map-dialogues/results/{resultId}/history {conversationId} は既存の本人consult会話と期限内resultをメモリで関連付ける。会話/発言を作成・上書きしない。
- GET /conversations/{conversationId}/map-dialogue はその本人/modeの関連を照合し、期限内なら同じresultId/候補/起点を返す。
- 応答: {conversationId,resultId,result,expiresAt,resumeAction}。期限切れ・再起動・未関連はresultId/result/expiresAtがnull、resumeAction=search。保存会話は引き続き#7から再表示できる。
- 候補は最大15分/直近6結果。temporary場所や経路の情報を履歴へ永続コピーしない。期限切れに過去IDから経路を再生成しない。
- 日付/文字検索はAI #7のGET /conversations?purpose=consult&q=&dateFrom=&dateTo=。UTC ms、from以上to未満、文字列NFKC/小文字。新規は新conversationId。
- 未所有会話はNOT_FOUND。関連付け後にAI設定版が変わった場合もsearchへ戻す。
全UIは#10。新規2operationはEXPLORATION断片、共通検索補完はAI断片から#3が反映する。
