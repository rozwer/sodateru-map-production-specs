# AIの保存と画面連携

会話を閉じて戻ったとき、同じ発言・結果・採用先を再表示するための保存を定める。
基礎の列は [messages](../../01_DB/05_messages.json)、会話は [conversations](../../01_DB/04_conversations.json)を使う。

## 保存項目の追加

本番のmessages定義へ次の列を加える。
これにより、再試行の材料と構造化した結果を同じ発言から復元する。

| 列 | 保存型 | 内容 |
|---|---|---|
| task | TEXT、userはNULL | 用途名。assistantでは必須 |
| request_hash | TEXT、userはNULL | 正規化した受付入力のSHA-256 |
| request_json | TEXT、userはNULL | task、input、text、sourceRefs、model、promptVersion |
| result_json | TEXT、未完了はNULL | schemas.jsonの用途別結果 |
| applied_refs_json | TEXT、既定[] | 採用先の種類・ID・保存版・採用内容のハッシュ |

request_jsonは対象IDと版、本人が送ったtext・answersを保存する。
原文の全文コピーは記録の正本から読む。
共有された原文のコピーを再試行用に残さない。

assistantのpending/runningに対し、conversation_idの部分一意索引を作る。
同じ会話に実行中の応答がある間はBUSYとする。
userMessageIdの対応はrequest_jsonへ追加して保存する。

## 受付トランザクション

1. 本人が会話を所有するか確認する。
2. assistantMessageIdが存在すればrequest_hashを比較し、同じ要求なら保存済みRunを返す。
3. userMessageIdが別の要求で使われていればREQUEST_CONFLICT。
4. 会話内の最大positionを読み、本人発言と応答に次の二番号を割り当てる。
5. 本人発言をcomplete、応答をpending・attempt=1・version=1で保存する。
6. 会話のupdated_atとversionを更新し、コミットする。
7. 応答IDを実行待ちへ渡す。

書込みはBEGIN IMMEDIATEからCOMMITまでで行う。
外部AIの待機はこのトランザクションの外側に置く。

## 状態遷移

| 現在 | 操作 | 次 | 条件 |
|---|---|---|---|
| pending | 実行開始 | running | id・attempt・現在version一致 |
| pending / running | 取消 | cancelled | expectedVersion・expectedAttempt一致 |
| running | 検査成功 | complete | id・attempt・running一致、根拠と権限が現在も有効 |
| running | 実行失敗 | failed | 同じ試行がrunning |
| failed / cancelled | 再試行 | pending | expectedVersion・expectedAttempt一致。attemptを1増やす |
| complete | 取消・再試行 | 409 | 新しい依頼は別発言として作る |

各変更でversionを1増やし、updated_atを更新する。
取消はDBをcancelledへ変更してからAbortControllerを止める。
古い試行が完了しても、id・attempt・runningの条件に一致しなければ書込件数0で終える。

サーバー起動時はpending/runningをfailedへ変え、error_code=INTERRUPTEDを保存する。
利用者が再試行したものだけ再開する。
起動時の整理とAPI受付開始の順序を固定する。

## 再試行と入力更新

再試行はrequest_jsonのtext・input・model・promptVersionを使う。
sourceRefsを読み直し、版が変わっていればSOURCE_CHANGEDとして受付を止める。
画面は「内容を読み直して相談」を表示し、新しいIDで送信する。
本人が入力を訂正した場合も新しい発言にする。

取消のHTTP応答が失われた場合はRunを取得し、cancelledなら取消完了として扱う。
再試行の応答が失われた場合は、attemptが増えたことを取得で確認し、その試行を監視する。
同じ取消・再試行を繰り返して版が違う場合は409を返し、画面は現在状態を読み直す。

## 結果と表示文の保存

| task | messages.body | 結果の保存・採用 |
|---|---|---|
| extract | purposeとreasonを改行して表示。不明は「用途は未確認」「理由は未確認」 | result_jsonを記録編集へ返し、本人が採用した用途・感想をrecordsへ |
| diary | result.text | 日記編集欄へ。保存操作でrecords.kind=diary |
| consult | result.summary | 候補と理由を表示。場所選択後に案内へ |
| compare | mappingsの説明を改行。0件なら「比較できる根拠がありません」 | result_jsonとinsightsを保存 |
| analysis | result.summary | 計算済みaxesとともにinsightsへ |
| theme | name、改行、description | テーマ編集へ。保存操作でthemesへ |
| mapstyle | explanation | proposalを一時プレビューへ。本人の採用操作でMAP-CUSTOMのAPIから本人・dataMode別のSQLite地図設定へ |
| discover | bridge、knowledge、observationPromptを改行 | 発見カードへ。保存操作は[根拠と更新](../03_information/03_evidence.md) |

比較のinsights.result_jsonはcommon・differences・unknown。
same-place-same-purposeとdifferent-place-same-roleの説明はcommon、残りの関係の説明はdifferencesへ入れる。
mappingsが0件ならunknownに「比較できる根拠が不足しています」を入れる。
詳細な対応はmessages.result_jsonに保持する。

analysisは元の計算済みaxesをコピーし、AIの説明とunknownsを添える。
input_keyは本人・task・全SourceRef・期間・model・promptVersion・正規化入力のハッシュ。
既存の同じinput_keyがあればそのinsightIdを再利用し、reviewを保つ。
新しい結果保存とmessages.insight_idの設定は一つのトランザクションで行う。

## 画面への反映

送信中は入力原文を保持し、受付済みになったら本人の発言を表示する。
pending/runningは800ミリ秒間隔でRunを取得する。
complete/failed/cancelledで監視を止める。
通信失敗は入力と直前のRunを保ち、「状態を確認」から再取得する。

画面ごとに会話IDと要求番号を持つ。
別の会話、本人、モードへ移ったら監視を止め、古い応答を反映しない。
再表示はDBの発言をposition順に読み、応答IDからカードを復元する。
下書きは本人・モード・会話IDをキーにブラウザで保持する。

記録や設定を編集中にAI結果が届いたら、編集値とは別の提案欄へ出す。
採用時は対象ID・読み出した版・採用した項目を対象機能の保存処理へ渡す。
保存成功後だけapplied_refs_jsonへ採用先を追記する。
同じ採用先と同じ内容のハッシュを二度適用する場合は、既に保存した結果を表示する。
対象の版が違えば編集内容を保ち、再確認する。

## 保存の境界

会話削除はconversationsとmessagesへ適用する。
保存した日記・テーマ・分析はその保存先に残る。
共有取消・根拠削除は、表示時と採用時のsourceRefs照合で扱う。
非公開になった原文を引用するbodyとresultは取得結果から外し、NOT_FOUNDとして表示を解除する。

request_jsonにはuserMessageId、task、input、text、sourceRefs、model、promptVersionを保存する。Run.createdAt/updatedAtは発言行、Run.promptVersionはrequest_jsonから復元する。applied_refs_jsonの要素は{type,id,version,contentHash}で、typeはrecord/theme/insight/discovery/map-settings、contentHashは採用した値のcanonical JSONのSHA-256。map-settingsのidは本人・dataModeで一意に解決するサーバー側の設定IDとする。

生成結果と採用先が同じDBなら、対象の更新とapplied_refs_json追記を同じトランザクションで行う。mapstyleの採用も同じSQLiteで行い、MAP-CUSTOMのAPIが設定更新と採用先/版/内容ハッシュの追記をまとめる。応答喪失時はAPI再取得で採用済みを判定する。端末保存を別の正本にしない。

地図設定の保存・採用・実効表示はkaiya（MAP-CUSTOM）、UI描画・一時プレビュー・編集下書きはrozwer、AI実行と結果はmattsunが持つ。採用前に設定版と関連プラグインの導入状態・版・enabled・競合解決後の適用宣言をサーバーで再確認する。設定の版不一致は共通の412、プラグイン状態変更は409 INPUT_CHANGEDとして編集値を保ち再確認する。地図設定の採用からプラグインを再有効化しない。[詳細な責任と照合条件](../../../03_issue/issues/MAP-CUSTOM.md#地図設定の保存責任)。
