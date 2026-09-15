# 参照版・現在権限・AI許可の実接続確認

2026-09-15、base2155430。server/ai/permissions-integration.test.tsをnode --experimental-transform-types --testで実行し、6ケース（親を含め7 tests）がPASS。

INFORMATION、SETTINGS、CORE HTTP、SQLiteは本番実装を使用。外部AI応答のタイミングだけcontrolled providerとし、実Lunaは反復していない。二人の合成本人、共有記録、専用一時DBを使い、共有デモへの変更なし。

1. 古いexpectedRefsは受付前にSOURCE_CHANGED。messages作成なし、外部呼出なし。
2. 受付直後の共有撤回は送信前にNOT_FOUND。外部呼出なし。
3. provider待機中の参照版変更はfailed/SOURCE_CHANGED、結果保存なし。再試行は同じ版で拒否。
4. provider待機中の共有撤回はfailed/NOT_FOUND、結果保存なし。再試行拒否、本人入力保持。
5. 完了後の共有撤回はRun/HTTP取得・会話発言一覧・本文検索・再送から結果を非表示。SQLite再open後も同じ。
6. 受付後・送信前のenabled撤回とrecords scope撤回はFORBIDDENで外部呼出なし。明示再許可後のretryは元input/modelを保持しattempt3でcomplete。

既に外部へ渡したデータを取り消せたという証拠ではない。音声実マイク受入は含まない。
標準typecheckは担当外CORE fixtureのdisplayName、UI exploration requestId、records/reflection、tools/local/devの既存不一致で失敗。追加AIテスト由来の型エラーはなし。requestId不一致は音声/相談取消に実影響があるためCOREへ具体再現を連絡した。
