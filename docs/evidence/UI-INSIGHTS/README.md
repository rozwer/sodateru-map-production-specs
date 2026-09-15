# UI-INSIGHTS #13 — 5画面の実装と接続状況

2026-09-15。担当branch `rozwer/13-insights-ui`、専用worktree `ui-insights-13`。画面確認の基準は `6dac91f`（UI-BASE先行版）、正式コミット時の統合基準は `2332231`。先行実装commit `0ae3b77`。**Taskは未完了。画面のテスト応答確認と実APIの受入は別。**

## 実装

- `src/features/insights/screens.tsx`：type-diagnosis / trend-evidence / trend-review。共通apiと画面状態に接続。IANAタイムゾーンの今日・月曜始まりの週・月・全期間を作り、同じ期間のsummary/insightと根拠を表示する。
- 3択と理由200文字は保存まで下書き。作成ID/再送キーを保持し、If-Match競合時は最新の判断と入力を並べる。source-checksで変化した引用を隠し、更新対象を示す。
- `src/features/themes/screens.tsx`：themes / theme-edit。名前20・説明100・7色・複数recordIds・coverMediaIdをまとめて保存しGETで確認。テーマ削除は元記録を削除しない。地図へ同じthemeIdを渡す。
- 既存ready写真を選択可能。新規写真は追加先の記録を明示し、保存時だけ添付する。再送では写真ID/キー/位置/親versionを保持。写真だけ追加済みでテーマ保存が不明な場合を明示する。
- `active=false`で読取を中断。編集中の下書きは共通useScreenStateへ保持し、再表示で再取得する。

## 指定画像との対応

画像は `docs/01_requirements/03_pages/references/` の原本を実際に開いて確認。

| 対象 | 原本 | 反映した構成 |
| --- | --- | --- |
| タイプ診断 | Codex 画像 2026年9月15日 07_40_47.png | 見出し、期間タブ、5軸図、仮の呼び名、根拠カード、3択 |
| 根拠・訂正 | Codex 画像 2026年9月15日 08_11_42.png 左・中央 | 根拠/別の見方/不明の区分、記録、選択、理由、保存 |
| テーマ一覧・編集 | Codex 画像 2026年9月15日 08_11_58.png 左・中央 | カード、写真、7色、所属記録、写真変更、保存/取消 |

白カード・青緑の操作面・余白・文字・区切りを原本に合わせた。写真はfixture内の独立したUnsplash画像で、画面原本の切り抜きは使っていない。本番は媒体APIの写真を表示する。削除操作はIssue要件に従い追加し、同じ画像シートのメモ編集の削除表現に合わせた。

## 確認済み

- 純粋View＋previewのstrict TypeScript確認：成功。
- UI-BASE統合版と、正式なTHEMES.json 1.0.0を共通生成器で一時領域に合成した型による、screens/dataのstrict確認：成功。共有生成物は変更していない。
- `mise exec -- bunx vitest run src/features/insights/periods.test.ts`：3件成功。日本の日付/週、NYの23/25時間日、全期間と遷移条件。
- `mise exec -- bunx vitest run src/features/themes/photo-save.test.ts`：4件成功。応答喪失の同一再送、pending媒体のGET確認、媒体一覧失敗時に送信しないこと、412確定後の最新親version/位置の再取得。
- 実ブラウザの純粋View5画面：390px/320px/文字200%で横はみ出しなし。`layout-*.json`、`screenshots/`へ保存。
- テーマ編集の名前・色を変更→保存失敗のテスト応答→入力保持→取消→元の一覧に復帰を操作確認。`theme-failure-390.png`。
- 空の診断・欠測軸の不明表示・根拠更新時の古い引用/写真/推測の非表示をブラウザ確認。`empty-diagnosis-390.png`、`changed-evidence-390.png`。
- 共通Sheetにテーマ編集を載せ、既存写真変更→端末PNG選択→追加先表示を操作確認。アップロードやDB保存の証拠ではない。

## 残件と受入境界

1. **INSIGHTS #34**：画像5軸の根拠/分母、仮の呼び名、別説明の正式契約と実APIが未提供。6軸を改名したり活動名から推定していない。現接続コードはこの表示データを空として扱い、受入未達のまま。rangeStart/rangeEnd/timeZone完全一致filter提供後、cursor全走査を置換する。
2. **THEMES #37 / CORE #3**：1.0.0断片は統合済みだが、現developの共有generated ThemeにcolorKey/coverMediaIdが未反映。現develop型だけのscreensチェックはこのfield不足で失敗する。型/HTTP/migration登録とRECORDS媒体APIの提供後、live保存→再取得→再起動再取得を確認する。
3. **UI-BASE #4**：共通Sheetのbody20pxとfeature余白が二重。390pxのtheme-editで入力左端x49、`theme-edit-shell-390.png`。診断は中央headerと本文見出しも重複。contentPadding:none/header表示境界を依頼済み。担当外CSSの上書きはしていない。
4. 期間/根拠/判断の実API保存、元記録変更後の再表示、テーマ所属変更後の地図絞込、写真取消/失敗/削除、空状態/権限喪失/競合、再起動後の保持を同じ本人・mode・DBで確認する。現在は達成を主張しない。
5. peer reviewはQA-VISUAL #40へ依頼済み。共通guard修復PR #63を取り込み、通常task:verifyとコミット0ae3b77が成功（#62）。developへの実装統合、task:finish、Issue終了は未実施。

## 表示確認用の起動

```sh
mise exec -- bunx vite --config docs/evidence/UI-INSIGHTS/preview/vite.config.ts
```

- `http://127.0.0.1:5178/docs/evidence/UI-INSIGHTS/preview/?page=theme-edit`：明示したテスト応答だけの5画面。`case=empty/loading/error/failure/changed/missing`、`text=200`。
- `http://127.0.0.1:5178/docs/evidence/UI-INSIGHTS/preview/shell.html#/theme-edit`：共通枠への組込照合。**保存ボタンはAPIへ送信しない**。

本番入口はUI-BASEが各featureのscreens.tsxを自動登録する。preview/fixturesは本番入口からimportしない。
