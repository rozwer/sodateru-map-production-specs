# #189 追加検証（2026-09-25）

専用worktree `visual-records-camera-189`、branch `mattsun/189-visual-records-camera`、基点 `993f5a5`。Chromium（agent-browser 0.18.0）で製品Vite `127.0.0.1:5173` とローカルAPI `127.0.0.1:3190`、`X-Data-Mode: live`、独立した一時DBを使用。写真は `tools/local/demo-media/assets/motoyama-cafe-generated.jpg` と `motoyama-bookshop-generated.jpg` の独立生成素材。原本の写真や実機カメラ撮影ではない。Mapbox設定がないため、製品地図には「地図の接続設定がありません」と表示される。

原本画像 `docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 08_07_53.png`（作成・場所・確認）、`08_07_57.png`（訪問・編集・解釈）、`08_17_53.png`（削除）、`08_12_03.png`（成長）を開き、既存の `*-reference-fixture.png`（原本幅446/432/445、428/426、512px）と `*-390-fixture.png`（390×844）を再確認した。これらは `docs/evidence/UI-RECORDS/visual/` の表示fixtureで、保存通信の証拠ではない。今回の `*-live*.png` は製品画面の実API状態。PCは1440×900。原本と独立素材の写真自体、地図/建物表現は一致しない。

| 画面 | 原本と今回の実状態 | 差分・修正 | 未達/未確認 |
|---|---|---|---|
| record-create（入力・場所・確認） | 原本 `08_07_53`。390px [写真2枚の入力](record-create-photo-390-live.png)、[写真のみ確認](record-confirmation-390-live-photo-only.png)、[PC空状態](record-create-1440-live-empty.png)。本文のみ、場所日時未指定の保存も実APIで確認。候補検索「名古屋駅」7件から選び、訪問チェック、写真2枚を並替えて保存した。 | 開始15:00/終了14:00のエラー後、終了16:00に直しても旧時刻で再送する不具合を再現。初回saveSession固定前に日時を検証して修正。候補APIに検索語と座標を同時送信し、上限20も超えていたので、検索語なら`q+limit=10`、地図なら`category+座標`に分けた。 | 地図上の候補タップはMapbox未設定。訪問履歴の選択、地図カメラからの今回の再撮影、OS拒否、動画、媒体失敗、ソフトキーボードは今回未確認。カメラ受渡しの既存demo実ブラウザ証拠はREADME下段。 |
| record-edit | 原本 `08_07_57`中。[390px公開範囲](record-edit-390-live-visibility.png)、[PC写真2枚](record-edit-1440-live-photo.png)。実APIで本文・用途・公開範囲を変更し、同じrecordIdのreloadで反映を確認。 | 編集に公開範囲/共有先操作がなかったため追加。選んだ友達に宛先がない場合は保存不可。PATCHは公開範囲と宛先を組にする。写真順序は作成時の並替後、APIのposition 0/1と編集画面で保持。 | 気分は製品画面で「未取得」。編集時の媒体部分失敗、409/412競合、訪問付き時刻の保存は未検証/未提供。 |
| visit-confirm | 原本 `08_07_57`左。[390px行った](visit-confirm-390-live-confirmed.png)、[PC](visit-confirm-1440-live.png)。同じvisitIdで「行った」版2→「行っていない」版3→「まだ分からない」版4→「行った」版5を画面保存し、候補状態でreloadを確認。場所訂正欄の開閉も確認。 | 実データの場所・3状態・版を表示できた。原本の写真/地図とは異なり、地図は接続設定警告。 | 別候補への場所訂正は、独立DBに他の保存場所がないため未確認。地図操作も未確認。390pxのdaily-trackから「訪問の確認・訂正」は下部ナビに隠れクリック不能だったため、実APIで得たvisitIdの直URLでこの画面を確認した。DailyTrack本体は#11/#284担当。 |
| interpretation-correction | 原本 `08_07_57`右。[390px](interpretation-correction-390-live-no-insight.png)、[PC](interpretation-correction-1440-live-no-insight.png)。本人原文を保ち、用途「読書」→「休憩」を実API保存、同じrecordIdのreloadで版4・用途を確認。 | この実データにAI insightがないため、解釈未取得を表示し、存在しない解釈の理由保存を無効化した。 | AI解釈ありの実対応ID、理由の保存、競合は未確認。fixtureの解釈文を実AIの出力とは扱わない。 |
| record-delete | 原本 `08_17_53`右。[390px](record-delete-390-live-no-preview.png)、[PC](record-delete-1440-live-no-preview.png)。同一recordIdの実データと一般案内を表示。 | 書き出し不可を明示してボタン無効化。削除/残存リストは個別プレビュー未対応の一般案内と表示した。 | 書き出しAPI/個別削除プレビューは未提供。実削除は行っていない。 |
| growth-result | 原本 `08_12_03`右。[場所あり390px](growth-result-390-live-place.png)、[PC](growth-result-1440-live-place.png)、[場所なし390px](growth-result-390-live-no-place.png)。本人の場所・原文と実APIでの保存状態を表示。 | 場所なしでは「現在の成長を確認できていません」と表示し、成長を捏造しない。 | Mapbox未設定で地図の建物・実成長視覚表現は未確認。 |
| daily-track（旧7画面の7枚目） | 原本 `07_40_51`（CSS約426×922）と`08_08_01`（440×866）。既存[原本幅fixture](daily-track-reference-fixture.png)と[390px fixture](daily-track-390-fixture.png)。今回、[本文のみ保存後](time-fix-daily-track-390-live.png)と[写真のみ保存後](daily-track-photo-390-live.png)を同一IDで表示。 | 写真の記録は日時未指定・場所名・先頭写真を表示。390×844では展開カード下の訪問確認ボタンが下部ナビに隠れ、クリック後も遷移しなかった。#284担当に共有。 | #11/#284の複数地点・地図軌跡・7画面全受入の証拠はまだ揃っていない。今回DailyTrack本体は編集していない。 |

## 実APIでの再現値

- 本文のみ `recordId=cb3b801f-b60c-4770-a8a4-53d017d59706`。15:00→14:00は画面エラー、16:00に修正すると保存成功。daily-trackで1時間、reload後も本文・時刻が同一IDに残った。その後本文/用途/公開範囲を編集し、解釈画面で用途を訂正した。
- 写真のみ `recordId=dcb3af68-7b62-4bcf-b8a7-4d32d8aa82b7`、`visitId=dc65fb91-a488-49e8-b875-66121c46e471`。検索候補「名古屋駅」を選び、写真2枚を入れ替え、訪問「行った」をチェックして保存。`GET /records/{id}` のmediaはreadyで2件、position 0がbookshop、position 1がcafe。daily-track、record-edit、visit-confirm、growth-resultで同一IDを表示した。いずれも一時ローカルDBであり、本番サービスへの保存を示さない。
- 画面操作で候補検索の旧入力契約エラーと時刻再保存エラーを再現し、修正後に画面から再試行した。取得失敗・競合時の下書き保持は今回の実ブラウザでは確認していない。

## 判定

`record-flow.test.ts` 7件、`VisitEditor.test.tsx` 1件、`capture-handoff.test.tsx` 2件（DOMが必要なので`--environment jsdom`指定）が成功。`vite build`成功、`git diff --check`成功。全体`bun run typecheck`は既存の`server/core/core.test.ts`、exploration、friends、reflection、`tools/local/dev.ts`の型エラーで失敗し、今回の編集ファイルの診断はなかった。

原本幅/390pxのfixture比較、390px/PCの製品実API画面、上記の主要保存導線を確認。原本幅のfixtureには実通信がない。200%文字、実機ソフトキーボード、戻り後scroll/focus、動画、OS許可拒否、外部地図表示、409/412と媒体失敗は未確認。旧7画面と追加受入の全達成は主張せず、#189はopenで残す。activityロックは今回のPRを通常mergeした後に正規releaseし、#11/#284の証拠と後続で照合する。
