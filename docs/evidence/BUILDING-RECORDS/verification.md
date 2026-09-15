# 保存接続の検証

## 実HTTP/API
api-audit.tsをgenerated clientで共有3002へ接続。2026-09-15、demo DB=/Users/roz/.codex/worktrees/qa-visual-40/.local/demo.sqlite、profile=self、personId=0f40f7ee-ed3e-493a-a904-a2a72bd585e2。運用担当確認の共有HEAD18cd9df、5173/3002継続稼働。

api-audit.jsonに全method/path/status、ID/version、取得時刻を保存。candidate非成長→confirmed+1、同visitに複数recordでも+1、purposesだけPATCHして本文保持、未知用途原文保持、版競合412 VERSION_CONFLICTで変更なし、candidate/rejectedで成長除外、場所訂正で旧件数減/新件数増、record削除でvisit数保持、visit削除でrecord本文保持/関連解除、liveからdemo訪問404をPASS。

QA場所A/Bは既存postPlaces manualで保存した明示デモの地点であり、実建物対応/実地訪問の証拠ではない。ブラウザ用candidate 7f43f9d5-2abe-4d40-b297-42ef06759a3d とrecord 147ae580-ae1e-40b9-953b-440cd573922cを残した。

## 実装検査
- VisitEditor DOMテスト：候補閲覧だけでPOSTしない、候補POSTと確認PATCHは別、409失敗で通知なし、選択下書き保持・現在版2再取得・再保存成功通知。
- record-flow 5件成功。capture-handoffはjsdom指定で2件成功（初回の環境未指定はdocument undefinedで失敗）。
- vite build成功。
- 全体tscはCORE FeatureRequestCreate.displayName、exploration requestId、reflection version、tools/local/dev undefinedの既存エラー。担当records testのRecordCreate unknown消費は修復、records/activity型エラーなし。

## 配信/ブラウザ
最初PR #240は198c991でmerge、運用担当が18cd9df（包含）へ反映済み。候補/訪問/用途修復の本PR配信後の実操作は追記する。再起動復元・実建物着色・style/カメラ維持は#222共同QA待ち。元#11/#135の全体受入を本Task成功だけでcloseしない。
