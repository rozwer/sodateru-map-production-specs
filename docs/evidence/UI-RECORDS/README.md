# UI-RECORDS #11 接続・表示確認

2026-09-15。担当 A / rozwer。**先行実装。Issue 全体は未完了。**

## 対象

- worktree: `/Users/roz/.codex/worktrees/ui-records-11`
- branch: `rozwer/11-records-ui`
- 取り込み済み develop: `6dac91f`（UI-BASE / PLACES / REFLECTION）。提出commitはこの文書を含むPRのHEAD。
- 取得範囲: `src/features/records/`, `src/features/activity/`, `docs/evidence/UI-RECORDS/`
- 各featureの `screens.tsx` をBASEが自動登録。共通API clientを使用し、DTO・業務判定・DBには変更なし。

## 実装

作成の入力→場所選択→確認、同一ID/冪等キーでの再送、媒体ごとの結果保持、本文/用途/感想/しおり/媒体の編集、原文と別の解釈訂正、削除画面、訪問3状態、成長表示の読込、日別軌跡/カレンダー/媒体展開を実装した。日時・場所の未指定を維持し、確認されていない訪問を自動作成しない。日別取得は選択timezoneの境界を使う。画面非表示/本人scope変更時に通信を中止する。

媒体の保存失敗では本文と成功媒体を保持する。POSTの応答喪失は元のID・body・キーで解決し、保存後の変更は同じ記録へPATCHする。時刻を触らない本文編集で既存秒・ミリ秒を丸めない。

## 確認結果

- `CODEX_OWNER=rozwer mise run task:verify`: claimed / 取得3path一致。
- `mise exec -- bunx vitest run src/features/records/record-flow.test.ts`: **4件成功**（11:51 JST）。共通clientへのテストfetch注入で、POST応答喪失・2枚目失敗後再送・日時丸め防止・timezone/DSTを確認。実HTTP/DBの証拠ではない。
- 全体 `mise exec -- bun run typecheck`: 未通過。develop側PLACESのINFORMATION未統合import・配列strict型、および未統合UI-MAPの `MapPreview` / `display-state` が残る。取得範囲外は編集しない。自機能の配列strict型は修正済み。
- ブラウザ: Codex in-app browser、`http://127.0.0.1:5181/docs/evidence/UI-RECORDS/visual/index.html?screen=record-create`。表示専用Vite。DB/person/dataMode/sessionなし、保存API通信なし。画面上部にも表示用テストデータと明示。
- 10状態×320/390/1440pxのDOM幅確認: 全30件でpageWidth=viewport。詳細は [layout-checks.json](layout-checks.json)。320pxの最小高さ740pxも目視確認。
- 作成→確認で本文保持、訪問ラジオ3択、カレンダー/展開カードは実DOM。動画は独立した2秒の表示確認用MP4でreadyState=4確認。
- 編集の文字200%表示を確認し、textarea/counterの重なりを修正。ソフトウェアキーボード・実機タッチ・共通Sheet内の実表示は未確認。

## 参照画像との対応

画像名の接頭辞は `docs/01_requirements/03_pages/references/Codex 画像 2026年9月15日 `。参照画像を画面素材として埋め込んでいない。写真は独立した表示用写真、動画は単色テスト媒体。実地図・建物・本人データが必要な差分は接続後に再確認する。

| 画面/状態 | 指定画像と対象領域 | 確認証拠 |
| --- | --- | --- |
| record-create / editor | `08_07_53.png` 左、446×903 | [画像](screenshots/record-create-446-fixture.png) |
| record-create / confirmation | `08_07_53.png` 右、445×903 | [画像](screenshots/confirmation-446-fixture.png) |
| record-create / place-picker | `08_07_53.png` 中央、432×903 | [画像](screenshots/place-picker-432-fixture.png) |
| record-edit | `08_07_57.png` 中央、426×930 | [画像](screenshots/record-edit-426-fixture.png) |
| interpretation-correction | `08_07_57.png` 右、426×930 | [画像](screenshots/interpretation-correction-426-fixture.png) |
| visit-confirm / rejected selected | `08_07_57.png` 左、428×930 | [画像](screenshots/visit-confirm-428-fixture.png) |
| record-delete | `08_17_53.png` 右1/3、512×1024 | [画像](screenshots/record-delete-512-fixture.png) |
| growth-result | `08_12_03.png` 右1/3、512×1024 | [画像](screenshots/growth-result-512-fixture.png) |
| daily-track / expanded record | `07_40_51.png` 全体853×1844を約1/2表示 | [画像](screenshots/daily-track-426-fixture.png) |
| daily-track / calendar | `08_08_01.png` 左、440×866 | [画像](screenshots/calendar-440-fixture.png) |

修正した差分: 編集textareaの高さ、写真追加の隣接配置、訂正用途の折りたたみ、理由欄の横並び、原文と解釈の分離、確認画面の媒体幅比。ブラウザ/OS自身のステータスバーは製品DOMに複製しない。カレンダーの曜日は実際の選択年に従う。

## 完了まで残る接続

1. **RECORDS #20 / CORE #3**: POST/GET/PATCH/media/HTML export/deletion-previewの正式HTTP統合を取り込み、手入力→保存→reload→同一ID編集→日別再表示を実DBで確認する。HTML export/deletion-previewは共通clientの正式operation待ち。現状の書き出しボタンは未対応を明示し、成功扱いしない。
2. **気分/訪問時刻**: [契約差分](https://github.com/rozwer/sodateru-map-production-specs/issues/11#issuecomment-5673428148)。気分は無断のwire fieldや感想への混在をせず未取得。訪問付き記録の時刻保存は正式binding待ちで入力を保持し明示する。
3. **UI-BASE #4**: ローカルstepタイトルと共通Sheet headerの重複防止へ `layout.header:none` を依頼中。daily-trackの下部navは参照画像に従う。
4. **UI-MAP #8**: 正式 `MapPreview` と `showGrowth(bridge, GrowthItem[])` をbind。未統合。実ジオメトリ/成長stage/用途、元place選択、欠測segmentの非接続をカード内で確認する。
5. **ACTIVITY / INFORMATION / INSIGHTS / REFLECTION**: 訪問取消・用途訂正・削除後の成長と根拠の再取得、訂正理由、振り返り復帰、selected/publicの本人scopeを実接続で確認する。
6. 参照画像との最終照合・共通Sheet/キーボード/実データ失敗状態・独立担当の軽量レビュー・PR統合・task:finishを行う。

この先行PRだけでboard done、Issue close、機能完了とはしない。
