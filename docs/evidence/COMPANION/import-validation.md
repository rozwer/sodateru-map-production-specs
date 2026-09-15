# COMPANION.import 実HTTP・保存証拠

## 今回の完成範囲

2026-09-15、司令塔2経由の明示的ユーザー指示「生成しなくていい、Codexのペット機能を持ってくる」により、新規相棒生成は今回対象外。既存CodexペットのZIP取込・表示用媒体再取得・管理・選択を完成対象とする。既存の下書き/生成状態コードは保全するが、実生成済みとは扱わない。

## 接続基盤と一次互換根拠

- CORE PR #53、develop統合413598b9379be040be6d4ddbe3d802485911a716、契約v0.3.0、runtime/integration証拠を確認。defineFeature/context/transaction/idempotentMutation/requireVersionを利用。
- sharp 0.35.4はCORE PR #59、統合522cf7b9ddd8cc39fb8e1e91ecb96c30653b0cc9から取得。
- 一次実装：[rehearsal pet-package](https://github.com/rozwer/sodateru-map-rehearsal/tree/4699303dd8cedb067b687a3cb37ec7c24f5e7177/shared/logic/pet-package)、同commitのcodex-v2 renderer。
- 厳密5keyのpet.jsonと、参照するspritesheet.pngまたはspritesheet.webpの計2ファイル。1536×2288、8列11行、セル192×208。使用コマ数は6/8/8/4/5/8/6/6/6/8/8。73使用セルは非空、未使用セルは全透明。
- 圧縮50,000,000 bytes、展開100,000,000 bytes。旧6MiBを持ち込まない。100MBは正規2ファイルと約14MBのRGBA atlasに十分な展開上限。manifestは65,536 bytes以内。
- #19と9標準動作＋gaze-0〜gaze-337.5の16視線、計25確認IDを合意。

## 実施した操作

最新develop取込後、COMPANIONの全13テスト成功、`bun run typecheck`（リポジトリ全体）成功、限定strict型検査成功、`git diff --check`成功。Node Transform Types/SQLiteの実験機能警告あり。初回にあったPLACESの型エラーは後続developの修正で解消した。

`mise exec -- node --experimental-transform-types --test server/features/companion/http-import.test.ts`

実Hono/Node HTTPサーバーを127.0.0.1の動的portで起動。COREの本人session、入力Schema、エラー、永続再送、mode別SQLiteを使用。テスト用contractは共有OpenAPIへ固有断片v0.2をメモリ内合成して使用し、共有生成物を私有編集していない。

1. UI #19 commit15d9aabの原創作fixture（30,821 bytes）をmultipart/fileで送信。実ZIP展開とsharpによる画像decode後、25確認項目を取得。
2. 未確認の登録は409。全25項目を確認後、設定version不一致の登録＋選択は412となり、登録自体もrollback。
3. 登録だけを実行すると現在選択はnull。次の明示操作で登録IDを現在選択へ保存。
4. 壊れたZIPは422 VALIDATION_FAILED、details.fieldsのreasonはZIP_CORRUPT。50,000,001-byteファイルは413。いずれも登録数・選択を維持。
5. HTTPサーバーとDB接続を閉じ、同じDB/cookieで再起動。登録ID・選択・importIdが一致。atlas媒体を再取得し、元のPNGと全バイト一致。foreign_key_checkは0件。

別の `http.test.ts` では下書き/設定の実HTTP、同一再送の現在資源再取得、異入力409、部分PATCH、省略維持、古い版412、Unixミリ秒、再起動、live/demo分離を確認。

## 検証の限界と接続残件

このfixtureはUI担当の原創作技術fixtureであり、実生成品質の証拠ではない。画像は元fixtureのZIPからPython標準zipfileで独立抽出したものと照合している。

API断片v0.2の共有生成・型反映と、UI #19での実表示・25項目の操作確認・選択後の表示受入を続ける。新規生成providerは今回対象外。

## 再現用コマンド

- `mise exec -- bunx tsc --project server/features/companion/tsconfig.check.json`
- `mise exec -- node --experimental-transform-types --test server/features/companion/http.test.ts server/features/companion/http-import.test.ts`
- `mise exec -- node --experimental-transform-types --test server/features/companion/archive.test.ts server/features/companion/package.test.ts`

独立レビュー済みは先行head412bae2まで。v0.2/HTTP/ZIP差分は司令塔へ追加レビューを依頼する。
