# THEMES #37 提供範囲の完了と残件移管

<!-- task-id: THEMES -->

2026-09-15、利用者の明示した方針変更により、統合済みの提供単位を本Issueの完了範囲とし、原仕様の残要件を [#105](https://github.com/rozwer/sodateru-map-production-specs/issues/105) に移管する。原仕様の全受入完了ではない。

## 完了範囲と統合

- [PR #54](https://github.com/rozwer/sodateru-map-production-specs/pull/54)、commit `8fa13e2db074e6a2f46cb628ca69f5ab06a15b11`: THEMES契約断片1.0.0と永続化migration。
- [PR #78](https://github.com/rozwer/sodateru-map-production-specs/pull/78)、commit `3368265a23bd65b2f2450f266b630e46f841b7cc`: COREに接続したテーマCRUD、所属/色/写真、所有者と版の検査、再送制御、メモread/write helper。
- [PR #104](https://github.com/rozwer/sodateru-map-production-specs/pull/104)、commit `a50b427`: RECORDS extension登録と連結検証入口。これは型検査済みの接続コード提供であり、実保存の受入済み提供物とは扱わない。

## 確認結果と再現

担当worktreeで `mise exec --` を付けて実行。

- `node --test server/features/themes/migration.test.mjs`: 1件成功。由来元削除で所属/参照を除去し、独立したメモ本文を維持。
- `node --test server/features/themes/contract.test.mjs`: 2件成功。7色/名前上限/写真解除、presentation付き本文200文字と通常memo長文の両立。
- `node --experimental-transform-types --test server/features/themes/service.test.ts`: 2件成功。同名別ID、所属/写真/色、所有者/版、再起動再取得、由来の版検査と削除。
- `node --experimental-transform-types --test server/features/themes/http.test.ts`: 1件成功。実CORE createApp/Hono/SQLite/sessionで201/再送200/409/428/412、本人とlive/demoの分離、再起動、削除後再送404と元記録維持。
- `bun run typecheck`: a50b427の変更内容で全体成功。

HTTP試験は契約断片をメモリ上で合成し、fixture記録をSQLで投入。共通生成物・実main・画面操作の証拠ではない。

## 未達と移管先

`memo-integration.test.ts` は実RECORDS create/patch/deleteを使用するが、共有OpenAPIにmemoが未反映のためVALIDATION_FAILED/additional propertiesで未通過。CORE #3へ生成反映を依頼済み。契約検査を迂回していない。

共通生成物反映後の実main/API、画面→保存→再表示、RECORDS構造化メモ連結、INFORMATION/友人公開、AI命名/明示採用/根拠版確認と実Luna検証はすべて #105 に残す。受入条件と依存Issueも同Issueへ記載済み。

未統合AI草稿は固定stash OID `37dca6e5cc3f169ce367e11a96ce0d4994935c05` と `.local/themes-ai-followup.json` に保全。元claim解放後は正式に新Taskを登録/取得するまで実装を継続しない。

GitHub #37の本文をこの範囲に更新し、統合後に正規task:finishでboard終了・claim解放・Issue closeを行う。ローカルの範囲外Issue定義ファイルは変更していない。
