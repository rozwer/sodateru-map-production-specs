# INSIGHTS #34 提供状態
2026-09-15。Issue全体は未完了。

## 確認済みの独立部分
- canonical入力キー: 同じ条件/SourceRef集合は順序によらず同じSHA-256。本人/左右の順序/根拠版変更は別キー。重複参照を統合し、同一参照の版競合を拒否。
- insights repository: Node SQLite実ファイルへ本人原文・評価/理由を保存、DBを閉じ再接続して再取得。別本人は非開示、古い版で更新/削除しない。削除時messages.insight_idを解除。
- 暦日と計算の純粋関数: IANA timezone/半開区間/DST、確定日入力の分子・分母・unknown計算。3日でyes/no/unknownなら1/2、全不明ならnull。**記録から5軸日判定を推定する処理は未実装**。
- 上記はNode test計6件成功。TypeScript 5.9.2で対象6ファイルのnoEmit検査成功。
- fragment `insights-evidence-1`: 理由200文字、createdAt用from/toを保ち対象rangeStart/rangeEnd/timeZone完全一致filter追加。合成OpenAPIはCORE担当。

## 保存adapter（作業中）
`createInsightsService(db,{checkSources})`、同期のget/list/review/remove/saveComparison/saveAnalysis。
SOURCE_CHANGED/NOT_FOUNDは共通根拠照合を使用し、同期SAVEPOINTは呼出元AI transactionへ追随。
現時点はCORE CommonError/context未統合のためserviceテスト実行・HTTP登録・INFORMATION実接続未完了。上記独立部分の成功をadapter提供済みとは扱わない。

## 未達受入
- Q05の画像5軸判定入力・日別統合定義は担当/ユーザー意図確認中。詳細はq05-evidence.md。新しい日別確認入力を未承認で追加しない。
- CORE起動/HTTP/再送/版変換、INFORMATION ownMaterials/checkSources接続、期間Summary/POST insights。
- analysis用途の共通AI登録、実モデル説明、構造化根拠・反例・本人文の表示DTO。
- UI #13/#17接続、独立レビュー、PR/develop統合、task:finish。
