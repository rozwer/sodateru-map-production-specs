# 契約補完の担当

[Issue一覧](README.md)へ戻る。

現在の67画面に対応するAPI不足20項目を、各機能Issueの契約補完として引き受ける。領域ごとの補完結果を各機能担当が用意し、koshiroが共通OpenAPI/Schema/生成器へ反映する。過去の別セッション3件は作成依頼済みだが起動/結果未確認。待ちの根拠にせず、下表の機能担当が未解消分を引き受ける。

| 担当セッションの領域 | 対象 |
|---|---|
| foundation | 本人・再送・設定・健康・音声：settings / health / health-import / voice、Q01/Q02/Q06 |
| geo | 場所・経路・地図・地域取得：route / object / bookmark / layers / knowledge / consult-history / shared-detail、Q03/Q07/Q10/Q11 |
| features | 振り返り・提案・拡張・相棒：残り9項目、Q05/Q09 |

成果物は各セッションのworktreeの `docs/01_requirements/04_api/resolutions/<領域>.md/.json`。統合時に、採用した決定・入出力/Schema・保存・画面binding・受入を揃える。resolvedという報告だけで、未反映のHTTPを呼べることにはしない。

## 全体と機能固有のゲート

共通の本人context・HTTPエラー/再送/版・登録入口・型の正本をkoshiroが先に揃える。各担当はその契約を使う箇所だけ合意後に実装し、独立したUI構成・外部取得・固有処理の作業を続ける。全20不足の一括解消を全員の着手条件にしない。

各不足は下表の担当Issueと、その契約を実際に使う利用操作へ限定する。例えばrouteの交通/定期券未決はROUTES.conditionsを止めるが、合意済みのROUTES.basicの取得/保存を止めない。layersの保存正本はkaiyaのAPI/SQLiteに確定し、[MAP-CUSTOMの責任](issues/MAP-CUSTOM.md#地図設定の保存責任)を共通AI仕様にも適用する。

## 画面にあるAPI不足

| 不足ID | 内容 | 解消と実装の担当 |
|---|---|---|
| health | 活動数値・取得元 | [HEALTH](issues/HEALTH.md) |
| comparison | 体験/友達比較 | [REFLECTION](issues/REFLECTION.md) |
| question-state | 質問状態・回答 | [REFLECTION](issues/REFLECTION.md) |
| presentation | テーマ/メモのfield | [THEMES](issues/THEMES.md) |
| route | 経路条件・候補・案内 | [ROUTES](issues/ROUTES.md) |
| object | 本人の飾り | [MAP-CUSTOM](issues/MAP-CUSTOM.md) |
| checkin | 今日の構造化条件 | [SUGGESTIONS](issues/SUGGESTIONS.md) |
| bookmark | 投稿/場所/候補のしおり | [COMMUNITY](issues/COMMUNITY.md) |
| follow | 共有テーマ | [COMMUNITY](issues/COMMUNITY.md) |
| export | 削除preview・書出し | [RECORDS](issues/RECORDS.md) |
| voice | 音声・AI送信確認 | [AI](issues/AI.md) |
| layers | 表示設定 | [MAP-CUSTOM](issues/MAP-CUSTOM.md) |
| knowledge | 地域分類と地図範囲 | [COMMUNITY](issues/COMMUNITY.md) |
| consult-history | 一時相談と保存履歴 | [EXPLORATION](issues/EXPLORATION.md) |
| shared-detail | 共有投稿の単体取得 | [COMMUNITY](issues/COMMUNITY.md) |
| plugin-version | 版・競合・アイコン | [PLUGINS](issues/PLUGINS.md) |
| feature-request | 固定名・共感・タグ | [FEATURE-REQUESTS](issues/FEATURE-REQUESTS.md) |
| settings | 本人設定 | [SETTINGS](issues/SETTINGS.md) |
| health-import | 健康取込・許可・停止 | [HEALTH](issues/HEALTH.md) |
| pet | 相棒の取込・制作 | [COMPANION](issues/COMPANION.md) |

voiceの本人設定はSETTINGS、端末操作はUI-EXPLOREが利用する。comparisonの共通保存adapterはINSIGHTS、比較固有の処理はREFLECTION。bookmarkはCOMMUNITYに一つの契約を置き、地図・提案・地域から共用する。

## API資料に残る事項

| ID | 担当 | 閉じる条件 |
|---|---|---|
| Q01 | CORE / SETTINGS / COMMUNITY | 本人の開始・作成/削除・プロフィール公開範囲を一貫させる |
| Q02 | CORE | 通常POST・一括操作の再送保持・並行実行・削除後再送を具体化 |
| Q03 | PLACES | 更新権限・外部更新との優先・入口/営業時間・建物選択 |
| Q05 | INSIGHTS / SUGGESTIONS | 日別集計・同日回答・分母/欠測と候補順位/滞在/期限を計算可能にする |
| Q06 | RECORDS / SETTINGS | 媒体上限とプロフィールアイコンの受付/表示を揃える |
| Q07 | ROUTES | 交通種別・曲がり角・定期券・条件適用の不足を解消 |
| Q09 | PLUGINS / BIKE / DISASTER / PILGRIMAGE | 本人設定・固有Schema・取得元・出典・通常地図への適用 |
| Q10 | TRANSFER / UI-EXPLORE | 別都市へのレシピ・二案・採用の保存と画面操作 |
| Q11 | ACTIVITY / UI-MAP / UI-RECORDS / UI-FRIENDS | 現在の画面仕様と成長・用途・友人地図の契約を接続 |

古いAPI資料の「03_pagesが空」は現在の画面要件数と一致しない。画面仕様が存在することと、成長/交通等の実装規則まで確定していることを分けて更新する。Q04/Q08は既存の解消済み契約を使用する。

## 仕様補完の反映順

1. 各セッションが、元仕様/利用者回答で確定できる事項を具体化し、不可欠な未決定事項だけを残す。
2. **koshiro**がOpenAPI生成器・共通Schema・合成OpenAPI/型へ反映する。機能担当は固有契約断片・DB追加・ページbindingの差分と確認材料を出す。異なる機能で同じfield/operationを重複定義しない。
3. 要件・API不足一覧・未確定事項を更新し、このIssue索引のoperation担当と依存も追随させる。
4. 合意した機能からIssueを登録し、当該機能の契約検査後に実接続へ進む。健康・交通・相棒などの不足が残っていても、無関係なTaskの登録・独立作業は止めない。

健康の対応アプリ、条件付き交通データ、相棒の生成先など、実在接続が必要な部分は設定/取得証拠も必要。仕様の未対応表示だけで、元の利用目的を達成したことにしない。

## #72のスコープ反映

UIの実接続は各CONNECT-*へ移管する。健康health/health-importはHEALTHとUI-HEALTH/CONNECT-HEALTHの余力枠で未実施を保持する。petは既存ペットの取込/表示/管理/選択を対象とし、新規制作/生成はuser-excluded。元API不足の担当と原条件は削除しない。
