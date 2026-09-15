# 保存接続の検証

## 実HTTP/API
api-audit.tsをgenerated clientで共有3002へ接続。2026-09-15、demo DB=/Users/roz/.codex/worktrees/qa-visual-40/.local/demo.sqlite、profile=self、personId=0f40f7ee-ed3e-493a-a904-a2a72bd585e2。運用担当確認の共有HEAD18cd9df、5173/3002継続稼働。

api-audit.jsonに全method/path/status、ID/version、取得時刻を保存。candidate非成長→confirmed+1、同visitに複数recordでも+1、purposesだけPATCHして本文保持、未知用途原文保持、版競合412 VERSION_CONFLICTで変更なし、candidate/rejectedで成長除外、場所訂正で旧件数減/新件数増、record削除でvisit数保持、visit削除でrecord本文保持/関連解除、liveからdemo訪問404をPASS。

QA場所A/Bは既存postPlaces manualで保存した明示デモの地点であり、実建物対応/実地訪問の証拠ではない。ブラウザ用candidate 7f43f9d5-2abe-4d40-b297-42ef06759a3d とrecord 147ae580-ae1e-40b9-953b-440cd573922cを残した。

## 実装検査
- VisitEditor DOMテスト：候補閲覧だけでPOSTしない、候補POSTと確認PATCHは別、409失敗で通知なし、選択下書き保持・現在版2再取得・再保存成功通知。
- record-flow 6件成功。capture-handoffはjsdom指定で2件成功（初回の環境未指定はdocument undefinedで失敗）。
- vite build成功。
- 全体tscはCORE FeatureRequestCreate.displayName、exploration requestId、reflection version、tools/local/dev undefinedの既存エラー。担当records testのRecordCreate unknown消費は修復、records/activity型エラーなし。

## 配信/ブラウザ
最初PR #240は198c991でmerge、運用担当が18cd9df（包含）へ反映済み。候補/訪問/用途修復の本PR配信後の実操作は追記する。再起動復元・実建物着色・style/カメラ維持は#222共同QA待ち。元#11/#135の全体受入を本Task成功だけでcloseしない。

## 担当終了時点（2026-09-15）

- PR #240: 提出1b49029、merge198c991。QA #217が固定HEAD4a73522、既存demoの1536×1024/390×844で中央カメラ→coffee.jpg→本文→確認→編集を成功。PCフォーム446px・left545、mobile formWidth/scrollWidth/innerWidth=390。写真/本文保持、console error/warnなし。保存/削除なし。
- PR #249: 提出9b1f22e、merge1b2d328。共有配信batchへ運用担当が受領済み。保存側型・ビルド・実API証拠は上記。VisitEditor DOM競合と6件保存テスト成功。
- 共有APIを使う独立5268プレビューから候補詳細を開いたが、2026-09-15 13:44 JSTに3002接続拒否、続いてhealth503。保存操作は行わず停止した。これは実ブラウザ保存成功の証拠に数えない。専用プレビューはMapbox設定未導入で接続設定なし表示、実建物の受入には使わない。
- SQLite read-only確認でcandidate 7f43f9d5-2abe-4d40-b297-42ef06759a3d version1、record147ae580-ae1e-40b9-953b-440cd573922c version1、関連と本文/カフェ用途がAPIと一致。

## 再開条件と残る担当

QA #217/地図 #222：共有5173/3002が#249を含む固定HEADで復旧後、上記候補ID→本人confirmed→記録用途訂正→取消→場所訂正を画面から一度操作し、実建物旧新色と同ID/version再取得を確認。409/412の下書き/現行版はDOMテスト済み、実ブラウザでは未確認。再起動後同じ建物/根拠の復元は未確認。実建物側の別IDは#222が所有：place e4d76d9b-e299-496a-b710-ecd9e0eb3d4a / candidate631db5ae-b3e2-49ec-9d6e-68b522fdcacd。

BUILDING-RECORDSは実装/2PR統合済みだが実ブラウザ保存の最終受入を残してrelease。#228を完了として閉じない。#11/#135は元UI全体・媒体部分失敗/共有削除波及/書出し/insight異議/日別軌跡などを含め未達のまま。ユーザーの収束指示に従い追加磨き込み/全体待機は行わない。
