# VISUAL-COMMUNITY 参照照合（作業中）

継続Task #184（#173をユーザー指示で分割）。plugins/feature-requestsは新担当へ0b0d02aを保全して正式返却済み。参照原本9画像を実際に開いて確認。全画面一致済みではない。API/地図/媒体/選択状態の通常データと画面幅を別々に確認する。companion-createはユーザー判断で対象外。健康3ページは他担当・余力未実装の既存判断を維持。

| 画面 | 参照画像・原本状態 | 実ブラウザURL・commit・幅・状態 | 差分 | 修正 | 未確認 |
|---|---|---|---|---|---|
| community-home | Codex 画像 2026年9月15日 07_41_00.png / home | http://127.0.0.1:5173/#/community-home / QA d264c15 / 390×844 / demo写真1枚・友達0件 | 地図1枚、地域/友達カードを原本順で表示。原本の写真3枚/友達3人との差はデータ | 原本に基づくfullscreen指定、単一地図、地図高を画面幅に追従 | 原本853×1844・複数カード/友達通常状態 |
| friends-map | Codex 画像 2026年9月15日 07_41_08.png / friend-selected | product #/friends-map QA d264c15 / 390×844・853×1844で0件; QA9c608b2 / docs/evidence/VISUAL-COMMUNITY/friends-preview.html#/friends-map / 同2幅で友達4人・共有写真2枚・2地点 | 表示Map1枚・横overflowなし。通常fixtureで写真/選択/2記録表示。390pxではピンが端に寄る・下部2枚目はスクロールが必要 | fullscreen明示・幅追従。検索入力→メニュー→閉じるで入力保持確認 | 通常実APIは友達0件。原本人物/写真との一致、390pxピン余白/カード密度は未完 |
| friend-profile | Codex 画像 2026年9月15日 08_17_57.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| friend-compare | Codex 画像 2026年9月15日 08_17_57.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| shared-route | Codex 画像 2026年9月15日 08_17_57.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| sharing | Codex 画像 2026年9月15日 08_17_53.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| friend-picker | Codex 画像 2026年9月15日 08_17_53.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| local-knowledge | Codex 画像 2026年9月15日 07_41_04.png / place-selected | http://127.0.0.1:5173/#/local-knowledge / QA d264c15 / 390×844 / demo写真1枚・本文なし1件 | 原本の白header/アイコン操作が未装飾→PR199で修正 | knowledge-map-toolbarで白背景/44px戻る・メニュー。APIと58%Sheetを維持 | QA9c608b2反映receipt済みだが修正後目視未実施。原本公園/6件通常状態未確認 |
| knowledge-list | Codex 画像 2026年9月15日 08_12_07.png / main | 未確認 | 原本画像実見済み。既存previewはalias不足で初回描画失敗 | PR199でMapPreview相対importへ修復、QA9c608b2でJS/HTML200 receipt | 修復後の実表示・通常実API・原本幅/390px照合は未実施 |
| knowledge-filter | Codex 画像 2026年9月15日 08_12_07.png / main | 未確認 | 原本画像実見済み。既存previewはalias不足で初回描画失敗 | PR199でMapPreview相対importへ修復、QA9c608b2でJS/HTML200 receipt | 修復後の実表示・通常実API・原本幅/390px照合は未実施 |
| knowledge-detail | Codex 画像 2026年9月15日 08_12_07.png / main | 未確認 | 原本画像実見済み。既存previewはalias不足で初回描画失敗 | PR199でMapPreview相対importへ修復、QA9c608b2でJS/HTML200 receipt | 修復後の実表示・通常実API・原本幅/390px照合は未実施 |
| plugin-store | page.jsonはreference absent。リハーサル docs/requirements/mockups/grow-app-store-v1.png を実見 | 未確認 | 未判定 | 既存リハーサル原本を採用、独自デザイン未作成 | リハーサル原本との実幅比較 |
| plugin-detail | Codex 画像 2026年9月15日 08_23_14.png / main | http://127.0.0.1:5173/#/plugin-detail?pluginId=fixture-bike / QA448a857 / 390×844 / 模擬バイク選択 | 実地図あり。原本より模擬ラベルの分だけ縦に伸びる | 模擬ラベル保全 | 1536×1024原本regionとの比較 |
| plugin-trial | Codex 画像 2026年9月15日 08_23_14.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| plugin-install | Codex 画像 2026年9月15日 08_23_14.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| plugin-manage | Codex 画像 2026年9月15日 08_23_21.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| plugin-update | Codex 画像 2026年9月15日 08_23_21.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| plugin-conflict | Codex 画像 2026年9月15日 08_23_21.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| feature-requests | feature-request-flow-v2.png / main; feature-request-flow-v2.png / submitted | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| feature-request-edit | feature-request-flow-v2.png / main | 未確認 | 未判定 | 未着手 | 通常状態・原本幅・390px |
| companion-settings | Codex 画像 2026年9月15日 08_23_36.png / main | QA d264c15 / product #/companion-settings 390×844で0件; docs/evidence/UI-COMPANION/preview.html?sample を390×844・1536×1024で2体選択済み | 既存fixtureの現在相棒/選択2体/表示/大小/動き/保存を実見。原本ロボット/猫とは別の検査用画像 | 新規相棒を作らず既存sample入口を再利用。リクエストhelper型を修正 | 実API登録済み通常状態と原本キャラ一致は未確認 |
| companion-import | Codex 画像 2026年9月15日 08_23_36.png / main | QA d264c15 / product #/companion-import 390×844で未選択; UI-COMPANION/preview.html?sample 390×844・1536×1024取込済みfixture | 既存テストZIP名/サイズ/3動作＋22動作折りたたみ/登録条件を実見。原本猫との差あり | 現在相棒を変更せず既存sampleを使用 | 実ZIP検査/登録のAPI操作は今回未実施。25動作確認は原本3絵より縦に長い |
| companion-create | Codex 画像 2026年9月15日 08_23_36.png / main | 対象外 | ユーザー対象外 | 制作しない | 一致対象外 |

## 検証境界

PR193提出40a940b、通常merge a96cbc8。QA担当がHEAD d264c15へ5173/API3002を更新したreceiptを受領。担当friends/knowledge/companionのTypeScript検査とproduction build成功。全体tscはCORE/records/reflection/explorationの既存型エラーあり。相棒の内部idempotencyKey付与は保持したままhelperの入力型を修正。

既存UI-FRIENDS fixtureへ到達する専用HTMLだけ追加し、写真/座標/複数記録の既存模擬応答を再利用する。新しいmock基盤や起動サーバーは追加しない。実API保存完了の証拠には使わない。

## 地域の知toolbar

QA d264c15 / 390×844でtoolbarが地図に透け、戻る/メニューがブラウザ標準の四角ボタンになっていることを実見。原本07_41_04は白い全幅header＋左戻る＋右丸メニュー。featureのtoolbarを独立クラスにして白背景、44pxのアイコン操作へ修正。API・MapBridge・Sheet高さ58%を維持。変更後の実表示はQA反映後確認する。

友達検索で「はるか」を入力→メニュー→閉じるで同じ値を保持し、focusが元のメニューボタンへ復帰した（QA d264c15/390px）。

## 締切時引継ぎ（追加磨き込み停止）

- PR193: 提出40a940bd52b300d87c17dbf927a6417dc7c5576e、通常merge a96cbc8dcb49a20989394c402b203c108130c38e。友達/コミュニティの単一地図、相棒helper入力型。
- PR199: 提出7d3f0929d466f2e57b6a455c40f4438fda1dfd24、通常merge9c608b23ace7d19ef8438f23c7f547f6ce1c4ae0。地域toolbar/既存preview import/友達fixture入口。QAの5173/API3002同HEAD更新receipt受領。
- 使えると確認した操作: 友達地図390/853で表示Map1枚、横overflowなし。検索下書き→メニュー→閉じるで同値保持。既存fixtureで友達4選択肢/写真2件/共有地点2件表示。地域入口→場所の声カード表示。相棒の設定/取込初期状態、既存sampleで選択2体/3動作プレビュー表示。
- 完成扱いしない: 実API友達通常状態（0件）、原本の全画面一致、未確認5友達画面、knowledge一覧/検索/詳細の修復後目視、相棒ZIP登録・実API保存、原本キャラ一致。モック・fixture表示は保持。
- 新規相棒制作は対象外。健康3ページは余力未実装の判断を維持。新設計/追加磨き込み/成功検査の反復を停止。
- plugins/feature-requestsは #186 / 01a0a32b-b046-7a33-bd15-4d6798d3b938 へ分割済み。先行差分0b0d02aは旧origin/rozwer/173-visual-communityに保全して受渡し済み。旧#173を再claimしない。
- 継続残件は#184。今回の目視境界を残して通常releaseし、Issue全体を完了とはしない。
