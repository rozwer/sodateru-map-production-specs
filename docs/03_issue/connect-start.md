# CONNECTの操作単位handoff

[実行と完了](execution.md) · [提供と接続](delivery.md) · [元IDの対応](ui-connections.json)

13組のCONNECTは元UI全体のdoneを着手条件にしない。UI担当は接続できる対象操作が統合された時点で、`docs/evidence/<UI-ID>/connect-handoff.json` を通常PRでdevelopへ統合する。CONNECT担当は `mise run task:ready` と通常 `task:worktree` で取得する。元UIの未完受入やmock状態を完了扱いしない。

例（UI-MAPのmap検索。commitとdigestは実際の統合版を記入）:

```json
{
  "source_ui_task": "UI-MAP",
  "connection_task": "CONNECT-MAP",
  "units": [
    {
      "id": "map-search",
      "page": "map",
      "action": "place-selected--search",
      "write_paths": ["src/features/map/screens.tsx"],
      "ui_commit": "<統合済みUI証拠を含む40桁commit>",
      "ui_evidence": "docs/evidence/UI-MAP/search.md",
      "contract_commit": "<統合済み契約を含む40桁commit>",
      "contract_path": "docs/01_requirements/04_api/openapi.json",
      "contract_sha256": "<その版のOpenAPI本文のSHA-256>",
      "api_operation_ids": ["getPlaceCandidates"]
    }
  ]
}
```

gateはhandoffのsource/CONNECT ID、元UIのページとinteractions.jsonのaction、そのactionにあるAPI operation IDとOpenAPIのoperation ID、UI証拠path、契約本文とSHA-256、各commitが取得時のdevelopへ祖先到達していることを検査する。契約と証拠は同じ統合版に存在しなければならない。write_pathsはCONNECT Taskの提案範囲内かつ少なくとも1つの実装pathを含む。証拠がない、版が違う、対象外の操作/path、未統合commitはREADYにしない。healthは別のUI-HEALTH done依存を維持する。

handoffに複数unitを置ける。claim時は検査を通りlockが空いた最初のunitのwrite_pathsと接続証拠pathのみを取得し、`--unit <id>` で明示選択もできる。追加のfeature pathを無条件に取得しない。必要な別unitは所有者と順番を決めて正規release後に再claimする。部分接続成功はCONNECT全受入のdoneではない。最終finishにはIssue本文の全操作、本人/live/demo分離、API/DB保存・再取得、失敗/取消/再送/版競合を実際に確認する。

提供元全IssueのdoneやUI-INTEGRATION全体doneは要求しない。必要な契約・API・pathを使う操作にだけその提供物の証拠を要求する。UIの指定画像・Mapbox・端末操作の未完はUI Issueで追い、CONNECTへ移してUIをcloseしない。
