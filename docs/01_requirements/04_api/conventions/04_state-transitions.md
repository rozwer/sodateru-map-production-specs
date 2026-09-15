# 状態遷移と更新の境界

既存のDB状態を使い、HTTP操作で許可する遷移を具体化する。
同じ状態の再指定は版が一致すれば200で現在値を返し、内容が変わらない場合はversionを増やさない。
異なる遷移は409 STATE_CONFLICT、値や参照条件の不正は422 VALIDATION_FAILED。

## 訪問

| 現在 | 操作・次状態 | 条件と同時更新 |
|---|---|---|
| 未保存 | 作成→candidate | 本人の手動入力または位置観測由来 |
| candidate / rejected | 確認→confirmed | 本人の明示操作 |
| candidate / confirmed | 否定→rejected | 本人の明示操作。達成提案をselectedへ戻す |
| confirmed / rejected | 未確認へ戻す→candidate | 達成提案をselectedへ戻す |
| 任意 | 場所・日時の訂正 | 場所が達成提案先と異なれば、その提案をselectedへ戻す |
| 任意 | 削除 | records.visitIdをnullにし本文を保持。達成提案の参照も解除 |

提案を戻すときはcompletedVisitId=null、提案versionを1増やす。
訪問変更・関連提案の見直しは同じトランザクションで行う。

## 提案

| 現在 | 許可する次状態 |
|---|---|
| offered | later / dismissed / selected |
| later | dismissed / selected |
| dismissed | selected |
| selected | later / dismissed / completed / not_done |
| not_done | selected |
| completed | selected |

本人による選び直しを許すAPI案。
completed→selectedは達成の取消を表し、訪問自体は取り消さない。
訪問の否定・削除によるサーバー内部のcompleted→selectedも許可する。

completedでは同じ人物・場所のconfirmed訪問を必須とする。
その他の状態ではcompletedVisitIdをnullへ変更する。
selectedへの初回遷移時にselectedAtを保存し、再選択でも最初の時刻を保持する。
presented=trueは最初のpresentedAtを記録し、繰り返し送っても上書きしない。
expiresAtを過ぎた提案の新規選択・達成は409。
表示履歴・保留・見送り・達成取消は期限後も受け付ける。
条件や根拠の再評価手順はQ05に残る。

## 保存ルート

| 現在 | 許可する次状態 | 条件 |
|---|---|---|
| saved | navigating | 取得済み経路あり、fetchedAtから15分以内、currentLegが有効 |
| navigating | saved | 案内を中断して保存状態へ |
| navigating | finished | 本人が案内を終了 |
| finished | navigating | 再開。取得時刻と経路を再検査 |
| finished | saved | 保存状態へ戻す |

currentLegはlegs配列の有効な添字。
新しいresultIdで経路を置き換えるとsaved/currentLeg=0へ戻す。
この置換とstatus/currentLegの指定は同一PATCHに混ぜず、二回に分ける。
ルートをfinishedにすることだけでは提案をcompletedにしない。

## AI応答

| 現在 | 操作・次状態 | 条件 |
|---|---|---|
| 未保存 | 送信→pending、attempt=1 | user発言とassistant発言を一組保存 |
| pending | 実行開始→running | 同じ発言ID・attempt |
| running | 完了→complete | 同じID・attempt・running、入力版・権限の再照合成功 |
| running | 失敗→failed | errorCodeを保存 |
| pending / running | 取消→cancelled | 状態保存後に取消信号 |
| failed / cancelled | 再試行→pending | 同じID、attemptを1増やす |
| complete | 取消・再試行 | 409で拒否 |

user発言はcompleteを維持し、AI用の取消・再試行を適用しない。
取消と完了が競合したら、DBで先に条件付き更新を確定した状態を維持する。
サーバー再起動時はpending/runningをfailed、error_code=INTERRUPTEDへ整理してからAPI受付を始める。
再試行は元入力とモデル・promptVersionを使い、根拠の版が違えば409 SOURCE_CHANGEDとして新しい発言へ進む。

## 友人関係と拡張機能

友人申請はpending、受信者の承認でaccepted。
申請者による取消、受信者による拒否、acceptedの当事者による解除は行の削除で表す。
解除はfriends検索に反映し、明示されたselected共有は保持する。

プラグインは未導入から設定行の作成で導入する。
enabledのtrue/false切替は設定値を保持し、削除は設定行だけに適用する。
導入によって過去の記録・場所・ルートを作り替えない。
