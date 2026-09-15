# #72の定義・移行検査

基点: 560c97600352b03e09e02f80d25f79950656a83f。専用branch rozwer/72-ui-connections、正式claimの5範囲内。

- `mise exec -- node docs/03_issue/verify.mjs`: PASS。51 Task、67ページ、317要件/317受入、225機能、108操作（当初104＋CORE session追加4）、20不足を対応。原要件/受入/API binding JSONとの完全一致を確認。
- `mise exec -- python3 -m unittest discover -s tools -p test_sync_graph.py`: 6件成功。既存board.tasksの全field（token/base/paths/status/提出/任意追加field）保持、inline #98保持、再適用、無関係active編集/元path拡大/ID・受入・提供物欠落/不正除外・健康必須化を拒否。
- `mise run task:graph-sync`: 最新board revision 135でdry-run成功（CAS実反映はdevelop統合後）。

元13 UIの画面/実Mapbox/端末操作・shell未達は元UIに残す。CONNECT 13件と健康余力2件の番号はmapping.json。新規相棒制作はuser-excluded、健康はdeferredで原条件保持。UI/機能の完成証拠ではない。

通常CAS同期はmigrate内で既存tasks全要素が同一であることを検証してからpushする。元UIの代理close/claim解除は行わない。PLAN-UI-CONNECTIONSのみ正式finishし、実担当は原UI範囲の受入成功後に通常finishする。
