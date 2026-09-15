# Q05: 画像・要件・入力の対応
状態: 2026-09-15 検討中。下記の未決定部分は実装しない。

## 根拠を確認済みの事項
- 画像 `docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 07_40_47.png` を実際に開いて確認。レーダーラベルは自然・本・カフェ・散歩・人との時間。根拠カードは「カフェで過ごした」「本を見つけた」「公園を歩いた」。
- type-diagnosis/requirements.md: 期間内記録に基づく仮の呼び名、固定的人格や根拠なし点数を禁止。2体験の仮説を検証済み傾向としない。
- components.json: 欠測を0にしない、グラフ固定形状不可。
- 03_evidence.md: 日数分子/判断できる日数分母、value=分子/分母、分母0はnull、未知日は分母へ加えない。
- 02_records.json / PeriodAnswers: 現行はdetour,newPlace,rest,alone,longStay,farTripのnullable boolean。画像5軸との変換定義は存在しない。
- Activity.nameは任意文字列、purpose/outcome/satisfaction/repeatIntentあり。name一致だけの実施判定は定義されていない。
- self_checkinsのstate/wishesは当時の状態・希望。実施した事実へ自動変換しない。

## 対応表
| 画像 | 現存する根拠例 | 入力契約で足りない事項 |
|---|---|---|
| 自然 | 公園を歩いた | 自然への接触/滞在/鑑賞のどれを判定するか |
| 本 | 本を見つけた | 読書だけへの限定は画像例と一致しない。本探し/購入/読書の包含範囲 |
| カフェ | カフェで過ごした | 場所カテゴリだけか本人の実施用途か、立寄りとの境界 |
| 散歩 | 公園を歩いた | 移動歩行と本人が散歩として残した体験の区別 |
| 人との時間 | 画像に具体カードなし | 同行/会話/交流の範囲と本人の判断入力 |

## 技術的な契約調整
- CORE: AnalysisAxis/AnalysisResultに画像5軸を表現する正式定義、from/to(createdAt)と対象rangeStart/rangeEnd/timeZone検索の分離、200文字理由のSchema反映。
- RECORDS/REFLECTION: 日全体について本人が確認したyes/noと、体験時点の回答を区別できる保存入力。既存6軸を勝手に改名しない。
- INFORMATION: activities/periodAnswersを含む正規読取。SourceRefには実際の判定に使った版を含める。
- UI #13: グラフの意味・根拠内訳・unknown表示、本人に確認可能な入力を一致させる。

## 意図/採用判断が必要な事項
- 上記5軸の意味を定義してから保存field/入力選択肢を決める。
- 一日への複数回答の統合: 同一visit写真重複は訪問一回が確定。同日相反する回答は未確定。最新優先・肯定優先・unknownのいずれも黙って採用しない。
- 体験時点のnoを一日全体のnoに拡張しない案、および複数日体験の各日配分は未承認。
- 保存adapter、本人評価、参照同一性はこれらと独立して実装する。
