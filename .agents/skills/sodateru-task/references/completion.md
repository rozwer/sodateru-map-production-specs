# 提出と完了

受入条件の確認結果は `docs/` 以下に残し、対象commit、再現に必要な環境、確認結果、未解決点を示す。固定の全件テストやスクリーンショットだけを完了条件にしない。

担当worktreeで、必要ならマージ前の提出状態を記録する。

```sh
mise run task:submit -- --evidence <証拠のパスまたは参照>
```

この処理はboardをsubmittedにする。PR作成・マージは行わない。PRには依頼範囲の変更と検証結果を示し、許可された統合手順で統合する。完了処理は提出commitの統合branchへの祖先到達性を確認するため、squashによるcommit対応付けは想定されていない。提出commitを保持して統合する。

統合後、受入条件を確認して担当worktreeから実行する。

```sh
mise run task:finish -- --evidence <証拠のパスまたは参照>
```

`finish` は提出HEADのremote統合branchへの到達性を確認し、boardをdoneにしてpath・tokenを解放し、実行セッションの受信先を解除する。本番policyがあればGitHub Issueも閉じる。各処理の失敗・警告を確認する。GitHub closeだけが失敗した場合はboardを手編集せず同じ `finish` を再実行できる。`task:land` 単独は `finish` と同じ後処理をすべて実施するものではない。

receiptが見つからなければ、作成時に返った `claimReceipt` を `--receipt` に指定する。古いtokenを上書きして合わせない。別セッションで完了した場合や解除警告時の登録整理は [担当間連絡](../../sodateru-issue-contact/SKILL.md) を使う。

完了報告では、機能の確認・統合・board終了・Issue終了に未完了があれば区別する。
