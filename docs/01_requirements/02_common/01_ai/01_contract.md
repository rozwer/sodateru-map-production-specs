# AIの入出力

体験整理・日記・比較・説明・地図設定は同じ実行受付を使う。
街歩きの一時候補は [検索ループ](04_map-dialogue.md)の入口を使う。
全項目の型と上限は [schemas.json](schemas.json)に置く。

## 受付と取得

共通処理は以下の関数として公開する。HTTPへの対応は[HTTP接続表](../references/http-bindings.md)を使う。
成功・失敗の外側の形式は [共通通信](../00_protocol.md)に従う。

| 操作 | 共通関数 | 入力 | 結果 |
|---|---|---|---|
| 会話作成 | createConversation | id、purpose、title、recordId | Conversation |
| 実行受付 | startRun | RunRequest | Run。202 |
| 状態・結果取得 | getRun(assistantMessageId) | なし | Run |
| 取消 | cancelRun(id, input) | expectedVersion、expectedAttempt | Run |
| 再試行 | retryRun(id, input) | expectedVersion、expectedAttempt | Run |
| 会話再表示 | listMessages(id, input) | cursor、limit | {items: Message[], nextCursor} |

会話のpurposeはconsult / reflection / analysis / comparison。
街歩き・体験整理・地図設定・発見はconsult、日記はreflection、傾向・テーマはanalysis、比較はcomparisonを使う。
対象の日付・記録の集合は実行入力で持つ。

### RunRequest

| 項目 | 型・必須 | 意味 |
|---|---|---|
| conversationId | ID・必須 | 結果を表示する会話 |
| userMessageId | ID・必須 | 本人の発言。送信時に一度だけ発行 |
| assistantMessageId | ID・必須 | 応答。再試行でも同じID |
| text | 1〜20,000文字・必須 | 本人が入力した原文 |
| task | 下表の用途名・必須 | 登録する処理 |
| input | 用途別オブジェクト・必須 | 読む対象と条件 |
| expectedRefs | SourceRef配列・必須 | 画面で見ていた対象の版。参照がなければ空配列 |

同じassistantMessageIdの同じ要求を再送したら、現在のRunを返す。
本文や対象が違う場合はREQUEST_CONFLICT。
userMessageIdとassistantMessageIdは別のIDにする。
expectedRefsに指定した版が現在と違えばSOURCE_CHANGED。

### 用途別のinput

| task | 全項目 | 範囲・既定 |
|---|---|---|
| extract | recordId、answers | answersは0〜10件。各項目はquestion（1〜500文字）、text（1〜4,000文字） |
| diary | date、timezone、recordIds | 日付とタイムゾーン。記録1〜100件 |
| consult | placeIds、recordIds、conditions | 場所1〜20件、本人記録0〜100件。conditionsは本人の条件文0〜4,000文字 |
| compare | fromRecordIds、toRecordIds | 各1〜20件。重複・同じ記録の自己比較を拒否 |
| analysis | insightId | 計算済み分析1件。IDが示す結果の根拠を取得 |
| theme | recordIds、currentName | 記録1〜100件、現在名0〜100文字 |
| mapstyle | current | 現在のテーマ・光・表示3項目・4色 |
| discover | anchor、factKeys | anchorはkind・targetId・features。特徴1〜10件。根拠キー0〜50件 |

recordIdsなど集合の順序は結果の同一性に影響させず、ID順で正規化する。
compareの左右、日記内の時刻順、地図設定の項目は意味を保つ。

### RunとMessage

| Runの項目 | 内容 |
|---|---|
| id / conversationId / userMessageId | 応答ID、会話ID、元発言ID |
| task | 用途名 |
| status | pending / running / complete / failed / cancelled |
| attempt / version | 試行番号と保存版 |
| model / promptVersion | 実際に使うモデルと依頼文の版 |
| result | 完了時の用途別結果。それ以外はNULL |
| error | 失敗時のcode・message・retryable。それ以外はNULL |
| sourceRefs | 生成に使った記録・訪問・場所・回答・ルートと版 |
| insightId | 保存された分析・比較のID。それ以外はNULL |
| createdAt / updatedAt | UTC Unixミリ秒 |

Messageはid、conversationId、position、role、body、status、attempt、model、insightId、sourceRefs、version、createdAt、updatedAt。
会話取得はposition昇順。
AI結果のカードは、assistantの発言IDを使ってRunを取得する。
bodyは表示文、resultは画面に戻す構造化結果として分ける。

## 用途別の結果

全キーを必須とし、不明値はNULL、該当なしは空配列で返す。
以下の文字数上限もschemas.jsonへ同じ値を定義する。

| task | 結果 |
|---|---|
| extract | purpose（NULLまたは500文字以下）、reason（NULLまたは2,000文字以下）、context、evidenceIds、question |
| diary | text（1〜20,000文字）、evidenceIds（1件以上） |
| consult | summary（2,000文字以下）、candidates、unknowns |
| compare | mappings |
| analysis | summary（1〜2,000文字）、evidenceIds、unknowns |
| theme | name（1〜100文字）、description（1,000文字以下）、evidenceIds |
| mapstyle | proposal、explanation（1〜1,000文字） |
| discover | anchor、bridge（1,500文字以下）、knowledge（2,500文字以下）、observationPrompt（1,000文字以下）、conceptIds、sources |

extract.contextの全項目はweather、companion、timeBudgetMinutes、timeBand、notes。
weatherはclear/rain/snow/other、companionはalone/friend/family/colleague/other、timeBandはmorning/day/evening/night。
いずれもNULLを許可する。timeBudgetMinutesは0以上の整数またはNULL、notesは4,000文字以下またはNULL。
questionはNULLか{topic,text}。topicはpurpose/reason/context/alternative、textは1〜500文字。

consult.candidatesの各項目はplaceId、reason（1〜2,000文字）、evidenceIds、unknowns。
unknownsの各文字列は1,000文字以下。
場所IDは渡した候補に含まれ、候補内で一度だけ出現する。

compare.mappingsの各項目はfromRecordId、toRecordId、relation、explanation（1〜1,500文字）、evidenceIds、rejected。
relationはsame-place-same-purpose / same-place-different-purpose / different-place-same-role / practical-tip / similar-but-different-reason。
rejectedはfalse。本人の「違う」は生成後の判断として保存する。

mapstyle.proposalはtheme、lightPreset、showPedestrianRoads、showAdminBoundaries、showIndoor、colors。
themeはdefault/faded/monochrome、lightPresetはdawn/day/dusk/night。
表示の3項目は真偽値。colorsはNULLかwater・greenspace・roads・buildingsの4色で、各色は#と6桁の16進数。

discover.anchorは入力と完全一致。
sourcesの各項目はurl（NULLまたはhttp/https URL）、title、claimScope（general/place-specific）、sourceId（NULLまたはID）。
factKeysから取得した根拠の出典だけを返せる。

## 参照の確認

AIへ渡す引用にはsrc_1、src_2のようなIDをサーバーが付ける。
順番は材料の種類、対象ID、原文→追加回答の順で固定する。
evidenceIdsはこの一覧にあるIDだけで、重複を許可しない。
比較ではその組の左右の記録に属する引用だけを使う。
AIの引用IDから実際のSourceRefへ戻す対応表を生成処理が保持する。

意味条件として、Runのcompleteはresultが非NULL・errorがNULL、failedはresultがNULL・errorが非NULL、それ以外は両方NULLとする。SourceRefは同じtype・idを異なる版で重複させない。

会話のページ位置は記録検索と分け、base64urlの{conversationId,position,id}を使う。所有会話IDを照合し、positionが後の発言を返す。
