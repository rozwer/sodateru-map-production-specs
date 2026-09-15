# DTOとDBの対応

[models.md](models.md)は保存結果と入力用DTOを分けている。
保存結果DTOをそのままPOST/PATCHの入力として受け付けない。

## 共通変換

| DB | HTTP |
|---|---|
| snake_case | camelCase |
| *_json | 接尾辞を除いた配列・オブジェクト。文字列化しない |
| INTEGERの0/1 | false/true |
| NULL | null。任意キーの省略と区別 |
| timezone | timeZone |
| people.avatar_path | avatarUrl。APIでは内部パスを公開しない。アップロード・変換方針はQ06 |
| media.storage_key | 返さない。contentUrlとして `/api/v1/media/{id}/content` を組み立てる |

入力のidは作成前に固定する。
personId、作成・更新日時、versionはサーバーが設定するため、作成・編集DTOに含めない。
plugin_settings.idだけはコードのプラグイン定義IDを使う。

## 保存対象ごとの制約

| DTO | 保存先 | 受け渡し時の条件 |
|---|---|---|
| Person | people | 本人のプロフィールだけを更新。人物作成・削除・公開範囲はQ01 |
| Place | places | provider+externalIdで重複照合。手動と外部候補の作成入力を分岐 |
| Visit | visits | 保存時はcandidate。確認・否定は別の明示更新 |
| Record | records | 原文・本人採用項目を保存。訪問ありなら場所・日時の直接列をnullにする |
| RecordView | records + visits | effectivePlaceId/effectiveStartedAt/effectiveEndedAt/effectiveTimePrecisionは表示用。保存列へ複製しない |
| Media | media | storageKeyを隠す。ファイル保存完了をreadyで表す |
| Conversation | conversations | purposeは4値。実行用途useと混同しない |
| Message | messages | userはcomplete/model=null。assistantのstatus/attempt/modelはサーバー管理 |
| SavedRoute | saved_routes | 共通SavedRouteの地点・区間・geometry形式。保存JSONへ相互変換し区間geometryも保持 |
| PluginSetting | plugin_settings | settingsは定義固有のSchemaで追加検証。本人領域はQ09 |
| FeatureRequest | feature_requests | title/body/visibilityを明示。visibilityはprivate/publicのみ |
| TrackPoint | track_points | sourcePointIdで再送を照合。segmentId内を時系列で描画 |
| TransitPass | transit_passes | 交通データの路線・駅IDと照合。終了日を含む |
| SelfCheckin | self_checkins | localDate、answersの全項目、validUntilを明示 |
| Suggestion | suggestions | 本人は状態・反応を更新。候補理由・根拠は生成処理が保存 |
| Theme | themes | descriptionも必須。本人のrecordIds配列を一括保存 |
| Friendship | friendships | requesterIdは本人、statusは操作から決める |
| Insight | insights | analysisとcomparisonでresultを分岐。生成完了時に保存。本人は判断だけ更新 |

RecordViewの実効値はvisitIdがあれば訪問から、なければ記録から読む。
記録の開始・終了時刻は終了≧開始、unknownでは両方null。
Insight.kind=analysisならresultはAnalysisResult、rangeStart/rangeEndは非nullでrangeStart<rangeEnd。
comparisonならresultはComparisonResult、期間を指定するときは開始・終端を揃える。
分子≦分母、valueは分子÷分母、分母0ならnull。
これらの相互条件・参照整合はSchema単体に加えて操作の意味を検査する。

## 保存されない／保存先が足りない結果

CandidateResultとRouteSearchResultは本人・dataModeに束縛した期限付きの一時結果。retention=temporaryは保存不可。
場所・保存ルートへの採用時だけ本保存する。
メモリだけで保持する案では、プロセス再起動後に410 RESULT_EXPIREDを返して再検索する。

AIOutput.valueは共通AIの用途別Resultを保持する。
RunとMessageの再取得ではmessagesの追加列request_json/result_json/applied_refs_jsonを使う。
比較・分析はinsightIdで保存結果へつなぐ。
カードの説明と原文への採用は別の操作。

発見カードと反応は共通仕様のdiscovery_cards/discovery_reactionsへ保存する。
別都市計画の保存はQ10が残る。

## 共通Schemaとの対応

CommonAI / CommonMap / CommonInfoは共通基盤のschemas.jsonから取り込む。
API独自の編集用RecordViewは元のrecordsと実効値を含む。
共有表示のCommonInfoRecordViewはperson・place・mediaをまとめた表示用投影であり、編集入力として送り返さない。
保存可能な記録のbody/purposes/impression/topicKeyは、共有側で再表示できる同じ上限に合わせる。

本書のDB対応と共通追加DDLの両方を適用する。
反応行にはversion列がないため、反応は固定IDで追加して履歴を読む操作とし、編集PATCHは提供しない。
