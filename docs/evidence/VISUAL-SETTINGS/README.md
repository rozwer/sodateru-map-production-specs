# VISUAL-SETTINGS #191 — 参照照合と部分修復

## 実装・検査の基点

- thread: 01a0a32b-b082-7671-82bc-ff990db1a9fa
- branch: rozwer/191-visual-settings。基点 daa63267847821a3f99ba033d549e7cfe1451bf9。
- 取得: src/features/settings/、src/features/health/、docs/evidence/VISUAL-SETTINGS/。旧 #17 返却後、標準task:worktreeでclaim/guard成功。
- 原本: docs/01_requirements/03_pages の5画面 page/components/states/requirements/acceptance、common.json。08_23_29 / 08_08_01の実画像を開いて照合。
- ローカル修正ビルド: Vite 127.0.0.1:5187、API proxy 127.0.0.1:3002。通常入口 `/#/profile-settings` と検査入口 `/docs/evidence/VISUAL-SETTINGS/preview/index.html#/profile-settings` を分離。

## 1画面1行の照合表

|画面|参照|実状態|差分|修正・検査|未確認・残件|
|---|---|---|---|---|---|
|settings|08_23_29左 main、仕様領域512×1024|通常APIデモと検査応答、390×844・512×1024|外側地図あり、健康入口なし、見出し位置/余白に差|この登録のみfullscreen。メニュー/概要をDOMで表示、プロフィール遷移。390px document幅390・card幅366|健康入口は余力未実装。参照は実端末枠397pxで仕様領域512pxには外余白を含むためピクセル一致とはしない。見出し位置未一致|
|profile-settings|08_23_29中央 main|写真・名前・紹介・標準選択の検査応答、390/512。実APIデモは写真なし|未設定プロフィールでは通常状態と異なる。写真素材/特大選択肢/写真削除/端末権限表示は参照と異なる|fullscreen。独立公園写真のBlob表示例。実APIデモで名前・紹介保存→GET→reload→設定から再表示・DB確認。検査応答で文字サイズ変更も再表示|写真の実API保存、live DB、サーバー再起動、200%/320px/キーボードは未検査。参照のアジサイ写真そのものは未提供|
|suggestion-settings|08_23_29右 main|onOpen・90日・停止済場所/活動・独立コーヒー写真、390/512|旧表示は写真なし。個別更新時刻なし。390では下部がスクロール外|fullscreen。PlaceDetail.photosがある場合表示、未取得/読込失敗はアイコン。解除→保存→reload後0件を検査応答で確認|停止項目の個別更新日時はSettings DTOにない。実API demoへの停止場所/写真投入と実API解除は未確認|
|activity-stats|08_08_01中央 week、440×866|検査応答のみ、訪問4/新しい場所2・活動2種類・GPS未取得、390/440|製品画面登録なし。歩数グラフ/平均なし。GPSと活動内訳は非健康の既存部品|既存表示部品を同じpreview入口へ組込み、週選択/0件切替/取得元遷移を確認。未測定GPSは0でなく未取得|正式統計operation/DTO・本番登録・実APIは未接続。health歩数は余力未実装。履歴/記録詳細のpreview callbackは代替画面で受入対象外|
|data-sources|08_08_01右 sources、440×866|検査応答の訪問/観測線/期間/取得時点、390/440|製品画面登録なし。健康取得元/連携管理なし。写真付きソースカードの意匠差|既存SourcesViewを同じpreview入口へ組込み。GPS未取得と0除外の説明、期間・訪問元を確認|正式統計operation/DTO・本番登録・履歴遷移未接続。健康連携管理は未実施|
|health-connect|健康連携画面|未実施|全体未実装|ユーザーの「余力で着手」を保持|実装済み/受入合格に数えない|
|health-permissions|健康許可画面|未実施|全体未実装|ユーザーの「余力で着手」を保持|実装済み/受入合格に数えない|
|health-status|健康取込状態画面|未実施|全体未実装|ユーザーの「余力で着手」を保持|実装済み/受入合格に数えない|

## 検査と証拠の範囲

- `preview/` は既存 UI-SETTINGS previewを延長した検査専用入口。製品はimportしない。常時「UI検査用のテスト応答・実API未接続」とデモを表示。sessionStorageはこの検査応答だけの再読込確認用で、DB保存ではない。
- 画像は既存UI-INSIGHTS previewに出典のある独立Unsplash写真を利用。参照UI画像/カードを切り抜いて使っていない。写真取得失敗時はアイコンへ戻す。
- プレビュー統計値はUI用StatisticsViewであり正式API応答ではない。`getReflectionActivityStatistics`は基点の生成client/OpenAPIに存在せず、`getReflectionSummary`のSummary型は5軸result/sourceRefsのみ。server/features/insights/statistics.tsの関数の存在だけをAPI提供と扱わない。UIで独自業務集計を追加しない。
- 実API検査はdemoだけ。`demo-save.json` はブラウザ保存→再取得→再読込→戻る/再表示と、読み取り専用SQLite照合。API PID 21178 / cwd qa-visual-40 / `.local/demo.sqlite`。保存先本人 `0f40f7ee-ed3e-493a-a904-a2a72bd585e2`、version 2。実装確認のためdemo表示名を「自分」→「さやか」、紹介を空→「カフェや本、緑のある場所が好きです。」へ補完。live DB保存/再起動耐性とは別。
- `bunx vite build` 成功。設定+preview入口に対するstrict TypeScript検査成功（node,vite/client、noUncheckedIndexedAccess）。`git diff --check` と `CODEX_OWNER=rozwer mise run task:verify` 成功。
- リポジトリ全体 `bun run typecheck` は既存COREテスト/companion/exploration/friends/records/reflectionの型不整合で失敗。設定範囲にエラーなし。全体合格とはしない。
- 390/512/440のPNGは検査応答。`profile-demo-api-390.png` だけ通常製品入口のdemo DB再表示。スクリーンショットだけで全一致や実接続完了と判定していない。

## 残件の委譲

このIssueは5画面の全受入未完。統合後もfinishしない。提出commitを保存し通常releaseでpath返却、受信解除する。

1. #172 Shell窓口へ不足を一括連絡済み（comment 5674463052）。検査用person/settings通常値・独立写真、統計の正式operation不足を渡した。通常demoの永続seedはShell/非UI担当へ委譲。本PRは共通Shell/messages/契約を変更しない。
2. CONNECT-SETTINGS #145 / INSIGHTS担当へ引継ぐ接続残件: 統計正式DTOの提供後、既存ActivityStatsView/SourcesViewへ変換して2画面登録。参照に根拠があるこの2画面だけpresentation=fullscreenを選ぶ。件数/場所数の単位も正式DTOに合わせる。from/to/timeZone、欠測、最終取得時点、元記録IDの遷移を保持する。
3. 健康3画面は着手しない。未提供写真や個別更新時刻を固定値として製品へ加えない。
