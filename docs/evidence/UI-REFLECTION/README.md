# UI-REFLECTION #12 実装と接続の確認

## 状態

6画面のDOM/CSSと共通クライアント接続を実装中。**Issue未完了・実API保存未達**。

専用branch `rozwer/12-reflection-ui`、worktree `/Users/roz/.codex/worktrees/ui-reflection-12`。編集対象は `src/features/reflection/` と本証拠ディレクトリ。共通Shell/クライアント/サーバーを変更していない。

## 実装

- `screens.tsx` が self-home / diary / reflection-question / reflection-history / experience-compare / memo-edit の6画面を提供。UI-BASEの自動登録、ScreenProps、useScreenState、api singletonを使用。
- 本人/モード別の入力保持、非activeで要求と監視を取消。日記は日付ごとに下書きと媒体差分を保持。同日複数日記は選択する。
- 日記は初回POSTと既存PATCHを分け、作成ID/再送キーを保持。写真追加・削除後にGET。AI出力は別提案として保持し、本人追記を上書きしない。採用後の保存でREFLECTIONの採用APIへ送る。
- 質問はpending/later/skipped/answeredを表示状態へ明示変換。回答原文保存とAI整理・選択採用は別操作。
- 二体験比較は左右のrecord ID/版と共通点・違い各100文字を保存。メモはTHEMESの確定memo fieldとbody/useForSuggestionsへ接続。
- 由来を外す操作とメモ本文削除を分離。メモ名20、本文200、キーワード80文字/50件。実文字数はUnicode文字単位。

## 参照画像

次の設計画像を実際に開いて確認した。画像を製品の背景・カード・写真として使用していない。

- `03_pages/references/Codex 画像 2026年9月15日 07_40_36.png`: 自分を知る。
- `03_pages/references/Codex 画像 2026年9月15日 08_08_05.png`: 質問・履歴・日記。
- `03_pages/references/Codex 画像 2026年9月15日 08_11_42.png`: 右列の二体験比較。
- `03_pages/references/Codex 画像 2026年9月15日 08_11_58.png`: 右列のメモ編集。

## 確認済み（2026-09-15）

- 取得元develop `6dac91f` 上でVite production build成功。出力 `/tmp/ui-reflection-12-build`。
- 確定THEMES 1.0.0 / REFLECTION 1.0.0を共通生成器で一時領域へ合成したstrict検査では、既知の任意If-Match生成問題を除く機能コードの型エラーを解消。正式統合版の全typecheck成功は未達。
- 表示fixture入口で390×844の実ブラウザ操作: メモ名20文字で停止、キーワード追加、提案利用ON/OFF、由来解除、履歴のあとでfilterで対象1件のみ表示、日記入力カウンター。
- 日記・メモ・履歴・比較のカード/入力/ボタンを参照と目視比較。写真は未設定状態であり、写真あり状態の完全一致は未確認。
- 専用API `127.0.0.1:3012` 起動とgetSessionProfiles → postSession → 日記GETの実ブラウザ接続を確認。業務features=[]のため日記GETは404。保存ボタンは無効、エラーと再試行を表示。**保存成功の証拠ではない**。

## 再現入口

```sh
SODATERU_PORT=3012 SODATERU_DB_PATH=.local/ui-reflection-live.sqlite SODATERU_DEMO_DB_PATH=.local/ui-reflection-demo.sqlite SODATERU_PROFILES_PATH=.local/ui-reflection-profiles.json mise exec -- bun run start
SODATERU_API_ORIGIN=http://127.0.0.1:3012 mise exec -- bunx vite --host 127.0.0.1 --port 5182 --strictPort
```

- `http://127.0.0.1:5182/docs/evidence/UI-REFLECTION/index.html`: **表示fixture・API未接続**。ページ切替とローカル入力の確認専用。保存成功を返さない。
- `http://127.0.0.1:5182/docs/evidence/UI-REFLECTION/live.html#/diary`: 実API確認。共通apiで登録済み本人を開始し、共通Appに6画面を渡す。
- `http://127.0.0.1:5182/#/diary`: 本番の自動登録入口。

保存先は本worktree `.local/ui-reflection-live.sqlite` / `.local/ui-reflection-demo.sqlite`、本人設定は `.local/ui-reflection-profiles.json`。主cloneの既存DB/.envは触っていない。

## 残る受入と依存

1. COREのTHEMES/REFLECTION生成型反映、任意If-Matchの生成・送信対応（#3へ連絡済み）。REFLECTION採用v1.1.0のexpectedAttemptへ追随。
2. RECORDS/INFORMATION/REFLECTION/THEMESの業務API統合。同じ保存先で日記/回答状態/比較/メモの作成→編集→再読込→プロセス再起動GETを確認。
3. AI生成中の本人追記→明示採用→保存、失敗/取消/再試行、元記録訂正・削除の説明を実APIで確認。
4. self-homeの実MapPreview統合と診断プレビュー。画像4趣味軸と既存6生活行動軸は意味が異なるためUI-INSIGHTS #13の確定表示契約へ接続する。独自置換しない。
5. UI-BASEのself-home固有header、写真あり表示、320px/desktop/200%文字/キーボード、全遷移先の同一統合版による最終照合。
6. PRレビュー・統合、task:finish、board done、path解放、Issue close。部分提供だけで完了処理しない。
