# UI-MAP-RECORD-LINK 受入確認

対象: `mattsun/298-map-record-link` の提出commit（PRに記載）。2026-09-25、専用worktreeの `.local/app.sqlite`、本人 `c79dfe1c-a635-4486-8933-7fd7cbbf563c`、Chromium、`390×844` / `1440×900`。`browser.html` は再現用の実APIデータ作成ページで、確認時の地図部分のみ「確認用地図代替」と明示する。下記の往復は製品 `App` / `PersonalMapScreen` / `DailyScreen` と公開 Mapbox token を使った実画面で確認した。

## データと結果

| 条件 | 対象recordId | 結果 |
| --- | --- | --- |
| 日時あり、別場所と同じ日、初回20件外 | `29810000-0000-4000-8000-000000000001` | 初回 `getRecords` の20件には含まれず、`nextCursor=true`。個人地図の「訪れた記録を見る」から `date=2026-09-25&timeZone=Asia/Tokyo&recordId=...0001` へ遷移。追加取得した対象行が展開され、対象本文を表示。ほかの場所の記録は展開されない。 |
| 日時未設定 | `29810000-0000-4000-8000-000000000003` | `recordId=...0003&includeUndated=true&timeZone=Asia/Tokyo` へ遷移。日時未指定の対象行が展開され、本文を表示。今日の日時あり記録も同じ一覧にある。 |

両条件を390pxと1440pxで確認。戻ると `personal-map?themeId=29820000-0000-4000-8000-000000000001` に戻り、テーマボタンは `aria-pressed=true`、選択した場所の詳細カードが残った。カメラは遷移前後とも中心 `139.76,35.68`、zoom `13`、bearing `24`、pitch `35`。viewport変更による `bounds` の差はある。

画面証拠: [dated-map-390.png](dated-map-390.png)、[dated-daily-390.png](dated-daily-390.png)、[theme-return-390.png](theme-return-390.png)、[undated-map-390.png](undated-map-390.png)、[undated-daily-final-390.png](undated-daily-final-390.png)、[dated-map-1440.png](dated-map-1440.png)、[dated-daily-1440.png](dated-daily-1440.png)、[dated-return-1440.png](dated-return-1440.png)、[undated-map-1440.png](undated-map-1440.png)、[undated-daily-centered-1440.png](undated-daily-centered-1440.png)。スクリーンショットにはローカル確認用データが写る。

Mapbox の一部タイル取得エラーが表示された。地図マーカーのポインタ操作はこの状態で遮られたため、ブラウザからマーカー要素の `click()` を呼んで既存の選択ハンドラを実行した。詳細カード内の「訪れた記録を見る」は通常のクリックで操作した。地図のタイル取得とマーカーのポインタ操作はこの証拠では受入済みとしない。

## チェック

- `bun install --frozen-lockfile`: 成功。
- `git diff --check`: 成功。
- `bun run typecheck`: 変更した2画面の診断なし。既存の `server/core/core.test.ts`、`src/features/exploration/flow.ts`、`src/features/friends/screens.tsx`、`src/features/reflection/DiaryScreen.tsx`、`tools/local/dev.ts` のエラーで失敗。
- `bun run contracts:check`: API契約の生成元変更（AI、BIKE、INSIGHTS、ROUTES、THEMES）で失敗。今回API/DBは変更していない。
