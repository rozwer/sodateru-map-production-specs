# 根拠・分析結果・更新の反映

傾向、比較、AI説明、今日の提案、発見が、元の情報をたどるための仕様。

## SourceRef

全項目はtype、id、version。
typeはrecord / visit / place / checkin / route。
同じtype・idを二度含めない。
一つの生成・集計で使う参照をtype、id順へソートして保持する。

| type | 読む保存先 | 本人・権限 |
|---|---|---|
| record | records | 本人または現在の共有範囲 |
| visit | visits | 本人のみ。共有記録経由は公開する場所・日時へ投影 |
| place | places | 選んだモード内で取得 |
| checkin | self_checkins | 本人のみ |
| route | saved_routes | 本人または現在の共有範囲 |

共有記録の日時にvisitを使う場合、その公開記録に必要な場所・日時だけを材料にする。
他の訪問や移動履歴を含めない。
生成中の照合は共有recordと対応するvisitの版をサーバー内部で両方保持する。

## 再取得の結果

checkSources(context, {refs})へ参照を渡す。HTTPの直接再照合は[接続表](../references/http-bindings.md)を使う。
SourceCheckは{ref,state,currentVersion}。
stateはcurrent / changed / unavailable。
currentは版一致、changedは閲覧できて版違い、unavailableは削除・権限なし。
unavailableのcurrentVersionはNULL。

結果の内容を画面へ返す前と、生成結果を保存する直前に照合する。
changedならSOURCE_CHANGED、unavailableならNOT_FOUNDとして再生成・表示を止める。
本人が選んだ対象と現在の材料をそろえてから新しい実行を作る。

## 分析の同一性と再利用

input_keyの材料はpersonId、kind、正規化した条件、sourceRefs、timezone、generatorVersion、model。
キー順をそろえたJSONをSHA-256にする。
同じinput_keyがあればそのinsightsを再利用し、本人のreview・review_noteを保持する。
版・期間・条件・生成定義が変われば別の結果IDを作る。

集計機能から受け取る各axisはkey、numerator、denominator、unknownDays。
numerator≦denominator、どの件数も0以上の整数。
valueはdenominator=0ならNULL、それ以外はnumerator/denominator。
未知の日を分母へ加えない。
AIは計算済みaxesを変更せず、説明を作る。

## 訂正・削除・取消

recordやvisitの訂正ではversionを増やす。
insights・suggestions・messagesのsource_refs_jsonを照合し、古い入力の結果を現在の結果から外す。
取得時の照合を必ず行い、通知を取り逃した画面も同じ結果になるようにする。

削除された原文を含むmessages.body・result_jsonは表示しない。
会話の該当位置には「参照元が変更されたため再取得が必要です」を表示する。
結果の保存自体を削除する場合は、messages.insight_idの参照をNULLにする。

共有取消は公開範囲の更新後に上の照合へ反映する。
本人が自分の記録から作った結果は引き続き閲覧可能な材料で再評価する。

## 発見に使う根拠

根拠定義はfactKey、text、conceptIds、sourceを持つ。
sourceはurl、title、claimScope、sourceId。
claimScopeはgeneral / place-specific。
place-specificには対象のkindとtargetIdを結び、別の対象には渡さない。

発見の入力はanchor={kind,targetId,features}。
kindはplace/building/photo。
featuresは本人が観察した1〜10件の特徴。各1〜300文字。
factKeyを解決し、一般知識と対象固有の事実を分けてAIへ渡す。
取得した出典は完全な組で照合し、AIが生成した新しいURLを採用しない。

## 発見カードと反応の保存

本番の保存に次の二表を追加する。
共通のDB列規約はID、version、created_at、updated_atに適用する。

| discovery_cardsの列 | 型・意味 |
|---|---|
| id、person_id | TEXT。主キーと本人 |
| anchor_json | TEXT。kind・targetId・features |
| bridge、knowledge、observation_prompt | TEXT。表示する説明 |
| concept_ids_json、sources_json | TEXT。生成に使った概念と出典 |
| source_refs_json | TEXT。元の保存データの版 |
| version | INTEGER。初期1 |
| created_at、updated_at | INTEGER。UTCミリ秒 |

| discovery_reactionsの列 | 型・意味 |
|---|---|
| id、person_id、card_id | TEXT。主キー、本人、カード |
| reaction | TEXT。known / interested / saved / blocked / dismissed |
| created_at | INTEGER。反応時刻 |

card_idはdiscovery_cardsを参照し、カード削除で反応も削除する。
反応のidは操作開始時に固定し、再送は同じ行を返す。
カードと反応は本人ごとに照合する。
保存一覧は、そのカードの最新のsaved/blocked/dismissed反応で判断し、savedのカードを表示する。
同時刻は反応IDの昇順で最後のものを最新とする。
interested・knownは表示状態の変更を伴わない。

カード取得時にsourceRefsを照合し、古い根拠なら再取得を案内する。

共有記録のSourceRef群にvisitがある場合、同じ要求に含まれる閲覧可能なrecordがそのvisitを参照するときだけ版を照合できる。visitの直接読出し権限は増やさない。Fact.anchorはplace-specificで必須、generalでNULLとする。

追加表のSQLは[storage-additions.sql](../references/storage-additions.sql)。参照先の削除時もcreation_receiptsは残し、再送をNOT_FOUNDとして判定する。
