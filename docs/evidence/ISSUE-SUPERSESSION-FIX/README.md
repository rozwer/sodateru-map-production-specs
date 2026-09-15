# Issue #234: supersession同期修復

## 問題と変更

`migrate` は `validate_ui_split(graph)` の返値が存在する限り、全既存Taskの実行状態不変を要求していた。初回分離後もmetadataは保持されるため、正規のunclaimed backlog→supersededを拒否していた。初回分離に限ってこの検査を適用し、初回のbefore定義照合・公開metadata不変・active定義変更拒否は維持する。

単一後続の文字列形式を維持し、複数後続の一意な非空文字列配列を追加。`superseded_by` には公開値をそのまま保持する。未取得backlog、元定義不変、source_task_ids逆参照、未知/自己/連鎖後続拒否を維持し、構造化requirement_ids/acceptance_idsは後続の和集合で保持を検査する。

複数後続は `supersession_details[source]` を必須とする。`source_issue` は元TaskのIssue番号、`authorization_issue` は承認Issue番号、`reason`・`evidence` は非空文字列。`source_acceptance` の非空受入文は各後続が担当画面について共通継承する。`pages_by_successor` は全後続への非空画面割当。元Taskに `pages` / `acceptance` がある場合はその欠落も拒否する。公開されたmapping/detailsの変更・除去は禁止する。

inline Taskに構造化受入や画面一覧がない場合、元GitHub Issueとの意味上の完全一致をこのツールだけでは証明できない。#229担当の監査と公開証拠により元受入文を確定する。同期検証はその受入文と割当の存在・整合・公開後の保持を保証する。

## 確認

- 環境: mise Python 3.14.3、専用worktree、branch `rozwer/234-issue-supersession-fix`。base commitは `dry-run.json` に記録。実装commitは本証拠と同じPRのcommit。
- `mise exec -- python -m unittest discover -s tools -p test_sync_graph.py`: 13件成功。初回UI splitの提出commit/token/path/任意フィールド保持、初回に別state遷移が混入した場合の拒否、既存split後の2後続移管、旧string互換、冪等性、claimed/submitted/done/token/path残留拒否、未知/重複/自己/連鎖後続拒否、受入/要求/画面欠落拒否、公開移管metadata不変を確認。
- `mise exec -- python tools/sync_graph.py --manifest /Users/roz/.codex/worktrees/issue-repair-supersessions-229/TASK_GRAPH.json`: 通常dry-run成功、revision 242、manifest tasks 57。
- 同revisionの純粋migrate結果を比較し、変更stateは #173/#176 の2件だけ、残り84件は完全同一。元2件もstatus/superseded_by/superseded_at_revision以外（note、履歴commit等）を保持。入力boardは不変。詳細・manifest hashは `dry-run.json`。
- #173→#184+#186 は13+9画面・4受入文、#176→#185+#189 は14+7画面・4受入文。実boardへの移管書込みは行っていない。

## graph担当への受渡し

形式合意: https://github.com/rozwer/sodateru-map-production-specs/issues/229#issuecomment-5674755558

修復PR統合後、#229担当の通常branchへ最新 `origin/develop` を取り込み、合意済みmanifestをPRで通常mergeする。公開済みmanifestと同一である状態で `mise run task:graph-sync -- --apply` を実行する。`--apply` はremote developのmanifestとの一致とCASを従来どおり検査する。元Issueの移管終了およびgraph担当のfinishは#229が担当する。
