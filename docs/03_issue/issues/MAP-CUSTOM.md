# MAP-CUSTOM｜手動装飾・レイヤー設定とAI地図設定

<!-- task-id: MAP-CUSTOM -->

初期担当枠：C。担当者：kaiya。[GitHub #27](https://github.com/rozwer/sodateru-map-production-specs/issues/27)。[一覧](../README.md) · [共通完了条件](../execution.md#完了の扱い)。

## 完成結果

本人が追加した飾りや表示設定を保存し、AIから得た地図設定案を確認後に適用できる。

## 実装範囲

- 飾りのCRUD/配置と地図設定を本人/モード別APIで保存・再取得し、PLUGINSの現在有効状態と照合する。
- mapstyle固有入力/プロンプト/検証/採用、4色を含む設定をUIの描画へ渡す。

## 地図設定の保存責任

永続保存とAI案の採用はkaiyaのAPIが担当し、本人・dataMode別の同一SQLiteを正本にする。rozwerは描画、編集中の値と一時プレビュー、下書き、カメラとタブの復元だけを持つ。ブラウザ保存でAPIの保存済み地図設定を上書きしない。mattsunはAI結果を返し、地図設定を直接変更しない。

- 手動設定もAI採用も同じ保存処理へ渡す。設定IDは本人・dataModeから一意に解決し、版を返す。API名・DTO・DDLはlayers契約へ揃え、koshiroが共通生成物へ反映する。
- PLUGINSの本人/モード別の導入状態・版・enabled・競合解決後の適用宣言を、設定取得時と保存/採用直前にサーバーで読む。保存する表示希望と、現在有効なプラグインから算出した実効表示を区別する。
- プラグイン由来の実効表示は「本人が表示を希望」かつ「導入済み・有効・競合解決後に適用可能」の場合だけ有効。設定保存からプラグインを再有効化したり削除したりしない。停止中も本人の表示希望と元データは保持する。
- 設定の版不一致は共通の412。プレビュー時から関連プラグインの版/有効状態が変わった場合は409 INPUT_CHANGEDで再取得・再確認を求める。編集値を残し、自動採用しない。
- AI採用は設定更新とmessages.applied_refs_jsonへの採用先/版/内容ハッシュの追記を同じトランザクションで行う。応答喪失時もAPI再取得で採用済みを判定し、二重適用しない。
- プラグイン停止完了時、rozwerの地図は対象ownerKeyをclearし、APIから実効表示を再取得する。再読込・本人/モード切替でも最新の実効表示を使う。

## 通過条件

- 飾りの位置/色/名前を保存・編集・削除し、成長建物のデータを変更しない。
- AI提案だけでは設定を変えず、採用・取消・版競合を区別する。
- 再読込で表示設定が戻り、無効プラグインの表示を勝手に再有効化しない。

## 参照と契約

[地図の表示設定](../../01_requirements/03_pages/map-layers/README.md)、[地図オブジェクトを編集](../../01_requirements/03_pages/object-edit/README.md)、[地図に配置](../../01_requirements/03_pages/object-place/README.md)。

[01_contract.md](../../01_requirements/02_common/01_ai/01_contract.md)、[03_map-ui.md](../../01_requirements/02_common/02_places-routes/03_map-ui.md)。

契約補完の担当：`object`、`layers`。[補完一覧](../contract-gates.md)。

固有のAPI・SQL・保存・再取得・失敗までをこのIssueで持つ。共有APIの変更担当は[対応表](../coverage.md)で照合する。

## 依存と先行作業

- 着手前：なし。
- 実接続・完了前：[CORE](CORE.md)、[AI](AI.md)、[PLUGINS](PLUGINS.md)。

契約が確定した部分から固有処理・SQL・外部接続を進める。未決事項は、その契約を使う部分だけを止める。共通Schema/API生成器の反映はkoshiro、固有の契約断片・DTO変換・業務処理・保存は本Issue担当が持つ。共通処理を複製せず、提供済みの型付きクライアントと登録入口を使う。

### 提供単位

Issueを分割せず、次の利用操作ごとに先行統合する。部分提供の成功だけでIssue全体を閉じない。

- **MAP-CUSTOM.manual**：手動装飾・本人の地図設定のAPI保存/再取得。kaiyaのAPIが同一SQLiteを正本として保存。本人/モード別に再取得し、pluginの現在有効状態から実効表示を算出する。
- **MAP-CUSTOM.adopt**：AI地図設定のプレビューと採用。提案だけでは保存せず、設定版とplugin状態を採用時に再確認。設定更新とmessagesの採用参照を同一トランザクションで保存する。

### 接続に必要な提供物

- [CORE](CORE.md)：`CORE.runtime`。
- [AI](AI.md)：`AI.engine`。
- [PLUGINS](PLUGINS.md)：`PLUGINS.state`。

提供元Issue全体のdoneではなく、必要な提供物の統合commit・契約版・実API/保存/再取得の証拠を確認する。[提供と接続の進め方](../delivery.md)。

## 編集範囲

提案path：`server/features/map-custom/`、`server/db/migrations/map-custom/`、`docs/01_requirements/04_api/fragments/MAP-CUSTOM.json`、`docs/evidence/MAP-CUSTOM/`。

共通ファイルの変更・途中統合・ロック返却は[4人の進め方](../execution.md)に従う。実際の取得範囲はclaimReceiptで確認する。
