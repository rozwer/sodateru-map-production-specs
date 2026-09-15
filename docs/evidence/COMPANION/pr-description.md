## 変更

既存Codex v2ペットのZIPを検査し、9動作と16視線を確認した後に登録できます。登録と現在選択を分離し、本人・live/demo別SQLiteへ媒体、登録物、表示設定を保存します。壊れたZIPやサイズ超過、版競合で既存の相棒を変更しません。

50MB受付と100MB展開上限、厳密2ファイル、73使用セルと未使用透明を検査します。COREの登録口・本人context・共通HTTP/再送/transaction・sharpを使用。固有API断片v0.2はmultipart/file、data envelope、Unixミリ秒、部分PATCH、cursor一覧に統一しました。

## 検証

- UI #19の原創作ZIPを実HTTPへ投入し、検査→25項目確認→登録→選択→HTTP/DB再起動→同一ID/設定/画像の再取得を確認。
- 未確認登録409、登録＋選択の版競合412と全体rollback、不正ZIP422、50,000,001-byteファイル413、既存登録物維持を確認。
- 下書き/設定の実HTTP、live/demo分離、再送/異入力競合、保存層と生成制御の境界も確認。
- COMPANION全13テスト成功。限定strict型検査と、最新develop取込後の全体型検査、git diff --check成功。

詳細: docs/evidence/COMPANION/import-validation.md

## 対象範囲と残件

ユーザーの明示的変更により新規相棒生成は今回対象外。下書き/生成状態の既存コードは保全していますが、実生成を実装済みとは主張しません。

固有断片の共有型への反映と、UI #19の実表示/動作確認/選択の接続受入を継続中です。これらの完了確認と独立差分レビュー後に統合します。Issueとboardの終了は別途正規手順で行います。

Refs #35
