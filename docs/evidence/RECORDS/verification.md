# RECORDS 実装・接続検証

## 2026-09-15 先行受入

CORE統合commit `413598b9379be040be6d4ddbe3d802485911a716`を担当worktreeへ取込み、COREのcreateApp、本人session、mode別SQLite、transaction、idempotentMutationを使用。機能固有のservice提供commitは`2612b24`、HTTP接続と本検証スクリプトは`8c4922d`。

```powershell
mise exec -- bun run typecheck
mise exec -- node --experimental-transform-types docs/evidence/RECORDS/run-acceptance.mjs
```

Windows / Node 22.22.1 / Hono 4.9.7。実HTTPソケットと実SQLiteファイルを使用。保存後にサーバーOSプロセスを終了し、新プロセスで同じDBを開いて再取得した。モックのDB・認証・媒体・再送処理は使用していない。

結果: **PASS**。最新develop `2332231` 取込後の実行ID `records-acceptance-857f8700-9977-47bb-a68f-5beb8e1290fa`。不正multipartの415、失敗媒体だけ同じID/keyで再送、続き取得と順序変更後の古いcursor拒否も確認。

- 原文の空白・改行・日本語・絵文字を保存/取得。
- 同じ送信キー/入力は同じID、異入力409。編集後は省略項目保持、版なし428・古い版412。
- 本文保存後の画像添付、添付の応答喪失を想定した同キー再送。内容不正画像415後も本文・成功画像を保持。
- 単一Rangeの206・Content-Range・実バイト一致、範囲外416。
- 二画像の順序変更と、別OSプロセス再起動後の同じ原文・順序・画像バイト列。
- 本人以外とdemoからprivate記録へ404。selectedへの変更で共有先が本文/媒体を取得でき、privateへ戻すと両方404。
- 削除previewの版、媒体内包HTMLの原文と保存順、古いpreview版の削除412、確定削除204、記録/画像取得404。
- 削除後に古い作成要求を再送しても404で復活しない。別IDの独立メモは残る。

発見・修正: Node HTTP adapterがbyte bodyにContent-Lengthを付けるため、媒体ルーターの手動指定と重複してHTTPパーサーが拒否した。手動指定を除き実HTTPで206を再確認した。

追加の固有受入（同日PASS）:

```powershell
mise exec -- node --experimental-transform-types --test server/features/media/content.test.ts
mise exec -- node --experimental-transform-types --test server/features/records/lifecycle.test.ts
```

- 媒体のMP4 track handlerによる映像/音声分類とMIME不一致拒否、suffix/open Rangeと複数Range拒否。
- COREの実DB/基底DDLとTHEMESの実migrationを使用し、空本文記録の作成、訪問を参照する記録の削除後のconfirmed訪問保持、テーマ所属除去、由来参照除去、独立メモの原文保持、foreign_key_checkを確認。

## 提供境界と残件

ユーザー承認による完了範囲変更後の正本は[completion-scope.md](completion-scope.md)。以下の未完条件は[後続Issue #86](https://github.com/rozwer/sodateru-map-production-specs/issues/86)へ移管し、#20の完了扱いには含めない。

- RECORDS所有の新規export/deletion-preview断片は、この受入サーバーで共有contractへ合成して検証。製品の共有OpenAPI/生成clientへの反映はCORE担当が行うため、反映前を製品全体完成とは扱わない。
- INFORMATIONの共通閲覧/SourceRef判定は提供待ち。接続後に削除/共有変更時の根拠状態を確認する。
- UIファイルは変更していない。画面実操作の接続証拠はUI-RECORDS #11担当と確認する。
- [TOOL-UPSTREAM-GUARD #62](https://github.com/rozwer/sodateru-map-production-specs/issues/62)のPR #63でcommit/push誤拒否は解消。正規merge/verify後に`8c4922d`をcommit/pushできた。hook無効化・他担当ロック変更は行っていない。
