# UI完了と実接続の担当

A（rozwer）が全UIと画面からの実接続を担当し、B〜DのAPI・業務処理・保存責任は維持する。
51件は元36件、機能別CONNECT 13件、健康の主要UI後未実施UI/接続2件。inlineの調整・組込みTaskはboardで別管理する。

[実行と完了](execution.md) · [提供と接続](delivery.md) · [接続handoff](connect-start.md) · [全要件/API対応](coverage.md) · [契約補完](contract-gates.md) · [index](index.json) · [原IDの両面対応](ui-connections.json)

## AのUIと実接続

UIは指定画像・実Mapbox・画面/端末操作・状態・実shell組込みを満たして通常finishする。後続CONNECTは対象画面操作・既存API契約・統合証拠の[handoff](connect-start.md)が揃ったunitのpathを取得し、実API・保存・再取得・失敗/取消を確認する。UI単体closeを利用者向け機能完成とは呼ばない。

| 元UI | 実接続 | source要件/受入 |
|---|---|---|
| [UI-BASE](issues/UI-BASE.md) #4 | [CONNECT-BASE](issues/CONNECT-BASE.md) #137 | 5 / 5 |
| [UI-MAP](issues/UI-MAP.md) #8 | [CONNECT-MAP](issues/CONNECT-MAP.md) #134 | 28 / 28 |
| [UI-RECORDS](issues/UI-RECORDS.md) #11 | [CONNECT-RECORDS](issues/CONNECT-RECORDS.md) #135 | 38 / 38 |
| [UI-EXPLORE](issues/UI-EXPLORE.md) #10 | [CONNECT-EXPLORE](issues/CONNECT-EXPLORE.md) #136 | 26 / 26 |
| [UI-ROUTES](issues/UI-ROUTES.md) #9 | [CONNECT-ROUTES](issues/CONNECT-ROUTES.md) #138 | 14 / 14 |
| [UI-REFLECTION](issues/UI-REFLECTION.md) #12 | [CONNECT-REFLECTION](issues/CONNECT-REFLECTION.md) #139 | 28 / 28 |
| [UI-INSIGHTS](issues/UI-INSIGHTS.md) #13 | [CONNECT-INSIGHTS](issues/CONNECT-INSIGHTS.md) #140 | 23 / 23 |
| [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) #15 | [CONNECT-SUGGESTIONS](issues/CONNECT-SUGGESTIONS.md) #141 | 17 / 17 |
| [UI-FRIENDS](issues/UI-FRIENDS.md) #14 | [CONNECT-FRIENDS](issues/CONNECT-FRIENDS.md) #142 | 32 / 32 |
| [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) #16 | [CONNECT-KNOWLEDGE](issues/CONNECT-KNOWLEDGE.md) #143 | 17 / 17 |
| [UI-PLUGINS](issues/UI-PLUGINS.md) #18 | [CONNECT-PLUGINS](issues/CONNECT-PLUGINS.md) #144 | 41 / 41 |
| [UI-SETTINGS](issues/UI-SETTINGS.md) #17 | [CONNECT-SETTINGS](issues/CONNECT-SETTINGS.md) #145 | 34 / 34 |
| [UI-COMPANION](issues/UI-COMPANION.md) #19 | [CONNECT-COMPANION](issues/CONNECT-COMPANION.md) #147 | 14 / 14 |

健康3画面/入口と健康の統計・取得元面は[UI-HEALTH](issues/UI-HEALTH.md) #146 → [CONNECT-HEALTH](issues/CONNECT-HEALTH.md) #148で主要UIの後に着手する。非健康の設定・記録/訪問/軌跡統計は必須に残す。
新規相棒制作は入口/画面ごとuser-excluded。原5要件/5受入と制作部分の原文は保持し、実装済みとしない。既存ペットの取込・表示・管理・選択は対象。

## B〜Dの提供責任

### koshiro

- [CORE](issues/CORE.md)：起動・本人領域・HTTPとSQLiteの共通基盤。
- [INFORMATION](issues/INFORMATION.md)：記録・共有検索と根拠の共通取得。
- [RECORDS](issues/RECORDS.md)：体験・媒体の保存編集・共有変更と削除。
- [ACTIVITY](issues/ACTIVITY.md)：訪問確認・位置観測・日別軌跡と成長。
- [COMMUNITY](issues/COMMUNITY.md)：友達関係・地域の声としおり。
- [HEALTH](issues/HEALTH.md)：健康データの取込・期間許可・停止と集計。
- [SETTINGS](issues/SETTINGS.md)：プロフィール・利用設定・本人データ管理。
- [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md)：機能要望の投稿・共感・公開と編集。

### kaiya

- [PLACES](issues/PLACES.md)：場所検索・候補採用・場所詳細。
- [ROUTES](issues/ROUTES.md)：経路計算・条件比較・保存と案内状態。
- [MAP-CUSTOM](issues/MAP-CUSTOM.md)：手動装飾・レイヤー設定とAI地図設定。
- [PLUGINS](issues/PLUGINS.md)：拡張機能のカタログ・試用・導入と版管理。
- [BIKE](issues/BIKE.md)：バイク向け地点・車種条件とルート。
- [DISASTER](issues/DISASTER.md)：防災情報の取得・根拠と地図表示。
- [PILGRIMAGE](issues/PILGRIMAGE.md)：作品と地点の対応・聖地巡りの計画。

### mattsun

- [EXPLORATION](issues/EXPLORATION.md)：街歩きの相談ループ・候補採用・発見。
- [TRANSFER](issues/TRANSFER.md)：別の街へ体験を移す二案比較と採用。
- [AI](issues/AI.md)：共通AI実行・会話保存・取消と再試行。
- [REFLECTION](issues/REFLECTION.md)：体験整理・日記・振り返り質問と比較。
- [INSIGHTS](issues/INSIGHTS.md)：期間集計・傾向説明・根拠と本人の判断。
- [THEMES](issues/THEMES.md)：テーマと由来付きメモの保存・編集。
- [SUGGESTIONS](issues/SUGGESTIONS.md)：今日の希望・候補生成・選択と達成。
- [COMPANION](issues/COMPANION.md)：相棒のZIP取込・制作・保存と選択。

## 対応と検査

67ページ・317要件/317受入（機能225）、当初割当104操作＋統合済CORE session 4操作＝現在108操作、API不足20項目を明示対応する。追加4操作はcoverage.additional_operationsにCORE所有で記録し、COREの既存active定義/pathsを変更しない。

`mise exec -- node docs/03_issue/verify.mjs` と `mise exec -- python3 -m unittest discover -s tools -p test_sync_graph.py` は定義/移行検査。製品のUI/実接続合格を証明するものではない。

## #301の修正Issue専用Task

#300 UI-BASE-LAYOUT、#297 UI-MAP-CARD、#298 UI-MAP-RECORD-LINK、#299 UI-MAP-THEME-RETRYは各Issueと1対1の専用実装Task。親#4/#8は元の完成条件と各修正証拠を参照する。取得path・受入・順序は[実行と完了](execution.md#修正issueと親の完成条件)を参照する。
