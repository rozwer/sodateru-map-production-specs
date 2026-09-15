# DISASTER｜防災情報の取得・根拠と地図表示

<!-- task-id: DISASTER -->

初期担当枠：C。担当者：kaiya。[GitHub #30](https://github.com/rozwer/sodateru-map-production-specs/issues/30)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

指定地域の防災情報を出典・時点・意味付きで確認し、地図へ表示できる。

## 実装範囲

- 固有条件、必要な地形/雨量等の提供元・計算・取得時刻・保存/更新を契約化する。
- ハザードと現在状況の違い、欠測/範囲外/取得失敗を返す。

## 通過条件

- 実取得した情報の出典・更新時刻・対象地域と地図範囲が一致する。
- 過去ハザードを現在の浸水等と表示せず、取得失敗を模擬成功へ置換しない。
- 設定と結果の再取得・更新・無効化が通常地図へ反映される。

## 参照と契約

[README.md](../../01_requirements/02_common/03_information/README.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[PLUGINS](PLUGINS.md)、[PLACES](PLACES.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **DISASTER.complete**：防災情報・出典/時点付き表示材料。実取得元の意味・地域・時点を保ち、通常地図へ適用/停止できる。

### 接続に必要な提供物

- [PLUGINS](PLUGINS.md)：`PLUGINS.state`。
- [PLACES](PLACES.md)：`PLACES.search`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/plugins/disaster/`、`server/db/migrations/disaster/`、`docs/01_requirements/04_api/fragments/DISASTER.json`、`docs/evidence/DISASTER/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
