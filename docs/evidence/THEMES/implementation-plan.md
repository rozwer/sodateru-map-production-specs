# THEMES #37 実装計画

仕様: docs/03_issue/issues/THEMES.md と最新GitHub #37本文・コメント。
目的: テーマの表示属性と所属、由来付きメモ、AI命名の本人採用を永続化する。
構成: server/features/themes/ の検証・SQL・register.ts、固有migration、THEMES.json断片。Hono/Node SQLiteのCORE登録入口を利用。

- [ ] manual: 同名別ID、本人記録所属、7色・写真の一括更新、版競合、削除後再取得をDB/HTTPで確認。
- [ ] presentation: colorKey=teal,pink,orange,yellow,green,blue,purple。coverMediaIdは本人のready写真の媒体ID。元媒体削除でnullへ更新。元記録削除時の所属除去もテーマ版更新。
- [ ] memo: records.kind=memoを正本とし、name/originRefs/keywordsを付加表で構造化。body/useForSuggestionsは既存列。保存・由来変更をrecord版と同一transactionに接続。由来元削除で本文保持。
- [ ] ai: 共通theme用途・実行/保存結果へ接続。候補取得でテーマを更新せず、本人採用時のIf-Matchと根拠版確認を実施。
- [ ] integration: CORE/RECORDS/INFORMATION/AIの統合commit・契約版を確認して実APIで再起動再取得。UI担当へ応答例を提供。
- [ ] delivery: 短い独立レビューを指揮元へ依頼。許可済みcommit/push/PR/develop merge。全受入が満たされた場合だけtask:finish。

制約: claim path外編集なし、共有HTTP・根拠権限を複製しない。先行提供でIssue全体を閉じない。本セッション内で実装しサブエージェントは使わない。
