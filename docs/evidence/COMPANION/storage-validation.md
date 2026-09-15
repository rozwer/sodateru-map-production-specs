# COMPANION 保存層の先行検証

2026-09-15、Node 22.22.1 / SQLite、専用branch `mattsun/35-companion`。

## 成功した検証

`mise run task:exec -- /Users/kmattsun/.codex/worktrees/companion-35 mise exec -- node --experimental-strip-types --test server/features/companion/repository.test.ts server/features/companion/generations.test.ts`

4 tests / 4 pass。NodeのSQLite実験機能警告あり。

- 下書き更新、古いversion拒否、SQLiteファイルclose/open後の入力復元、別本人からの参照拒否。
- 全動作確認前の登録拒否、取込の同一登録ID、登録と現在選択の独立、未登録IDの選択拒否。
- 生成入力snapshotと後続下書き編集の分離、取消後の進捗/成功の遅着拒否。
- 成功時の自動採用なし、全動作確認後の採用、採用時の生成version更新と現在選択の維持。

`bunx tsc --noEmit --target es2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions --skipLibCheck server/features/companion/repository.ts server/features/companion/generations.ts` も成功。

## この検証が証明しないこと

取込fixtureは保存境界専用の検査済みデータであり、有効ZIPや媒体decodeの証拠ではない。CORE実API、正式v2互換ZIP、ブラウザ動作確認、実生成サービスへの接続、live/demo再起動の通し確認は未実施。API断片は接続準備用で実装完了を示さない。

## 残条件

- CORE.runtime/integrationの統合と共通HTTP/再送/版ラッパ接続。
- v2の一次互換仕様・実fixture、50MBのbyte表記と展開上限の合意。
- PNG/WebP実decodeとZIP展開の依存追加（COREへfflate/sharpを依頼、未反映）。
- 実生成先/資格情報と永続job再照会契約。現在の環境に生成関連キーなし。
- 参考画像、指示持出し、実HTTPの保存/再取得とUI #19接続。

Issue #35とboardはclaimedのまま。部分成功を完了としない。
