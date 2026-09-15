# PILGRIMAGE #38 検証と接続契約

## 実装

- 出典検索: `POST /plugins/pilgrimage/searches`。本文 `id` と同じ `Idempotency-Key` を送る。同じIDは元の検索snapshotを返し、新しいIDの再検索でのみ再取得する。
- 飛騨市公式観光サイトの「君の名は。」に関する個別の記載を実取得・再確認。図書館は関連施設、駅/神社/バス停はモデル地として別分類。公式ページの飲食店等を一律に作品関連として採用しない。
- 一般作品名/作品ID検索はWikidataのP915（撮影場所）/P840（物語の舞台）とP625（座標）。共同編集の関係はunverified。URLの存在だけではconfirmedにしない。未確認候補の手動採用にはacknowledgeUnverified=trueが必要で、保存/表示でも未確認を保持する。
- 自作の事実要約・URL・取得時刻・根拠範囲だけを保存。元の本文/画像を転載しない。Wikidata構造データはCC0（https://www.wikidata.org/wiki/Wikidata:Licensing）。公式出典は https://www.hida-kankou.jp/courses/73 。
- `postPilgrimagePreview` は2〜10件の選択順を維持。公式施設名（飛騨/飛驒の異体字を正規化）・300m内の位置・共通PLACESのstorable候補を照合。曖昧な候補/地域外/一時候補は拒否し、共通ROUTESへcandidate参照を渡す。
- `postPilgrimagePlan` は共通idempotentMutationと同期transactionでROUTES.saveRoute、場所採用、計画、AI採用参照を一括確定。採用直前に本人/モード/設定版/候補期限/場所版/AI試行と順序を再照合する。
- 計画更新は新しいpreviewとIf-Matchが必要。既存snapshotを再調査で書き換えない。各版の道路形状と根拠を保存し、GETでは再計算しない。
- PLUGINS ID `pilgrimage`、宣言 `{targetKey:"layer:pilgrimage",property:"visibility",value:true}`。workQuery/region/modeの設定保存は共通PLUGINSが所有する。固有GETで導入設定を再取得できる。
- 停止時はoverlayのみ空。計画・places・saved_routes・recordsには削除を行わない。再有効化は共通の現在の適用宣言に従う。
- AIモジュールが未提供の起動ではAI操作だけ503を返し、手動の検索/道路/保存を利用可能にする。AIモジュールの内部エラーは握りつぶさない。
- 固有AI用途 `pilgrimage`。共通startRun/getRun/cancel/retryを利用し、候補外・重複・欠落・別検索・別設定の結果を拒否。AIへ送るのは確認済み関係だけ。permissionScope.location=true。未取得の距離/道路形状を生成しない。
- 試用はmockと明示し、実在作品との対応を示さない。試用を実機能の受入証拠には使わない。

## 確認済み

`mise exec -- node --experimental-transform-types --test server/plugins/pilgrimage/service.test.ts` : 5件PASS。実SQLiteの再open/保存順/停止保持/本人・モード分離/設定版競合/未確認拒否/更新/AI採用rollback/AI候補ID、preview再送時に外部通信しないこと・再起動で一時previewを再取得しないことを確認。経路とAIはこの単体テストでは明示したtest double。

`live-probe.ts` は実公式出典・実Nominatim・実Mapbox Directions・共通PLUGINSとROUTESを使用。飛騨古川駅→飛騨市図書館を516.274m/339秒/13点の道路形状で保存・再取得。実SQLite再openでも一致、停止後に場所と経路を保持。出力は `live-service-result.json`。この実行では未統合の担当worktreeの共通依存を読取利用したため、develop統合後の全機能起動成功とは区別する。

`http-probe.ts` は実HTTPサーバーで本人セッション開始→検索→preview→計画保存/GET、同一POSTの再送200、異入力409、未対応modeの入力422、停止後GET保持、別本人404を確認。本人記録を1件保存した上で停止後の件数維持も確認。結果は `live-http-result.json`。AIのHTTP生成はこの検証の対象外。

`PILGRIMAGE.json` の検索/保存結果schemaを実取得・保存JSONへAJV2020で照合しPASS。

## 実接続の再現

通常は依存統合済みの本worktreeで実行する。MAPBOX_ACCESS_TOKENを環境またはignored .envに置く。値をログへ出さない。

```sh
mise exec -- node --experimental-transform-types --env-file-if-exists=.env docs/evidence/PILGRIMAGE/live-probe.ts
mise exec -- node --experimental-transform-types --env-file-if-exists=.env docs/evidence/PILGRIMAGE/http-probe.ts
```

一時DB/結果は `.local/pilgrimage-live/` に生成する。別途、`PILGRIMAGE_ROUTES_ROOT` / `PILGRIMAGE_PLUGINS_ROOT` で先行提供worktreeの実装を読取検証できる。指定した場合は出力のdependencies.integrated=falseを保持する。

## 未完了（先行提供）

- PLUGINS.state/ROUTES.basic/AI.engine・AI.refsの統合commit確認と、同じdevelop上の全機能起動・生成API反映。
- 実共通AIによる生成→採用の成功証拠。ai-probe.tsで提供commit50bd6c0へ接続し、固定gpt-5.6-luna、実SETTINGS送信許可、HTTP受付/状態GETまで確認したが、実行器がUPSTREAM_FAILEDを返した。ai-attempt.jsonへ保存して#7担当へ連絡済み。
- A担当の通常地図がgetPilgrimageOverlayを使って表示・停止を反映する接続確認。
- 独立レビュー、提出commitを保持するmerge、task:finish。先行PR作成だけではIssueを閉じない。
