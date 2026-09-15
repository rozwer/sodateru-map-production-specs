# 最初の修正バッチ

- 原本: `07_41_12.png` を実見。住所のピン、保存/共有/三点メニューの1行構成。
- 修正: 住所のclover文字を既存pin SVGへ。390pxで保存ボタンと円形操作を1行にし、写真未提供の代替文言が隣の列へ溢れないようにした。
- 実ブラウザ: http://127.0.0.1:5319/docs/evidence/VISUAL-MAP-EXPLORE/map-preview.html 、基点28f3bf6 + このPR。390×844と853×1844を実見。390px横overflowなし、保存129px・共有34px・三点34pxは同じ行、共有クリックでモック応答。853pxでは原本と文字比率に未解消差がある。写真なしのため画像一致ではない。
- 経路比較入口: 同URLの `routes-preview.html?page=results`。既存UI-ROUTES部品fixtureを再利用し、実MapPreviewへ明示モック経路2本/地点2件を追加。390pxで実Mapbox表示・A/B選択・条件不明のBでは採用無効を確認。写真は未提供。実API保存の証拠ではない。
- `bun run typecheck`: 当方修正パスのエラーなし。既存CORE FeatureRequestCreate.displayName、companion idempotencyKey、exploration requestId、friends/records/reflection型エラーのため全体不合格。
- 共有QA5173とAPI3002には未統合。起動担当QAが一時Vite5319を起動。
