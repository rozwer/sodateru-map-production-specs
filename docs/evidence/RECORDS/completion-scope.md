# RECORDS #20 完了範囲の変更と引継ぎ

ユーザーの2026-09-15の明示指示（約30分でデモを成立させるため、意味のある統合済み区切りで旧Issueを閉じ、未完を新Issueへ移す）に基づく。**当初のRECORDS全要件が完了したという扱いにはしない。**

## #20で完了した範囲

- COREの本人session・live/demo別実SQLite上で、手入力記録の作成/単体取得/編集/削除を実装。
- 原文保持、本文なし/場所日時不明、日記/独立メモの共通保存、同じID/keyの再送と異入力409、If-Matchの428/412を確認。
- 媒体の添付・個別再送・順序変更・単一Range・削除、部分失敗時の本文/成功媒体保持を実HTTPで確認。
- 別OSプロセス再起動後の原文・媒体順序・バイト一致、共有解除による本文/媒体の404を確認。
- 記録削除後の訪問/独立メモ保持と、テーマ所属/由来参照の除去を実DBで確認。

統合: [PR #58](https://github.com/rozwer/sodateru-map-production-specs/pull/58)、`560c97600352b03e09e02f80d25f79950656a83f`。実装`8c4922d`。検証と呼出例は同ディレクトリのverification.md / ui-contract.md。

## 未完の移管先

[RECORDS接続仕上げ #86](https://github.com/rozwer/sodateru-map-production-specs/issues/86)。担当koshiro / koshiroucl。元Issue #20との相互リンク、担当・最小受入・優先度を記載済み。

- **デモ必須**: UI #11から保存→実API→同じIDで再表示/訂正、INFORMATION #6の一覧/共通閲覧への接続。ブラウザ操作の保存証拠は未完であり、この完了処理で成功扱いしない。
- **後続**: 新規文書export/deletion-previewの共有OpenAPI/client生成反映と通常起動での確認、SourceRefの削除/共有解除時の状態再検査、THEMES memo付加情報のextension接続、文書控え→確定削除の画面受入。
- 文書実装/固有断片/テスト内合成の受入は提供済み。製品生成契約へ反映した実接続の代用とはしない。

旧claimは正規submit/finishで解放し、新Issueはboard登録・正規task:worktree後に再開する。他担当lockの解除や既存変更の破棄は行わない。
