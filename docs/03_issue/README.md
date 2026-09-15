# Issue分割と4人の担当

**Aが全UIを設計・実装し、B〜Dが機能ごとのAPI・業務処理・保存・再取得を担当する。** UI実装はAに固定する。B〜Dは、それぞれの機能に必要なSQL・外部接続・固有のAI処理も持つ。

36件を **A：13件、B：8件、C：7件、D：8件** に割り当てた。担当はA＝rozwer、B＝koshiro、C＝kaiya、D＝mattsunで確定。

[着手順・依存・待ちへの対応](execution.md) · [先行提供と接続責任](delivery.md) · [画面/API対応](coverage.md) · [契約補完](contract-gates.md) · [機械可読の一覧](index.json)

## 分担と初手

| 担当 | 責任範囲 | 最初のIssue | 次の候補2件 |
|---|---|---|---|
| A（rozwer）：全UI | 全67画面、共通部品、文言、画面状態、API呼出し、Mapbox/Three.js描画、チャット/音声の端末操作、実画面受入 | [UI-BASE](issues/UI-BASE.md) | [UI-MAP](issues/UI-MAP.md)、[UI-RECORDS](issues/UI-RECORDS.md) |
| B（koshiro）：起動・記録・共有・設定 | 起動・共通HTTP/DB、記録/媒体、訪問/軌跡/成長、共有検索、友達/地域、設定/健康、機能要望 | [CORE](issues/CORE.md) | [INFORMATION](issues/INFORMATION.md)、[RECORDS](issues/RECORDS.md) |
| C（kaiya）：場所・経路・地図拡張 | 場所検索/採用、道路経路/案内、地図設定/装飾の処理、拡張管理、バイク/防災/聖地の固有処理 | [PLACES](issues/PLACES.md) | [ROUTES](issues/ROUTES.md)、[PLUGINS](issues/PLUGINS.md) |
| D（mattsun）：AI・探索・振り返り・提案 | 共通AI、街歩き相談/発見、集計/振り返り/比較、テーマ/提案、体験移転、相棒の取込/生成 | [AI](issues/AI.md) | [INSIGHTS](issues/INSIGHTS.md)、[COMPANION](issues/COMPANION.md) |

AのMapbox担当は描画・カメラ・選択・レイヤーの操作。Cはサーバー側の場所/道路検索と表示材料を担当する。Dは共通AIを提供し、Cの地図設定や拡張機能などは利用側が固有プロンプトと結果の採用を担当する。

koshiroのCOREは起動・登録入口と型付き共通クライアントを先に提供し、共通Schema/API生成器の反映担当も持つ。以後、全機能のAPI/DBをBへ集めず、C・Dも機能内のAPI/SQL/migrationを実装する。オーケストレーターは4人の実装担当に加算せず、調整・現状把握を行う。

## 担当Issue

### A（rozwer）：全UI

| Issue | 完成させる操作 |
|---|---|
| [UI-BASE](issues/UI-BASE.md) | 共通UI・ナビゲーションと画面復帰 |
| [UI-MAP](issues/UI-MAP.md) | 場所検索・自分の地図・表示と装飾の編集 |
| [UI-RECORDS](issues/UI-RECORDS.md) | 体験記録・訪問確認・訂正と地図の成長 |
| [UI-ROUTES](issues/UI-ROUTES.md) | 経路条件・候補比較・徒歩案内 |
| [UI-EXPLORE](issues/UI-EXPLORE.md) | 街歩き相談・履歴・音声と探索候補 |
| [UI-REFLECTION](issues/UI-REFLECTION.md) | 日記・振り返り回答・体験比較とメモ |
| [UI-INSIGHTS](issues/UI-INSIGHTS.md) | 傾向・根拠の訂正とテーマ管理 |
| [UI-SUGGESTIONS](issues/UI-SUGGESTIONS.md) | 今日の希望から候補選択・行き先へ |
| [UI-FRIENDS](issues/UI-FRIENDS.md) | 友達との共有・地図・比較とおすすめルート |
| [UI-KNOWLEDGE](issues/UI-KNOWLEDGE.md) | 地域の知の検索・絞込・詳細と投稿 |
| [UI-PLUGINS](issues/UI-PLUGINS.md) | 拡張機能の試用・導入・更新と機能要望 |
| [UI-SETTINGS](issues/UI-SETTINGS.md) | 設定・健康取込・取得元と活動統計 |
| [UI-COMPANION](issues/UI-COMPANION.md) | 相棒の取込・制作・動作確認と選択 |

### B（koshiro）：起動・記録・共有・設定

| Issue | 完成させる操作 |
|---|---|
| [CORE](issues/CORE.md) | 起動・本人領域・HTTPとSQLiteの共通基盤 |
| [INFORMATION](issues/INFORMATION.md) | 記録・共有検索と根拠の共通取得 |
| [RECORDS](issues/RECORDS.md) | 体験・媒体の保存編集・共有変更と削除 |
| [ACTIVITY](issues/ACTIVITY.md) | 訪問確認・位置観測・日別軌跡と成長 |
| [SETTINGS](issues/SETTINGS.md) | プロフィール・利用設定・本人データ管理 |
| [COMMUNITY](issues/COMMUNITY.md) | 友達関係・地域の声としおり |
| [HEALTH](issues/HEALTH.md) | 健康データの取込・期間許可・停止と集計 |
| [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) | 機能要望の投稿・共感・公開と編集 |

### C（kaiya）：場所・経路・地図拡張

| Issue | 完成させる操作 |
|---|---|
| [PLACES](issues/PLACES.md) | 場所検索・候補採用・場所詳細 |
| [ROUTES](issues/ROUTES.md) | 経路計算・条件比較・保存と案内状態 |
| [PLUGINS](issues/PLUGINS.md) | 拡張機能のカタログ・試用・導入と版管理 |
| [MAP-CUSTOM](issues/MAP-CUSTOM.md) | 手動装飾・レイヤー設定とAI地図設定 |
| [BIKE](issues/BIKE.md) | バイク向け地点・車種条件とルート |
| [DISASTER](issues/DISASTER.md) | 防災情報の取得・根拠と地図表示 |
| [PILGRIMAGE](issues/PILGRIMAGE.md) | 作品と地点の対応・聖地巡りの計画 |

### D（mattsun）：AI・探索・振り返り・提案

| Issue | 完成させる操作 |
|---|---|
| [AI](issues/AI.md) | 共通AI実行・会話保存・取消と再試行 |
| [INSIGHTS](issues/INSIGHTS.md) | 期間集計・傾向説明・根拠と本人の判断 |
| [REFLECTION](issues/REFLECTION.md) | 体験整理・日記・振り返り質問と比較 |
| [THEMES](issues/THEMES.md) | テーマと由来付きメモの保存・編集 |
| [EXPLORATION](issues/EXPLORATION.md) | 街歩きの相談ループ・候補採用・発見 |
| [SUGGESTIONS](issues/SUGGESTIONS.md) | 今日の希望・候補生成・選択と達成 |
| [TRANSFER](issues/TRANSFER.md) | 別の街へ体験を移す二案比較と採用 |
| [COMPANION](issues/COMPANION.md) | 相棒のZIP取込・制作・保存と選択 |

## 作業量の扱い

Issue数を工数としては扱わない。Aは画面数が多く、Cは外部データ、DはAI/分析の不確定要素が多い。各担当内の独立セッションごとに「実行中1件＋次候補2件」を更新し、残る非UI機能はB〜D間で移管する。

画面の詳細/編集/確認や同じ保存のCRUDは一つにまとめ、独立した利用目的・保存結果・取得元を持つ機能は分けた。大きめのUI-EXPLORE、UI-PLUGINS、ROUTES、REFLECTION、COMPANIONは、途中の提供物を明記して先行統合する。受入を減らしてサイズ調整しない。

## 対応と登録状態

67画面の317要件（利用者向け機能225件を含む）、既存API104操作、API不足20項目を対応付けている。体験移転と3種の拡張機能も含む。ここにあるのは仕様とIssue定義。登録・着手・実接続・受入の状態はIssue/boardで別々に確認する。

本番remoteは [rozwer/sodateru-map-production-specs](https://github.com/rozwer/sodateru-map-production-specs)。担当者との対応は確定済み。developは整備済み。全36件をGitHub #3〜#38へ登録済み。未解決事項はコメントに残し、登録済みTaskと担当/取得pathを対応させてboardへ導入する。固有契約の不足で他機能の登録を止めない。`index.json` は検討用索引であり、実行用 `TASK_GRAPH.json` ではない。[初期導入手順](../../.agents/skills/sodateru-task/references/board-bootstrap.md)。

検査：`mise exec -- node docs/03_issue/verify.mjs`。要件/操作の担当、4人のキュー、UI担当の固定、依存の循環、初手のpath競合を確認する。所要時間や常時稼働の実績を証明する検査ではない。
