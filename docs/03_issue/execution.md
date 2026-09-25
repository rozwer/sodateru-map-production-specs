# 実行と完了

[一覧](README.md) · [提供と接続](delivery.md) · [接続handoff](connect-start.md) · [元IDの対応](ui-connections.json)

## 分割後の責任

UI-BASEは共通shell、UI-INTEGRATION #98はsrc/integration/とdocs/integration/で画面登録/組込み、各元UIは指定画像・実Mapbox/renderer・画面/端末操作・状態・実shellでの組込み結果を担当する。中央globを用い、BASEのpath移管や中央ファイル編集を前提にしない。組込みTask全体doneを全CONNECTのhard gateにしない。

CONNECT-BASEはCOREの本人context/共通clientを実shellへ接続する。機能CONNECTは元UIの対象画面操作、既存API契約、統合証拠と必要pathの引継ぎが揃った単位から着手する。B〜Dの業務API/SQL/DTO・外部取得担当は変えない。UI全体doneとCONNECTの実API保存・再取得の完了判定は別に保つ。

## 着手と取得範囲

[Task Skill](../../.agents/skills/sodateru-task/SKILL.md)の通常worktree/claim/submit/finishを使う。origin/develop起点の専用worktree、receipt、現行lockを確認する。CONNECTの13組は一律の元UI done依存を外し、[接続handoff](connect-start.md)の実検査で対象操作の証拠を読む。統合済みのUI操作証拠、同じ版のOpenAPI、操作ID、必要pathがない単位はREADYにしない。claimは検査を通ったunitのpathと接続証拠pathだけを取得する。別unitや共有中央pathが必要なら正規のhandoffとlockを調整する。

健康UI #146は主要UI後の未実施項目。UI-HEALTHはUI-SETTINGS、CONNECT-HEALTHはUI-HEALTHのdone依存を維持する。健康のUI/接続/HEALTH.completeを非健康機能の必須依存にせず、未実施deferredを成功へ変えない。同pathのCONNECT-SETTINGS等が稼働中なら現行lockで取得待ちとし、二重claimしない。

## 修正Issueと親の完成条件

| 専用実装Task / Issue | 親の完成条件 | 受入と証拠 |
|---|---|---|
| UI-BASE-LAYOUT #300 | UI-BASE #4 | 共通Sheet・下部ナビ・配置吹き出しを幅別に実操作し、専用証拠を#300へ記録 |
| UI-MAP-CARD #297 | UI-MAP #8 | 写真有無・長い地名・本文・文字200%のカード比較を#297へ記録 |
| UI-MAP-RECORD-LINK #298 | UI-MAP #8 / UI-RECORDS #11 | 選択recordId・日時と戻り状態の往復を#298へ記録 |
| UI-MAP-THEME-RETRY #299 | UI-MAP #8 | テーマ取得失敗の順序2通りとgetThemes再試行を#299へ記録 |

各修正Issueは専用Taskで1件ずつclaimし、実装commit・実画面条件・成功/未確認をそのIssueへ残す。親Issueは元の全受入と後続証拠を参照し、専用修正のPRだけで代理finish/closeしない。同じ変更を親Taskで重複取得しない。#300と#8/#222が共通描画pathを必要とする場合は現在のlockと取得pathで順番を決め、#222に恒久専有権を置かない。

## 移管済み旧Task

VISUAL-PLUGINS #186はGROW-UI #215へ、DISASTER-UI #219はDISASTER-UI-SCREEN #223とBUILDING-GROWTH #222へ未完条件と既存証拠を移す。旧Issueの移管closeは受入済みdoneではない。台帳は旧Taskをsupersededとして再取得不可にし、後続のTask ID/Issueと元受入を残す。後続Issueはそれぞれの受入達成までopenで追う。稼働claim、receipt、未コミット差分は所有者の正規release/handoff以外で変更しない。

## 完了の扱い

1. 元UIは指定画像と実ブラウザで対象UI面の全表示状態・入力・遷移・取消/失敗表示・端末操作・幅別条件を確認する。Mapboxやshell未組込みを後続へ移してcloseしない。API前の応答はmockと明記する。
2. 元UIの受入が全て揃ったときだけ通常task:finishでdone・lock返却・Issue closeを揃える。途中の接続handoffは元UI完了を示さない。
3. 接続担当は検査を通ったunitで通常task:worktreeを使い、同じ実画面の操作→共通client→実API/DB→再起動/再取得→再表示、本人/dataMode・取消・再送・版競合・共有解除/削除を確認する。単位の部分成功ではCONNECT全体をfinishしない。
4. domain提供と元UI/CONNECTの両面が揃って利用者向け機能が完成する。元sourceのlive受入をUI単体の成功でPASSにしない。複合IDはui-connections.jsonの両面対応を使う。

健康は未実施deferred、新規相棒制作は未実施user-excludedとして原条件を保持する。成功済み確認は変更/不具合/具体的懸念がなければ再実行しない。

## board移行

#72の13 UI→CONNECT分割・原ID対応・相棒制作除外は保持する。#301は上記移管、専用修正Task、接続開始条件、健康の実施順のみを追加する。PRでdevelopへ統合した正確なTASK_GRAPHだけを通常 `mise run task:graph-sync -- --apply` のCASで反映する。検証時は旧Taskの未claim・path空、既存Task state/receipt/owner/base/token保持、後続IDと受入、CONNECTの拒否/許可を確認する。board手編集・他者lock解除・UIの代理closeはしない。
