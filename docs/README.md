# 育てる地図の仕様

対象の機能から必要な定義を読む。共通条件は参照先にまとめ、各ページには固有の目的・操作結果・保存・例外を置く。

| 確認したいこと | 入口と正本 |
|---|---|
| コンペの条件 | [コンペルール](00_references/00_コンペルール.md) |
| 技術・固定版 | [技術スタック](01_requirements/00_stacks/README.md) |
| 利用者ができること | [画面一覧](01_requirements/03_pages/README.md) → 対象画面の機能要件。機能だけを横断する場合は[機能一覧](01_requirements/03_pages/functions.md) |
| UIの配置・操作・状態 | 対象画面の画像、page・components・states・interactions。全画面に[共通条件](01_requirements/03_pages/common.json)と[描画指定](01_requirements/03_pages/component-audit.md)を適用 |
| 通信・型・応答例 | [API索引](01_requirements/04_api/README.md) → 機能別契約。機械可読の正本は[OpenAPI](01_requirements/04_api/openapi.json) |
| AI・検索・地図の共通処理 | [共通基盤](01_requirements/02_common/README.md) → 対象基盤の契約・処理・保存 |
| 永続化 | [DB索引](01_requirements/01_DB/README.md) → 対象テーブルと共通規約 |
| 未確定・不足 | [APIの未確定事項](01_requirements/04_api/conventions/03_open-questions.md)と[画面から必要な追加契約](01_requirements/03_pages/api-gaps.json) |

画面の `requirements.md` は機能と成立条件、`requirements.json` と `acceptance.json` はID付きの検査用定義。表示・操作・保存・再表示までを受入対象とする。定義検査の通過と実装完了は区別する。

## 更新と検査

画面・DB・共通基盤は該当定義を編集する。APIの生成対象は [build_contracts.py](01_requirements/04_api/tools/build_contracts.py) を編集して再生成する。共通規約等の手書き文書は直接編集する。

```sh
mise exec -- python3 docs/01_requirements/04_api/tools/build_contracts.py
mise exec -- node docs/01_requirements/04_api/tools/check_contracts.mjs
mise exec -- node docs/01_requirements/03_pages/verify.mjs
mise exec -- node docs/01_requirements/02_common/verify.mjs
```

変更した定義と参照先に対応する検査を実施する。画像・実API・DB保存の確認条件は各仕様に従う。
