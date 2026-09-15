# VISUAL-COMMUNITY 参照照合（作業中）

継続Task #184（#173をユーザー指示で分割）。plugins/feature-requestsは新担当へ0b0d02aを保全して正式返却済み。参照原本9画像を実際に開いて確認。全画面一致済みではない。API/地図/媒体/選択状態の通常データと画面幅を別々に確認する。companion-createはユーザー判断で対象外。健康3ページは他担当・余力未実装の既存判断を維持。

| 画面 | 参照画像・原本状態 | 実ブラウザURL・commit・幅・状態 | 差分 | 修正 | 未確認 |
|---|---|---|---|---|---|
| community-home | Codex 画像 2026年9月15日 07_41_00.png / home | 未確認 | Shellの430px側面枠＋背景地図と埋込Mapが重複 | 原本に基づくfullscreen指定、単一地図、地図高を画面幅に追従 | Shell契約統合後の再表示、写真/共有記録通常状態 |
| friends-map | Codex 画像 2026年9月15日 07_41_08.png / friend-selected | http://127.0.0.1:5173/#/friends-map / QA d264c15（PR193 40a940b包含）/ 390×844・853×1844 / demo友達0件 | 変更前内外2枚→表示Mapbox1枚、Sheet x0/y0/width853、横overflowなし | fullscreen明示・地図高285〜640px、原本幅の友達/記録拡大 | 友達選択/写真/複数共有カード通常状態はAPI0件のため未確認 |
| friend-profile | Codex 画像 2026年9月15日 08_17_57.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| friend-compare | Codex 画像 2026年9月15日 08_17_57.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| shared-route | Codex 画像 2026年9月15日 08_17_57.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| sharing | Codex 画像 2026年9月15日 08_17_53.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| friend-picker | Codex 画像 2026年9月15日 08_17_53.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| local-knowledge | Codex 画像 2026年9月15日 07_41_04.png / place-selected | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| knowledge-list | Codex 画像 2026年9月15日 08_12_07.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| knowledge-filter | Codex 画像 2026年9月15日 08_12_07.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| knowledge-detail | Codex 画像 2026年9月15日 08_12_07.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| plugin-store | page.jsonはreference absent。リハーサル docs/requirements/mockups/grow-app-store-v1.png を実見 | 未確認 | 未判定 | 既存リハーサル原本を採用、独自デザイン未作成 | リハーサル原本との実幅比較 |
| plugin-detail | Codex 画像 2026年9月15日 08_23_14.png / main | http://127.0.0.1:5173/#/plugin-detail?pluginId=fixture-bike / QA448a857 / 390×844 / 模擬バイク選択 | 実地図あり。原本より模擬ラベルの分だけ縦に伸びる | 模擬ラベル保全 | 1536×1024原本regionとの比較 |
| plugin-trial | Codex 画像 2026年9月15日 08_23_14.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| plugin-install | Codex 画像 2026年9月15日 08_23_14.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| plugin-manage | Codex 画像 2026年9月15日 08_23_21.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| plugin-update | Codex 画像 2026年9月15日 08_23_21.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| plugin-conflict | Codex 画像 2026年9月15日 08_23_21.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| feature-requests | feature-request-flow-v2.png / main; feature-request-flow-v2.png / submitted | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| feature-request-edit | feature-request-flow-v2.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| companion-settings | Codex 画像 2026年9月15日 08_23_36.png / main | http://127.0.0.1:5173/#/companion-settings / QA d264c15 / 390×844 / demo相棒0件 | 原本選択済み2体との差はデータ不足。初期設定/大小選択/保存導線表示 | 未着手 | 登録済み通常状態・原本幅 |
| companion-import | Codex 画像 2026年9月15日 08_23_36.png / main | http://127.0.0.1:5173/#/companion-import / QA d264c15 / 390×844 / ファイル未選択 | 原本プレビュー3動作との差は入力未選択。登録不可を正しく表示 | 未着手 | ZIP検査後の通常状態・原本幅 |
| companion-create | Codex 画像 2026年9月15日 08_23_36.png / main | 対象外 | ユーザー対象外 | 制作しない | 一致対象外 |

## 検証境界

PR193提出40a940b、通常merge a96cbc8。QA担当がHEAD d264c15へ5173/API3002を更新したreceiptを受領。担当friends/knowledge/companionのTypeScript検査とproduction build成功。全体tscはCORE/records/reflection/explorationの既存型エラーあり。相棒の内部idempotencyKey付与は保持したままhelperの入力型を修正。

既存UI-FRIENDS fixtureへ到達する専用HTMLだけ追加し、写真/座標/複数記録の既存模擬応答を再利用する。新しいmock基盤や起動サーバーは追加しない。実API保存完了の証拠には使わない。
