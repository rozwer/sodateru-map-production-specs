# EXPLORATION 接続途中の検証（2026-09-15）
状態: CORE.runtime接続まで。実AI/実地理APIとUIの受入は未達。
## 統合境界
CORE PR #53（413598b）を含むdevelopを専用worktreeへ取り込み、CoreServices/本人cookie/contractValidation/idempotentMutation/transactionを使用した。
共通AI/SETTINGS/INFORMATION/ROUTESのruntime.mjsは提供署名で接続コードを用意したが、これらの統合と実呼出し確認はまだ必要。AI/SETTINGS/ROUTESを含むdevelopは取込済み。INFORMATIONは存在時に実moduleを読み込み、未統合時は根拠を必要とする操作だけ503を返す。探索register.tsの実import成功を確認した。
## 確認したもの
- dialogue.test.mjs 7成功: 2番目/同一候補ID・元検索resultId/固定起点、別本人/mode/設定版/期限、取消/BUSY/遅着破棄、検索上限、直近4往復と6結果、元候補の期限上限、共通エラー時の入力保持、アイドル時TTL消去。
- discovery.test.mjs 5成功: 実SQLiteファイルsave→close/reopen→get、出典/反応/非表示、版/所有者/mode、根拠変更/削除、取消/古いattempt、採用receiptによる削除後復活拒否、共通順序とcursor、採用時完全出典検査。
- history.test.mjs 1成功、facts.test.mjs 1成功、discover-task.test.mjs 3成功。
- http.test.mjs 1成功: 統合済みCORE createAppの本人cookie・入力検査を通してAPI呼出し。SQLiteカード保存、同一キー再送、異入力409、DB再open再取得、非表示、If-Match必須428、削除204、削除後再送404、mode不一致401。一時相談再送で同じresultId、再送DBには本文なし、再起動後は410。
- COREのみ取込時のbun run typecheckは成功。最新develop取込後はTHEMES service.test.ts(41)とDISASTER mask/provider.test/release/service（plugins/index未統合を含む）で失敗。EXPLORATION診断は0（MJSの実行検証は上記テスト）。EXPLORATIONの5 Schemaは既存components参照込みAjv2020コンパイル成功。
コマンド: mise exec -- node --experimental-transform-types --test server/features/exploration/<対象>.test.mjs。Node 22.22.1、SQLite/Transform Types/MockTimersのExperimentalWarningあり。
## 証拠の限界
HTTPテストはHono Requestを通す同一プロセスのHTTP境界テスト。通信ポートや実CLIはまだ起動していない。AI/場所/経路/SourceChecksはこのテストでは注入値、SQLiteとCORE本人・検証・再送は実装そのもの。外部実接続の成功と取り違えない。
## 残る受入
統合済みの共通AI実CLI＋PLACES/ROUTESで相談→同候補2番目→経路→保存会話から復帰、実Run→カード保存・反応・再取得、#10の実UI、独立レビュー、PR統合、board/Issue終了。

## 先行提供の切り分け
PR #99固定head 2e1377bを独立担当が限定レビューし重大指摘なし。元#26の未達実接続/UI通し受入は後続#102へ移管し相互リンクした。先行範囲はHTTP/業務処理/SQLite保存と実サービス接続口。元全要件完成を主張しない。

## 実TCP・Luna・Mapbox（先行統合後）
PR #99はdevelopのb1126e0553d7cf2f2d4d13ef3387130c9f2c3706へ通常統合済み。
live-runtime.mjsは本人cookie・実設定許可・共有生成clientを用い、実TCPサーバーを起動。SETTINGS/履歴の追加operation未生成分は実HTTPを直接使用し、contractには提供fragmentをメモリ上で反映した。正式UIの生成client反映とは別の検証である。
- 初回: 実Luna相談でOUTPUT_INVALID。旧共通文言のため分岐は未確定（live-runtime-first.json）。
- 固有修正: 検索categoryのSchemaを実行可能値のenumへ合わせ、promptへ分類対応と完了条件を明記。検索2/経路3/判断6の上限は維持。dialogue7テスト成功。
- 修正後: 実Luna→実Mapbox検索で5候補、続きの「2番目」から経路が返り、その同じcandidateIdをselectへ渡して固定起点・1経路・mapbox-directionsを確認。実保存consult会話へのリンク→同じresultIdで復帰に成功。
- 経路retentionはtemporary。実候補・経路の生データは証拠やDBへ保存していない。保存可能な経路の通し検証とは扱わない。
- discover実Runはfailed/UPSTREAM_FAILEDで停止。実AI発見保存と再起動再取得は未達。INFORMATION未統合時の根拠操作503、生成client不足、実UI、再起動後履歴確認を#102へ引き継ぐ。
結果: live-runtime.json。モデルgpt-5.6-luna、正規主clone.envをprocessへ注入（秘密値は未記録）。最初の検索入力と続きの文言は再現スクリプトに記録。再現はnode --env-file=<主clone>/.env --experimental-transform-types docs/evidence/EXPLORATION/live-runtime.mjs。
