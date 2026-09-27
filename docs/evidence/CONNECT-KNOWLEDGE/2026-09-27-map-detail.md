# #143 全件地図・共有単体接続

2026-09-27。基点 `b953c93dc06b1bac245a9d1bd6899d90a23f5fb6`。提出commitは本ファイルを含むPR head。
公式claim: CONNECT-KNOWLEDGE。取得pathは`src/features/knowledge/`と`docs/evidence/CONNECT-KNOWLEDGE/`のみ。

## 修正範囲

- 地図は`getSharedRecordsMap`を同じ検索語・期間・audience・地域条件で取得する。一覧の先頭100件からマーカーを作る処理を除去。cursor/limitは送らない。
- 全件のrecordIdをMapBridgeへ渡し、地点選択は同じrecordIdの詳細へ進む。場所不明はmap.totalCount - map.items.lengthとして表示。
- 413を件数過多として案内し、0件と区別。遅着・取消・画面離脱で全件地図リクエストをabortし、knowledgeのマーカーを消す。
- 詳細を`getSharedRecordsRecordId`へ接続。全ページ走査を除去。404/取得失敗・本人scope変更・非active化で旧本文と媒体を外し、再入場時に読み直す。
- 一覧の非active化でページと本文を捨て、再入場時は先頭ページを再取得。古い共有投稿を既存ページへ残さない。

## 契約と環境

UI側の統合済みhandoffはPR337 / `0d87611`。この版で正式claim済み。その後のCORE PR338を含むdevelopを取り込んだ。
claim基点と更新契約をJSON比較し、利用中の`/shared-records`、`/shared-records/map`、`/shared-records/{recordId}`、`/media/{mediaId}/content`とCommonInfoRecordPage/Map/Viewは不変。
OpenAPI全体digestはCORE更新で変わったため、UI側handoffの参照版更新は別の正式claimで行う必要がある。今回、範囲外のUI証拠は編集していない。

- 専用worktree `/Users/roz/.codex/worktrees/knowledge-143-sep27`
- Vite `--host 127.0.0.1 --port 5297 --strictPort`。5197は占有を検出して起動せず、空き5297に明示変更。
- ブラウザーURL `http://knowledge.localhost:5297/`。cookieを他担当127.0.0.1ホストから分離。
- API `127.0.0.1:3197`。live/demo DBはこのworktreeの`.local/app.sqlite`/`.local/demo.sqlite`。
- lsofでVite PID2942とAPI PID4435のcwd・listen先を確認。自身のAPIだけ再起動してPID13641、同じDBを再利用。共有サーバーは停止/変更していない。
- fixtureは作者 `knowledge-author` と閲覧者 `knowledge-reader` の2profile。本文は検証用と明記、媒体なし。liveモードの別本人読取を確認。demo切替の実ブラウザー受入は今回未確認。

## 実APIと実画面

`seed-http.py`は正式APIへPOSTし、一覧100+10件、全件地図105件/総数110件を照合する。新しい専用DBでのみ実行する。`http-seed-results.json`にHTTP結果を記録。

1. 作者がPOST /recordsで110件保存（全件201）。場所あり105、場所不明5。検索語は「検証マップ」。
2. ブラウザーで閲覧者を選択。一覧初期100件から地図へ移動すると「地図に表示できる投稿105件・場所不明5件」「地域の声110件」。検索語を保持。共通MapBridgeにも全105投稿を渡す。
3. 一覧の「続きを見る」で末尾109を読取。非表示の過去画面もDOMに残るため全`.knowledge-card`数は画面件数の根拠にしない。後述の取消後は可視button数で照合した。
4. 閲覧者がknowledge-map-000の共有単体本文を開く→場所画面へ移動。作者のPATCH /records/knowledge-map-000（If-Match:1、visibility:private）は200。閲覧者のGET /shared-records/knowledge-map-000は404。詳細へ戻ると「この投稿は現在閲覧できません」で旧本文なし。`http-revocation-results.json`。
5. 取消後一覧の可視レコードbuttonは109、取消000は0件。追加ページ後に001の詳細を開き、作者が001も公開取消→一覧へ戻る→先頭から再読取・追加ページ取得で可視button108件、取消001は0件。
6. APIを再起動しブラウザーを再読込。一覧→地図で103件・場所不明5件・総数108件を再取得。000/001の公開取消がDBに保持されている。
7. 別検索語「過大件数検証」で2001件の場所付き投稿を正式POST。実GET /shared-records/mapは413。画面は「地図に表示する投稿が多すぎます。地域や期間を絞ってください。」と2001件の声、再試行ボタン。0件の空結果・場所不明件数に偽装せず、古いknowledgeマーカーなし。`http-map-limit-results.json`。

Mapboxトークン未設定につき「地図の接続設定がありません」が表示される。全件データ/MapBridge接続の成功とMapboxの実描画は区別し、実マーカー描画PASSとはしない。

## 自動確認

- `mise exec -- bunx vitest run src/features/knowledge/screens.test.tsx`: 9件PASS。mockを使う画面controller検証として、条件往復、cursor恒久失効、全件地図150/不明5、413、hidden後の遅着棄却、共有単体404、一覧再入場時のページ破棄を照合。
- `mise exec -- bun run typecheck`: 全体PASS（COREの最新契約取込み後）。
- `mise exec -- bunx vite build`: PASS。既存の大きなchunk警告あり。

## 残件

部分接続であり、#143/#16は閉じない。COMMUNITY分類/目的/bbox、PLACES地域候補/現在情報、しおり保存・再送、UI投稿導線→公開→取消の一連操作、実媒体/別本人・dataMode切替の取消、Mapbox実描画と元UIの指定画像・端末条件は未達。今回の公開作成/取消は正式APIによる検証操作で、投稿画面の受入ではない。外部変更を閲覧中に自動配信する機構は追加しておらず、確認した公開取消反映は再取得・画面再入場時。

## 第2周: 休憩チップの1操作接続

原因はAPI未提供ではなく、screens.tsxがrest-tipで例外を投げていた接続不足。既存getKnowledge/getKnowledgeMapへcategory=tips（休憩）、experiences（体験）を渡すだけに変更した。カテゴリの定義は既存COMMUNITYに任せ、UIで再実装しない。

2026-09-27、専用worktree knowledge-tips-round2、knowledge-tips.localhost:5396（Vite --strictPort）、API3296/当該worktreeの.local/app.sqlite。lsofでPID28267/28270のcwd/listen一致を確認。正式POST /recordsで休憩memo(topicKey=rest/purposes=休憩)、散歩experience、食事memoの3件を保存。
通常のknowledge-listで体験→休憩チップ→体験を実クリックし、散歩1件→日陰ベンチ1件→散歩1件を確認。食事メモは両分類に混入せず、未接続エラーなし。実GET /knowledgeもtips/experiences各1件・200。

`bunx vitest run src/features/knowledge/screens.test.tsx -t 'rest-tip selection'` は追加1件PASS（既存9件はskip）。同分類を地図へ渡すことも同テストで確認。`bun run typecheck` PASS。前回の全件地図/413試験は再実行していない。
今回の休憩操作は完了。目的/bbox・しおり等、今回対象外の残操作があるため#143全体のfinish/closeは行わない。Mapbox実描画の未設定も今回対象外のまま。
