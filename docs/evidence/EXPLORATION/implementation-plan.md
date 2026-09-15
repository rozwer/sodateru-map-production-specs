# EXPLORATION 実装計画
仕様: Issue #26 / 共通AI 04_map-dialogue / 根拠03_evidence / conversation-history。
承認済み依頼の範囲で、dialogueとdiscoveryの二提供単位を実装する。UIは#10。
- [ ] dialogue: 同一本人/modeの実行排他、固定起点、直近4往復、15分/直近6結果、取消/遅着排除を実装しテスト。
- [ ] discovery: 共通AIの完了Runを採用しSQL保存、出典とSourceRef再照合、反応再送、saved一覧/非表示/再取得を実装し実SQLiteで確認。
- [ ] consult-history: 一時候補を永続化せず、共通保存会話IDとの期限付き関連と日付/検索/復帰契約を断片化し#3/#7/#10へ提供。
- [ ] 共通CORE/AI/PLACES/ROUTES/INFORMATIONを統合commitから接続しHTTP→保存→再起動→再取得を検証。
- [ ] 証拠を残しdevelop向けPR提出。司令塔の独立レビュー後に統合、board/lock/Issue完了条件を確認。
共通Schema/実行器/DB接続/HTTP基盤は複製しない。未提供接続は実接続済みと記載しない。
