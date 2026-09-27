# 通常メニューからの保存と媒体表示

基点 `7f10b80`、専用worktree/独立コピーDB、実API :3139。通常メニュー4入口はPR377（merge `7622dc4767c710e186c824d0f9f68a15936d8150`）を使用した。

- 日記: menu→日記で既存実AI日記 `adfaf0a6-1fd7-467b-b1a6-45205b920ad7` を再表示。未保存本文を入力→前日では空→当日に戻ると同じ下書きを保持した。本文を元に戻し、検証用coffee.jpgを選択・保存。GETは同じrecordId/v2、media `4f40b0d0-3c9a-48ec-9a34-9089f6dfae3b` ready/11061 bytesを返した。
- 保存写真が表示できない不具合を修正。reflection固有PhotoImageが保護URLをimgへ直渡ししていたため、既存共通clientのgetMediaMediaIdContentで取得しblobを表示する。非表示/切替時にabort・revoke、再表示時に再取得する。実reload後に390×844で写真と本文の表示を目視。写真を外して保存後も同じ本文を保持し、写真なしで再取得した。
- 比較: menu→2つの体験を比べる→実APIの架空体験 `reflection-complete-second`（図書館）と `diary139-live-source`（川辺）を選択。共通点18文字・違い27文字を保存し、comparisonId `dbf6eb87-35cf-4753-b116-2fee06055ccd` のURLへ遷移。reload後も同じ2ID・両本文を表示。2つの選択欄で相手と同じ記録は選択不可。
- メモ: menu→メモを書く。名前「静かに過ごす場所」、本人本文32文字、上記2記録の由来、キーワード「静か」、useForSuggestions=falseを保存。recordId `dad67e79-4d64-4ccf-9a2f-803cdac08e39` へ遷移。APIプロセスを停止・同DBで再起動し、reloadで同じ名前/本文/2由来/キーワード/利用falseを確認した。
- 質問・履歴は[別証拠](normal-question-2026-09-27.md)。その後あとで→履歴のあとでフィルター、スキップ→履歴のスキップフィルターを実操作し、状態だけが変わり独立回答原文が保持されることを確認。履歴320×740・390×844・1440×900で折返しと操作表示を目視した。

取得済み4ページのinteractions.jsonで、既に実UIから呼ばれるquestion-state/comparison/presentationのoperationsをOpenAPIに合わせた。質問保存はPATCH→質問/記録の再取得、解釈更新は本人の明示生成と採用を分離、比較/メモは同じIDと版・冪等キーで保存する。業務DTO・API実装は変更していない。

PhotoImage.test.tsx 1件成功（共通client経由/非表示時破棄/再表示拒否時に旧画像なし）。vite build成功。全体typecheckは統合済み探索側consent-navigation.test.tsx:19,20の2型エラーで失敗し親へ報告。reflectionの型エラーは出ていない。4仕様ファイルの全operationIdが現行OpenAPIに存在することを確認した。

未達: 全6画面の原本同寸法一致、200%文字/ソフトキーボード、全操作の別本人・live/demo・応答不明/競合/遅着・媒体部分失敗・共有取消の実通信網羅は未完了。#12/#139/#185全体を完了・closeとはしない。以前の直接URLによる比較/メモ取消/削除の証拠も、通常入口の全条件成功に読み替えない。追加AI生成は行っていない。
