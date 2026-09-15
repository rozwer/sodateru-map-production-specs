# 取得範囲の変更・引継ぎ

最新boardと自分のclaim receiptを照合してから操作する。低水準コマンドのTask引数はTask IDを使う。tokenはローカルreceiptから読み取り、公開コメントへ貼らない。

- 追加path: `mise exec -- python tools/taskctl.py add-lock <Task-ID> --token <現在のtoken> --path <必要なpath>`。取得成功後に編集する。
- 担当移管: `mise exec -- python tools/taskctl.py handoff <Task-ID> --token <現在のtoken> --to <CODEX_OWNER> --note <引継ぎ内容>`。本番policyでは移管先のGitHub Issue担当との一致も検査される。
- claim返却: `mise exec -- python tools/taskctl.py release <Task-ID> --token <現在のtoken> --note <返却理由>`。Task全体をbacklogへ戻し、取得pathを解放する。

`release` はpath単位の部分解放ではない。残作業・未コミット変更・worktreeを保持し、再開に必要な場所と未完了条件を引継ぎに含める。他担当のclaimを `recover` で解除して競合を回避しない。

`handoff` 成功時は実行セッションの受信先を解除する。出力の新tokenにより旧tokenは無効になるため、受け手へ最新receiptとworktreeの所在をローカルの適切な経路で渡す。`release` は受信先を自動解除しない。待機をやめる場合は [担当間連絡](../../sodateru-issue-contact/SKILL.md) の登録解除も行う。
