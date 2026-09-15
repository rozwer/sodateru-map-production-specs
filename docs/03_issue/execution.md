# 実行と完了

[一覧](README.md) · [提供と接続](delivery.md) · [元IDの対応](ui-connections.json)

## 分割後の責任

UI-BASEは共通shell、UI-INTEGRATION #98はsrc/integration/とdocs/integration/で画面登録/組込み、各元UIは指定画像・実Mapbox/renderer・画面/端末操作・状態・実shellでの組込み結果を担当する。中央globを用い、BASEのpath移管や中央ファイル編集を前提にしない。組込みTask全体doneを全CONNECTの新しいhard gateにはしない。

CONNECT-BASEはCOREの本人context/共通clientを実shellへ接続する。機能CONNECTは元UI done後に元feature pathと接続証拠pathを取得する。B〜Dの業務API/SQL/DTO・外部取得担当は変えない。

## 着手と取得範囲

[Task Skill](../../.agents/skills/sodateru-task/SKILL.md)の通常worktree/claim/submit/finishを使う。origin/develop起点の専用worktree、receipt、現行lockを確認する。既存UIのID・担当・paths・token・base・提出状態を変更せず、closeは実担当とAオーケストレーターが判断する。

- hard_dependencies：各CONNECTは対応元UI done。UI-HEALTHはUI-SETTINGS done、CONNECT-HEALTHはUI-HEALTH done。
- connect_inputs/outputs：提供元全Issueのdoneではなく必要な提供物の統合commit・契約版・確認証拠を追う。UI-BASE.shellによる実shell組込みは元UI完了に残る。
- 健康のUI/接続/HEALTH.completeはP3の余力枠。非健康機能の必須依存にしない。同pathのCONNECT-SETTINGS等が稼働中なら現行lockで取得待ちとし、二重claimしない。

## 完了の扱い

1. 元UI：今回対象のUI面を参照画像と実ブラウザで確認する。全表示状態・入力・遷移・取消/失敗表示・媒体/マイク/測位/方位/ファイル操作・幅別条件を満たす。Mapboxや画像不一致、shell未組込みを後続へ移してcloseしない。API前の応答はmockと明記する。
2. UI完了の証拠を統合し、通常task:finishでdone・lock返却・Issue closeを揃える。後続Issueへの参照と残る実接続受入を証拠に残す。
3. 接続担当が元UI done後に通常task:worktreeでCONNECTを取得し、同じ実画面の操作→共通client→実API/DB→再起動/再取得→再表示、本人/dataMode・取消・再送・版競合・共有解除/削除を確認する。
4. domainの提供と元UI/CONNECTの両面が揃って利用者向け機能が完成する。元sourceのlive受入をUI単体の成功でPASSにしない。複合IDはui-connections.jsonの両面対応を使う。

健康は未実施deferred、新規相棒制作は未実施user-excludedとして原条件を保持する。健康の画面を実接続へ隠してUI合格にせずUI-HEALTHで追跡する。成功済み確認は変更/不具合/具体的懸念がなければ再実行しない。

## 限定的なboard移行

#72の明示metadataに固定した13 UI→CONNECT、相棒制作の明示除外、健康余力移管だけを許す。元定義のbefore照合・identity/paths保持・317 ID/提供物保持・後続依存を検証する。通常のactive変更禁止は維持する。

PRでdevelopへ統合した正確なTASK_GRAPHだけを通常sync_graph --applyのCASで反映する。既存board.tasksは全項目を保持し、新たなinline Task（UI-INTEGRATION #98等）も保持する。board手編集・他者lock解除・UIの代理closeはしない。
