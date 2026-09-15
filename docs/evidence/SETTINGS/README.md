# SETTINGS 接続と確認

## 提供範囲

- `patchMe`: 名前1〜20文字、紹介200文字以内、HTTP(S)アイコンURLまたはnull。
- `getMeSettings` / `patchMeSettings`: 本人とlive/demo別DBの利用設定。設定のversionはPersonから独立。未保存はversion=1、最初の保存は2。
- `resetMeSettings`: If-Match照合後に設定を初期化。版は増加を維持し、記録・媒体・プロフィールを消さない。
- `getMeIcon` / `patchMeIcon` / `deleteMeIcon`: Person.versionで更新。multipartのfile一枚、JPEG/PNG/WebP、50MiB。DBと同じディレクトリ下のDB別専用ファイルへ保存。記録媒体には触れない。
- `getMeData`: 本人プロフィール・設定・記録の件数と管理入口。記録の書出しと削除はRECORDSのexport/deletion-preview/DELETEへ接続する。
- `exportMeSettings`: プロフィールと利用設定を人が読める日本語HTML文書として添付ダウンロード。
- 健康データは利用者の決定で今回の対象外。

## UIと機能側の接続

`server/features/settings/register.ts` をCOREの自動収集に登録する。固有migrationは `server/db/migrations/settings/001-settings.sql`。

画面はGETの保存値からフォームを作り、変更したトップレベル項目をPATCHする。内部オブジェクトと配列は全置換。未送信の項目は保持される。If-Matchには取得した対象のversionを引用符付きで送る。428は版欠落、412は競合で入力を保持し再取得する。

プロフィールはCOREのgetMe、設定はgetMeSettingsから取得する。画像は共通クライアントで本人cookieとX-Data-Modeを付けBlobを取得して表示する。権限の実際の状態はブラウザから取得し、保存された「利用する」という希望値と分ける。

AI側は `assertAiAllowed(db, personId, {records?,location?,media?,profile?})` を外部送信直前に呼ぶ。enabledと各送信範囲は既定false。許可不足は403、成功時は最新settingsVersionを返す。送信済み本文の遡及取消を意味せず、再試行を含む次の外部送信に適用する。

提案側は `isSuggestionAllowed(db, personId, {placeId,activity}, trigger)` を生成前・保存前・現在候補表示・新規選択時に呼ぶ。triggerはonOpenまたはcontinuous。停止対象は場所と活動のAND一致、片方nullはその軸の全体、両方nullは禁止。低評価とは独立で解除まで維持する。保存済みの履歴は削除しない。

保存期間は今後の保存方針として保持する。変更操作で過去データを即時に削除しない。実際の記録/軌跡の削除処理は各担当の版照合とpreview経由で行う。

## 検証

- 2026-09-15: 正式worktreeでtask:verify成功、SETTINGSの4 pathのclaim確認。
- 契約aa172f2: 既存OpenAPIへSETTINGSの7 schemasを組み合わせ、AJVとajv-formatsで参照込みコンパイル成功。
- 実API・再起動・本人/モード分離・アイコン保持の受入はCORE統合待ち。成功扱いにしていない。
- AI/SUGGESTIONS担当は利用helperの署名と送信直前/保存直前の再確認に合意。利用先の統合証拠は後続。
- RECORDS担当はHTML文書とアイコン独立保存に合意。媒体MIME共通検査の提供時に接続する。

## 契約再生成

`mise exec -- node --experimental-strip-types server/features/settings/build-fragment.ts`

このコマンドはSETTINGS断片だけを生成する。共通Schema・クライアントの生成はCORE担当が行う。
