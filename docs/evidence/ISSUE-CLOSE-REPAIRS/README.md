# 修復Issueの終了条件監査（#221）

2026-09-15。監査担当 `ISSUE-CLOSE-REPAIRS`、実task `01a0a349-cbb9-7d30-ba85-d7280f007ccd`。初回基点 `55a6ff215ceaf15e48729b06a08562c099e01324`、live board/公開Issue/PR照合値は [snapshot.json](snapshot.json)。claimは本ディレクトリのみ。実装・共有QAプロセス・元branch/worktreeは変更していない。

## 判定と残条件

対象9件の新規完了閉じ0、移管閉じ0、open維持9（実受入未完7、完全移管の正式board反映待ち2）。閉じ済み3件はdone/COMPLETED/paths=[]/tokenなし/提出commit到達を確認して維持。未達機能を数合わせでcloseしない。

|Issue|判断|公開成果・証拠|正確な残条件と後続|
|---|---|---|---|
|#98 UI-INTEGRATION|open維持。限定統合作業の完了候補だが現証拠だけで通常finishしない|PR130/170と13UIの統合、docs/integration/README.md / ui-deliveries.json、boardにQA448a857|READMEは初期12提供/設定未公開の記述が残り、最終13提供と共通メニュー到達の完了照合が不足。最新同一buildで対象入口を対応付ける。画像・実接続は元UI/CONNECTの各Issueへ残す。本監査ではそれらを変更しない|
|#173 VISUAL-COMMUNITY|完全分割移管候補、正式superseded反映まではopen|旧66f7091/0b0d02aを元branch/worktreeに保全。後続8ad0d83/34885adとstable patch-id一致、後続はdevelop祖先|友達/地域情報/既存相棒13画面→#184、plugins/お願い9画面→#186。制作は対象外。両後続の原本幅/390px・全状態・入力保持・API/Mapbox/mock保全条件を維持。旧Task再claim不要。完成ではなく移管として整理する|
|#174 VISUAL-MAP-EXPLORE|open維持|PR187/208、../VISUAL-MAP-EXPLORE/handoff.md と pages.md|全画面同状態/原本幅と390px、実API2候補の保存再表示、写真接続、地図装飾/設定API、TRANSFER/発見の参照不足。設定5画面のみ#191へ分割済み。接続参照#134/#136/#138/#145。全体を新GROW/DISASTERへ移管したとはしない|
|#176 VISUAL-SELF|完全分割移管候補、正式superseded反映まではopen|PR188/5b39f2dの提出HEADを保持、../VISUAL-SELF/README.md|記録/訪問/訂正/削除/成長/軌跡7画面→#189、reflection/insights/themes/suggestions14画面→#185。21画面の一覧・全受入を2後続へ完全保持。完成ではなく移管として整理する|
|#184 VISUAL-SOCIAL|open維持|PR193/199/207、../VISUAL-COMMUNITY/screens.md|13画面全状態/原本幅・390px。friend-profile/compare/shared-route/sharing/pickerの5画面未確認、knowledge修復後目視、通常友達/共有写真、相棒実ZIP検査・登録保存。接続参照#142/#143/#147。#173の社会13画面の受け先|
|#185 VISUAL-SELF-CONTINUE|open維持|PR201/210、../VISUAL-SELF/README.md|最終CSS後目視、14画面の原本幅/通常状態、原本4/5軸と正式6軸の対応、実日記/回答/提案保存、AI日記If-Match。接続参照#139/#140/#141。#176の14画面の受け先|
|#186 VISUAL-PLUGINS|open維持|PR203、../VISUAL-PLUGINS/screens.md|9画面の全幅/全状態、ストア構図/車種glyph/自然面/道路marker/ガイドURL、取消保留、live導入・更新・旧版復帰・再読込。fixtureはAPI未接続でreload初期化。接続参照#144。#173の9画面の受け先。新GROWの一部修復だけで本9画面を完了扱いしない|
|#189 VISUAL-RECORDS-CAMERA|open維持|PR196、../VISUAL-RECORDS-CAMERA/README.md|地図カメラ→媒体→記録→demo API保存→reload写真/本文表示は確認済み。7画面全状態/実Mapbox、Place/Visit/Track/Growth/Insight対応ID、気分契約、実訪問・訂正・削除/書出し、実成長と複数地点、実機撮影/OS拒否/liveは残る。接続参照#135。#176の7画面の受け先|
|#191 VISUAL-SETTINGS|open維持|PR206、../VISUAL-SETTINGS/README.md|見出し/写真/通常seedと5画面照合、profile写真実保存、停止場所の実解除、非健康activity-stats/data-sources正式DTO/製品登録/履歴遷移。接続残は#145へ、画像UI未達は本Issueに残る。健康3画面は余力#146/#148で別扱い|
|#40 QA-VISUAL|既存done/COMPLETED維持|../QA-VISUAL/2026-09-15-api-readiness.md、提出2155430祖先|起動入口とAPI readinessの限定完了。初期証拠は保存未確認と明示。後続#189にはdemo API写真保存再表示、#191にはdemo DB profile保存証拠。live/全画像/現在の共有プロセス復旧まで完了と拡張しない。稼働中QAは別担当|
|#72 PLAN-UI-CONNECTIONS|既存done/COMPLETED維持|../PLAN-UI-CONNECTIONS/validation.md、提出4f59bfe祖先|13UI/CONNECT分割定義とCAS保持検査の完了。各UI/CONNECT機能受入の完了ではない。既存分割metadataは維持|
|#172 VISUAL-SHELL|既存done/COMPLETED維持|../VISUAL-SHELL/screens.md、提出bea2b70祖先|共通container/camera入口の限定完了。navigation図版/通常プロフィールの画像差は元#4、写真受取/保存/実機残は#189。全画面一致・実機許可を完了扱いしない|

## 正式移管の制約と引継ぎ

`tools/sync_graph.py` は公開済み `TASK_GRAPH.json` と一致したmanifestのみapplyでき、supersessionsは1対1、後続のsource_task_idsに元Taskが必要。さらに既存ui_connection_splitがある場合は全既存実行stateの一致を検査するため、そのままのsuperseded追加は拒否される。分割先の片方だけを後続に書き、残る画面を落とす操作は行わない。

この監査の取得範囲は証拠のみであり、graph/同期ツールの変更は未許可。root/相談役へ制約を一度通知。#173/#176の受入は上表の各2後続に保存済みだが、正式board移管が未実行なのでGitHubだけを先にcloseしない。必要な最小の後続は、担当が正式path取得→2組の分割移管を保持できるgraph手順を用意→公開PR/通常merge→CAS同期→元2件をNOT_PLANNED（移管）でclose→READY除外確認。active claimを変更せず、元definition/commit/worktreeを維持する。

## 検証境界

- 13公開PRは全てMERGED、各headRefOidは基点developの祖先。詳細hashはsnapshot.json。
- #173の元commitはdevelop祖先ではない。元branch/worktreeを保持し、後続への同一差分取り込みをstable patch-idで確認した。提出HEAD保持mergeと旧commitそのものの到達性を混同しない。
- #40/#72/#172はlive board status、GitHub close reason、path/token解放、提出到達を確認。
- 既存証拠と公開報告の監査であり、本監査による実ブラウザ再検査/機能テストは実施していない。
