# 機能とAPIの対応監査

2026年9月15日、現在の本番仕様のDB17表のJSONと共通基盤3領域・追加DDLの操作を照合した。
エンドポイント数だけでは網羅性を判断しない。
画面仕様は[67画面](../03_pages/README.md)に整備済み。操作との対応・不足は[画面側のAPI不足](../03_pages/api-gaps.json)を参照する。全画面の実動作との対応は未検証。
旧リハーサルのAPIをそのまま本番要件へ加えてはいない。

## 既存の利用操作との対応

「契約あり」はHTTP入出力と保存条件を記述した意味で、実装・受入完了を意味しない。
全操作の認証Q01、POSTの再送基盤Q02は共通の残件。

| 根拠と利用操作 | API／保存先 | 監査結果 |
|---|---|---|
| [場所検索](../02_common/02_places-routes/README.md)：名前・住所・周辺検索 | GET /places、GET /place-candidates | 契約あり。Nominatim/Mapboxとretentionを反映。更新権限・追加属性はQ03 |
| 同：候補の採用 | POST /places | storableだけ採用。同一provider/externalIdの200、creation_receiptsの照合を定義 |
| 同：地図の建物選択 | GET /places?buildingKey、場所詳細 | 建物から未登録施設を特定する導線はQ03/Q11 |
| [情報取得](../02_common/03_information/README.md)：場所詳細 | GET /places/{id}、記録・媒体・共有一覧 | 共通PlaceDetailの領域別失敗へ接続 |
| [訪問](../01_DB/15_visits.json)：候補・確認・訂正・取消 | visits一覧・単体・POST/PATCH/DELETE | 契約あり。本文保持と提案の達成取消を照合 |
| [記録](../01_DB/02_records.json)：文章・日記・メモ・用途・感想・しおり | records一覧・単体・POST/PATCH/DELETE | 契約あり。実効的な場所・日時を明示 |
| [媒体](../01_DB/03_media.json)：添付・表示・順序・削除 | 添付一覧・POST、media取得・削除、reorder | 順序更新を一括操作へ修正。Range配信を反映。アイコンQ06 |
| [位置観測](../01_DB/09_track_points.json)：追加・再送・区間削除 | track-points一覧・単体・一括追加・delete-range | 契約あり。sourcePointId、segmentId、精度、削除対象版を補完 |
| [AI](../02_common/01_ai/README.md)：会話・送信・取消・再試行 | conversations、messages | 共通Schema・request/result/applied_refs追加列・遷移へ接続 |
| 同：街歩きの候補選択・続きの相談 | map-dialoguesとselect/results/cancel | 一時相談を永続consultと分離。起点・候補・retention・期限を保持 |
| 同：体験整理・日記 | MessageSend.use=extract/diary → records更新 | 採用先を分離。共通Input/Resultを変換して保持 |
| 同：傾向説明・体験比較 | MessageSend.use=analysis/comparison → insights | 計算済みinsightIdから説明し結果を保存。POST /insightsは計算対象の入力だけ受け付ける |
| 同：テーマ命名 | MessageSend.use=theme-name → themes編集 | 共通themeのInput/Resultと保存先へ接続 |
| 同：地図カスタマイズ | MessageSend.use=map-style → ブラウザ設定 | 共通mapstyleの4色を含む型へ接続。適用は端末設定 |
| 同：発見 | MessageSend.use=discovery、discovery-cardsとreactions | 共通のanchor・出典・追加DDLへ接続。保存・再取得・反応・削除あり |
| [情報取得](../02_common/03_information/README.md)：日別振り返り | GET /reflection/days/{date} | 日付境界と回答だけの日を含む契約あり |
| [回答](../01_DB/11_self_checkins.json)：保存・訂正・削除 | self-checkins一覧・単体・POST/PATCH/DELETE | localDate、answers、validUntilを補完 |
| [分析](../01_DB/16_insights.json)：集計・評価・根拠更新 | summary、insights取得・PATCH/DELETE、source-checks | 型・参照更新あり。具体的な日別集計規則Q05 |
| [テーマ](../01_DB/13_themes.json)：名前・説明・所属編集 | themes一覧・単体・POST/PATCH/DELETE | 契約あり。description、全所属配列の更新を補完 |
| [提案](../01_DB/12_suggestions.json)：条件から候補作成 | POST /suggestion-batches | 入出力型あり。選択・順位・期限の生成規則Q05 |
| 同：提示・保留・見送り・選択・達成 | suggestions取得・PATCH | 遷移とconfirmed訪問との照合を定義 |
| [経路](../01_DB/06_saved_routes.json)：試算・保存・編集・案内・共有 | route-searches、saved-routes | 型と遷移あり。交通種別・曲がり角Q07 |
| [定期券](../01_DB/10_transit_passes.json)：区間・有効期間 | transit-passes | 型あり。路線・駅検索とID照合・運賃計算はQ07 |
| [情報取得](../02_common/03_information/README.md)：共有検索・同じ結果の地図 | shared-records、shared-records/map | RecordQueryの複数人物・用途・期間重なりに接続。地図は全体2,000件上限 |
| 同：地域の声の読出し・投稿・公開 | places/{id}/voices、recordsの保存・共有変更 | 原文保存と公開結果を分ける。本文の二重保存なし |
| [人物](../01_DB/00_people.json)：本人・友人表示 | me、people | 型あり。人物の作成・削除・公開範囲Q01、アイコンQ06 |
| [友人関係](../01_DB/14_friendships.json)：申請・承認・解除 | friendships | 取得・権限・遷移あり。友人解除後もselected共有は保持 |
| [拡張設定](../01_DB/07_plugin_settings.json)：導入・有効化・管理・削除 | plugins、plugin-settings | 共通操作の型あり。本人領域と固有Schema Q09 |
| [機能要望](../01_DB/08_feature_requests.json)：投稿・編集・公開・削除 | feature-requests | 契約あり。タイトルとvisibilityの2値を補完 |
| [場所検索](../02_common/02_places-routes/README.md)：別の街へ体験を移す | 未定義 | レシピ・比較する二案・選択保存の契約なし（Q10） |
| [情報取得](../02_common/03_information/README.md)：バイク・聖地・防災 | 固有API未定義 | 検索条件、提供元、出典、返却型が必要（Q09） |
| [DB索引](../01_DB/README.md)：成長段階・用途の外観 | GET /map/growth | 本人の材料取得まで。成長の定義・友人地図・画面受入Q11 |

## 前の一覧からの修正

- 85操作を並べただけで「網羅」を検証していなかったため、上記の未定義機能を明示した。
- 版競合から再取得する単体GETが不足していたため、訪問・位置観測・回答・定期券・友人関係へ追加した。
- 根拠のID・版・閲覧可否を再照合する入口を追加した。
- 媒体の一件ずつの順序PATCHを除去し、親記録の版と全媒体の版を照合する一括更新へ変更した。
- POST /insightsの任意の「結果参照」を廃止。計算対象の期間だけを受けてサーバーが保存する操作へ変更し、AI説明はそのinsightIdから開始する。
- 必須項目が抜けていた回答・テーマ・要望・位置観測の入力をDB文書と照合した。
- 正常応答だけでなく、空結果・権限・版競合・取消・期限切れを操作に結び付けた。

共通仕様の追加を受け、発見の保存と反応、街歩きの独立入口、Range配信、共有地図の全件上限も反映した。
最新の型への変換は[共通関数との接続](conventions/05_common-bindings.md)を参照する。
