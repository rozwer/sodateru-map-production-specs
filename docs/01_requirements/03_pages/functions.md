# 各ページでできること

機能要件は、利用者の目的・できること・保存される内容・完了条件で記載する。
画像・操作・APIの詳細は各ページから参照できる。API未定義でも必要な機能は削除しない。

| ページ | 利用者の目的 | 機能 |
|---|---|---|
| [自分を知る](self-home/requirements.md) | 記録から振り返りを始める | 今日の軌跡を見る、自分の傾向を知る、自分の地図を見る |
| [共通メニュー・モード切替](navigation/requirements.md) | 目的の機能へ移動する | 機能を選ぶ、モードを変える、元の作業へ戻る |
| [地図](map/requirements.md) | 場所を探し、保存して訪れる | 場所を探す、場所を調べる、場所を保存する、経路を調べる、表示を変える |
| [みんなを知る](community-home/requirements.md) | 地域や友達の体験を見つける | 地域の知を開く、友達の地図を開く |
| [わたしの地図](personal-map/requirements.md) | 自分の体験を場所とテーマで見返す | テーマで絞る、場所の記憶を見る、テーマを整える |
| [友達の地図](friends-map/requirements.md) | 友達の共有した街の見方を試す | 相手を探す、共有記録を見る、共通点を探す、おすすめを歩く |
| [地域の知](local-knowledge/requirements.md) | 地図上で地域の声を読む | 場所を選ぶ、その場所の声を見る、現在地から探す |
| [Codexと探索](ai-explore/requirements.md) | 希望を話して街の候補を探す | 文章で相談する、音声で入力する、候補を地図で見る、処理を中止・再試行する |
| [体験を残す](record-create/requirements.md) | 体験を写真・動画・言葉で残す | 体験を入力する、場所と日時を付ける、保存前に確認する、記録を保存する |
| [体験を編集](record-edit/requirements.md) | 保存した体験を修正する | 本人の言葉を直す、用途を直す、媒体を整える、変更を保存する |
| [訪問の確認](visit-confirm/requirements.md) | 訪問候補を本人が確かめる | 場所を確かめる、訪問状態を選ぶ、確認を保存する |
| [解釈を訂正](interpretation-correction/requirements.md) | 本人の説明と違う解釈を直す | 推定を確認する、用途を訂正する、理由を訂正する |
| [今日はどう過ごしたい？](self-checkin/requirements.md) | 今の状態と今日の希望を次の行き先へつなぐ | 希望を入力する、条件を選ぶ、候補を探す、回答だけ残す、未回答で使う |
| [提案候補一覧](suggestions/requirements.md) | 今日の条件に合う候補を比べる | 候補を比べる、条件を変える、詳しく見る |
| [提案候補の詳細](suggestion-detail/requirements.md) | 候補の理由を確かめて行き先を選ぶ | 提案理由を読む、現在の情報を確かめる、行き先にする、あとに回す |
| [活動の統計](activity-stats/requirements.md) | 活動の量と内訳を期間ごとに確かめる | 期間を選ぶ、活動を比べる、数値の出所を見る |
| [データの取得元](data-sources/requirements.md) | 数値や訪問情報がどこから来たか確認する | 取得元を確認する、連携を管理する、訪問履歴を読む |
| [今日の軌跡](daily-track/requirements.md) | 一日の移動と体験を時系列で振り返る | 日付を選ぶ、軌跡を読む、記録を開く、追記や振り返りへ進む |
| [タイプ診断](type-diagnosis/requirements.md) | 最近の行動傾向を根拠付きで知る | 期間を切り替える、傾向を見る、根拠を確認する、本人の判断を残す |
| [傾向の根拠](trend-evidence/requirements.md) | 傾向がどの体験から生まれたか確かめる | 根拠を読む、別の説明を確かめる、元記録へ戻る |
| [傾向の確認・訂正](trend-review/requirements.md) | 傾向への本人の判断を残す | 判断を選ぶ、理由を添える、判断を保存する |
| [二つの体験を比較](experience-compare/requirements.md) | 二つの体験の共通点と違いを言葉にする | 体験を並べる、比較を書く、比較を残す |
| [振り返りの質問](reflection-question/requirements.md) | 一問ずつ体験の理由を振り返る | 対象を確認する、答える、後回しにする |
| [振り返りの記録](reflection-history/requirements.md) | 過去の回答と未回答の質問を見返す | 状態で絞る、回答を読む、解釈に反映する |
| [日記](diary/requirements.md) | 一日の記憶を日記としてまとめる | 日を選ぶ、日記を書く、日記を残す |
| [自分のテーマ](themes/requirements.md) | 体験を自分のテーマにまとめる | テーマを読む、テーマを作る、テーマで歩く |
| [テーマを編集](theme-edit/requirements.md) | テーマの内容と見た目を整える | 名前と説明を付ける、見た目を選ぶ、体験をまとめる、変更を残す |
| [メモを編集](memo-edit/requirements.md) | 気付きや次の希望をメモに残す | 内容を編集する、由来を残す、提案への利用を選ぶ、整理する |
| [もやの探索候補](mist-detail/requirements.md) | 未形成の探索候補を確かめて向かう | 候補を調べる、後で見返す、向かい方を選ぶ |
| [探索コンパス](quest-compass/requirements.md) | 探索対象の方角と直線距離を知る | 方角を見る、測位を確かめる、移動を切り替える |
| [体験で地図が育った](growth-result/requirements.md) | 体験が地図へ反映された結果を見る | 成長を見る、根拠を見返す、次へ進む |
| [地域の知を探す](knowledge-list/requirements.md) | 地域の体験や知恵を探す | 声を検索する、条件を絞る、投稿を読む、地図で見返す |
| [地域の知の絞り込み](knowledge-filter/requirements.md) | 地域の声を探す範囲と条件を決める | 範囲を選ぶ、内容を絞る、条件を適用する |
| [地域投稿の詳細](knowledge-detail/requirements.md) | 一つの地域投稿を詳しく読む | 体験を読む、動画を見る、関連情報へ進む |
| [共有範囲の確認](sharing/requirements.md) | 見せる内容と相手を決めて共有する | 内容を確認する、範囲を選ぶ、相手を選ぶ、共有を確定する |
| [共有する友達](friend-picker/requirements.md) | 共有したい友達を選ぶ | 友達を探す、相手を確認する、選択を返す |
| [記録を削除](record-delete/requirements.md) | 影響を確かめて記録を削除する | 消える範囲を確認する、控えを残す、削除を確定する |
| [友達のプロフィール](friend-profile/requirements.md) | 相手の共有した体験を知る | プロフィールを見る、友達関係を管理する、街の見方を試す、自分の記録を渡す |
| [友達との共通点](friend-compare/requirements.md) | 自分と友達の場所の使い方を比べる | 意味を比べる、根拠を確かめる、地図を重ねる |
| [友達のおすすめルート](shared-route/requirements.md) | 友達のルートを確かめて自分でも使う | 行程を読む、時間を確認する、自分用に調べる |
| [経路の条件](route-conditions/requirements.md) | 目的地までの移動条件を決める | 場所と順番を決める、条件を決める、経路を検索する |
| [経路の候補](route-results/requirements.md) | 移動時間と条件から経路を選ぶ | 候補を比べる、条件を確かめる、選び直す、案内を始める |
| [徒歩ナビゲーション](route-navigation/requirements.md) | 採用した経路に沿って移動する | 進む方向を知る、残りを確認する、全体を見返す、案内を終える |
| [地図の表示設定](map-layers/requirements.md) | 地図に重ねる情報を選ぶ | 表示を切り替える、地図で確認する、表示を戻す |
| [地図オブジェクトを編集](object-edit/requirements.md) | 地図上の表現を自分で整える | 内容を変える、見た目を変える、配置を変える、確定する |
| [地図に配置](object-place/requirements.md) | オブジェクトを置く位置を選ぶ | 場所を動かす、周囲を見る、位置を返す |
| [音声で相談](voice-consultation/requirements.md) | 声を確認可能な相談文にする | 録音する、文章に直す、送る内容を決める |
| [相談履歴](conversation-history/requirements.md) | 過去の相談を読み直す | 相談を探す、会話を開く、新しく始める |
| [AIへ送る内容の確認](ai-consent/requirements.md) | AIに渡す内容を本人が確認する | 送信内容を見る、対象を変える、利用を決める |
| [拡張機能を探す](plugin-store/requirements.md) | 使いたい拡張機能を探す | 機能を探す、詳細を確認する、導入済みを管理する、開発へ参加する |
| [拡張機能の詳細](plugin-detail/requirements.md) | 拡張機能の内容を確かめる | 機能を読む、試用へ進む |
| [拡張機能を試す](plugin-trial/requirements.md) | 導入前に地図の変化を試す | 条件を選ぶ、模擬表示を見る、導入へ進む |
| [導入前の確認](plugin-install/requirements.md) | 追加される情報を確認して導入する | 変更を確認する、導入する、見送る |
| [導入済みの機能](plugin-manage/requirements.md) | 導入した機能を使い分ける | 有効化を切り替える、使う条件を整える、地図で使う、更新や管理へ進む |
| [機能の更新](plugin-update/requirements.md) | 拡張機能の版を選ぶ | 変更点を読む、先に試す、更新する、元へ戻す・削除する |
| [変更が重なる場合](plugin-conflict/requirements.md) | 表示の競合を見て併用方法を選ぶ | 影響を確認する、併用を選ぶ、片方を止める |
| [みんなの欲しい機能](feature-requests/requirements.md) | 欲しい機能を共有し開発につなげる | 投稿を読む、共感を残す、要望を書く、実現へ進む |
| [お願いを書く](feature-request-edit/requirements.md) | 欲しい機能を自分の言葉で残す | お願いを書く、公開範囲を選ぶ、保存する |
| [設定](settings/requirements.md) | アプリの利用方法とデータを管理する | 設定を開く、現在値を知る |
| [プロフィールと表示](profile-settings/requirements.md) | プロフィールと読みやすさを整える | 自己紹介を変える、表示を変える、通知を選ぶ、保存する |
| [提案とまとめの条件](suggestion-settings/requirements.md) | 提案とまとめの使い方を決める | 提案のタイミングを選ぶ、集計期間を決める、停止対象を管理する |
| [健康データの連携](health-connect/requirements.md) | 健康データの取り込み方法を選ぶ | 接続状況を見る、アプリ経由でつなぐ、ファイルを持ち込む |
| [健康データの項目と期間](health-permissions/requirements.md) | 使う健康情報の範囲を決める | 項目を選ぶ、期間を選ぶ、用途を選ぶ、開始を決める |
| [健康データの連携状態](health-status/requirements.md) | 健康データの連携状況と保存分を管理する | 取得状況を見る、取り込みを止める、保存分を消す |
| [相棒の管理](companion-settings/requirements.md) | 地図で一緒に表示する相棒を選ぶ | 相棒を選ぶ、表示を整える、追加へ進む、選択を残す |
| [相棒をファイルから追加](companion-import/requirements.md) | 作成済みの相棒を持ち込む | ファイルを選ぶ、動きを見る、登録する |
| [相棒の制作](companion-create/requirements.md) | 希望に合う相棒を制作する | 希望を書く、作り方を選ぶ、候補を確認する、後で再開する |

未確定事項と回答は [質問一覧](questions.json) に保持する。
元仕様で解決できる項目は元仕様を採用し、APIの不足は実装契約の追加事項として扱う。
