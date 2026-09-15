# RECORDS接続仕上げ

元Issue: [RECORDS #20](https://github.com/rozwer/sodateru-map-production-specs/issues/20)。ユーザーの2026-09-15の明示指示により、統合・実API確認済みの保存/媒体を#20の完了範囲とし、未完条件を本Issueへ移す。元の要求全体が達成済みという意味ではない。

担当: **koshiro / @koshiroucl**。UIはrozwer（#11）、共通生成物はCORE #3、共通閲覧/根拠はINFORMATION #6と調整する。UIや共有pathを無断で編集しない。新規claim前の実装は行わない。

## 利用できる成果

PR #58、develop統合 `560c97600352b03e09e02f80d25f79950656a83f`。既存記録CRUD、媒体添付/再送/順序/Range、共有変更と削除をCOREへ接続済み。別OSプロセス再起動で原文/媒体順序/実体の保持、共有解除、訪問/独立メモ保持を確認済み。証拠は`docs/evidence/RECORDS/verification.md`、呼出例は`ui-contract.md`。

## デモ必須: 画面から保存して再表示

- [ ] UI-RECORDS #11の保存ボタンから既存POST /recordsを呼び、実DB保存→同じrecordIdでGET→編集PATCH→画面再読込で表示する。失敗を完成表示にしない。
- [ ] INFORMATION #6の統合後、記録一覧/共通閲覧判定へ接続する。既存の本人/公開/指定共有の動作を保ち、共通canReadShared等へ認可の判定を集約する。
- 最小受入: 同じdevelop・本人session・live/demoで、ブラウザ操作による手入力1件の作成/再表示/訂正を一度確認し、保存ID・統合commit・表示証拠を残す。現時点ではこの実画面接続を完了とは扱っていない。

## 後続: 文書・根拠・メモ付加情報

- [ ] COREが`fragments/RECORDS.json`のexport/deletion-previewを共有OpenAPI/型付きclientへ生成反映する。実装と断片は統合済みだが、これまでの受入はテストサーバー内合成であり、製品の通常起動からの利用確認は未完。
- [ ] INFORMATION.checkSourcesで、共有解除/削除後の依存結果がunavailableになり古い引用が表示されないことを実接続で確認する。
- [ ] THEMES #37のmemo presentationをregisterRecordExtensionへ接続し、名前/由来/キーワードと原文を同一transactionで保存/再取得する。通常memo/REFLECTION回答の20000文字契約を維持し、一律200文字へ縮退しない。
- [ ] UIから削除preview→媒体内包HTML控えの保存→If-Match付き確定削除を確認する。記録と媒体は消え、訪問/独立メモは残る。再確認前の版変更は412。
- 最小受入: 製品の生成契約で通常起動し、上記文書/根拠/メモの各接続を一組ずつ実操作または実APIで確認。未接続や失敗を空応答で成功扱いしない。

## 再開手順

旧RECORDS claimは正規finishで解放する。本Issueをboardへ登録してから、sodateru-taskの`mise run task:worktree`でorigin/develop起点の専用worktreeを取得する。推奨pathは旧#20と同じ5件。既存claimを奪わず、他担当lockを解除しない。
