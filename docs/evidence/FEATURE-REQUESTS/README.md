# FEATURE-REQUESTS 投稿APIの提供

## 動作単位

既存5 operationIdの一覧・投稿・単体取得・編集・削除に加え、`patchFeatureRequestEmpathy` と `getFeatureRequestDevelopmentGuide` を提供する。COREの本人context、SQLite、transaction、永続再送受付、版検査、入力Schema検査を利用する。

- 本文200文字以内、投稿時の表示名1〜20文字を固定保存。プロフィールの改名には追随しない。明示編集だけ投稿名を変更できる。
- public/private。非公開は本人のみ。公開本文の空白のみは拒否、空下書きの題名は「下書き」。題名は本文の最初の空でない行をtrimして生成する。互換入力titleは保存値へ使わない。
- regionTags/purposeTagsは本人入力を各5件・各1〜20文字、重複なしで保存。自動分類しない。
- 共感は本人×投稿一意。`PATCH /feature-requests/{requestId}/empathy {empathy:boolean}` とIf-Match。指定状態が既に一致する再送は件数も版も増やさない。実変更時は投稿版を照合する。
- 編集/削除は投稿者のみ、If-Match必須。投稿削除と共感削除は同一transaction。
- 一覧はcreatedAt DESC/id DESC、本人/検索条件へ署名付きcursorを束縛。publicと本人投稿だけ取得する。
- 開発ガイドは本番remoteの `.agents/skills/sodateru-task/SKILL.md`。GitHub Contents APIでdevelop上の実在とhtml_urlを確認した。アプリ内フォームは既存feature-request-editを共用し、自動開発・外部通知を開始しない。

## 検証

`mise exec -- node --experimental-transform-types --test server/features/feature-requests/http.test.ts`: PASS（1件）。実CORE createApp/openDatabases、17基本表、HTTPリスナー、cookie本人を使用。投稿→同キー再送で1件→別内容409、表示名固定、他者の下書き404/編集403、共感追加/同状態再送→サーバー再起動→再取得→解除、本人編集/版競合、ページ継続、ガイド取得、削除→再起動→404、削除後再送404を確認。

`mise exec -- bun x tsc --noEmit --module esnext --moduleResolution bundler --target es2023 --allowImportingTsExtensions --esModuleInterop --skipLibCheck --strict --noUncheckedIndexedAccess server/features/feature-requests/register.ts server/features/feature-requests/http.test.ts server/features/feature-requests/build-fragment.ts`: PASS。対象機能と依存のstrict型検査。

全体 `bun run typecheck` は取り込み済みTHEMES testのundefined検査とDISASTERの未統合plugins import等で失敗する。担当外を変更せず、全体成功とは主張しない。

HTTPテストはFEATURE-REQUESTS断片を既存OpenAPIへメモリ上で合成して本物の入力検査を通す。共有生成ファイルはCORE担当が反映する。通常起動の共通client生成とUIの投稿/共感/編集削除のデモ接続は利用者承認の分割で後続Issueへ移す。
