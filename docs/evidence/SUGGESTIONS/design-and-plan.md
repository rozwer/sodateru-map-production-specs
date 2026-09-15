# SUGGESTIONS 設計・作業計画

対象 #36、base 26a2532、mattsun/36-suggestions。UIは#15。

## 採用判断

Q05調査案を採用する。新時点回答は新ID、訂正は同IDの版更新。未回答のcheckin:nullへ過去回答を補完しない。候補は回答版と条件snapshotを保持する。
timeBudget={kind:exact|atLeast|unspecified,minutes:number|null}。15/30/60はexact、120分以上はatLeast(120)。旧minutesはexact互換、矛盾は422。
companion=solo|friends_family|children|pet|null、effort=easy|moderate|any|null、mode=walking|cycling|driving|transit|any。指定画面の選択肢に対応。
hard違反除外→現在希望一致数→確認適合数→合計時間→placeIdで順位。未知は適合/0分にしない。滞在は本人指定または根拠付き活動値、移動は実経路。atLeastには有限上限適合を断定しない。
期限は対象timezone翌日0時・回答期限・根拠利用期限・要求期限の最小。訂正時は旧batchを保存し、新batchで再評価。
達成は同じ本人/場所のconfirmed訪問だけ。訪問取消/削除/場所変更と達成解除は同一transaction。初回提示/選択時刻は保持。しおりはCOMMUNITY正本、memoは提案固有。

## 実行順

- [ ] domain.test.mjsを先に追加し60分45/75分判定、120以上、未知、順位、期限、遷移を確認。domain.mjs実装。
- [ ] 固有migration/repositoryで回答版履歴・batch・候補・memo/操作状態保存。実SQLite再open、本人分離、再送/競合/訪問取消を検証。
- [ ] CORE登録口・共通再送を使い既存9operationIdの実APIを登録。固有fragmentを#3へ提供。
- [ ] AI/PLACES/ROUTES/INFORMATION/ACTIVITY/SETTINGSへ実接続。未提供を成功0件にしない。
- [ ] 実HTTP→保存→再起動GET証拠と#15 UI受入、PR、独立レビュー、統合、board/lock/Issue終了。

CORE/外部提供の統合commit・公開口は未着。共通処理を複製せず、固有処理とSQLを先行する。
