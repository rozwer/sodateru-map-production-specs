# 承認済み記録の自然文集計と正式投入準備

## 提供物
- 最終素材: self-type-diagnosis-grounded-demo.json。原文5場面と許可された補完9件、9/2〜9/15。
- 原文出典: rehearsal-self-sample-texts.json。9/10の時刻・名古屋地名・本文を保持。
- 別出典: rehearsal-self-db-data.json。明示demo/sampleのみの読み取り専用抽出。20件の同一人物を期間集計へ混ぜない。
- 正式API payload/固定ID/出典対応: grounded-record-import.json。
- 実HTTP証拠: grounded-http.json。隔離SQLite/CORE/RECORDS/INFORMATION/INSIGHTSの実処理。実AIの呼出しではない。
- self-type-diagnosis-mock.jsonは旧中間稿。最終表示素材には使用しない。

## 修正
旧分類は完全一致の短文だけを受理し、今回の14本文は認識0件だった。自然文の完了形・接続形と明示カテゴリ否定を追加し、原文引用を保つ。場所カテゴリ、用途だけ、願望、質問、他人/伝聞、未実現、朝/夜だけの否定は日全体の体験判定へ変換しない。単独の「本を読まなかった」は本探し等を否定しないので不明。「本を読む・探すこと」は補完文で明示された本との関わりのカテゴリとして扱う。複雑な自由文すべてを理解する処理ではなく、対象外は不明となる限定的な認識規則。

本文は変更しない。9/10のカフェ名+ラテ/過ごした空間、鶴舞公園+散歩/緑の文脈の2場面だけ、既存activitiesへ「カフェで過ごす」「自然に触れる」を対応付ける。これは出典付きの編集上の正規化であり、AI抽出/本人入力とは扱わない。対応理由はmanifestへ保持し、score/daily配列はAPIへ投入しない。

generatorVersionはinsights-fixed-five-4。入力定義が変わるため旧定義の保存結果を再利用しない。API契約自体の追加はない。

## 確認
- daily-evidence.test.ts: 既存要件、14件の実集計、願望/部分否定/他人/質問、否定スコープ/時間限定の回帰5件PASS。
- レビュー指摘の「本を読んだわけではない」と「朝は散歩しなかった」の誤判定を修正し、回帰テストで確認。
- grounded-http.test.ts: demo/selfの正式Record POST/GET、各POST同一ID/key再送、Summary GET、3期間のInsight POST/GET、DB再開後一致、既存レコード保持PASS。
- 原文14件の本文/活動/精度保持、重複なし（元の1件+14件=15）。
- 対象strict TypeScript検査PASS。
- JSONの原文5+補完9/daily70/参照切れ0/前後7日/分子6,8,6,8,4・分母各10・不明各4の整合確認PASS。

## 共有デモ投入
現在は未投入。共有サーバ復旧と#105管理者・撮影操作との調整後だけ実施する。既存demo/self cookieを使い、manifestの固定ID/key/payloadで追加する。既存IDは上書き/削除しない。from=1788274800000、to=1789484400000、Asia/Tokyoの半開期間。時刻のない9件は日付の00:00をapproximateなアンカーにし、元time:nullと意味をmanifestへ残す。24時間滞在や正確な訪問時刻を主張しない。場所IDを捏造せず未指定とし、元地名は出典へ残す。

既存demo/selfに同期間の別記録があれば実APIはそれも含む。上記期待値へ合わせるために既存記録を隠す/消すことはしない。

POST /insightsはid/from/to/timeZoneから再計算する契約。素材の編集上の人物名/説明/おすすめや手計算dailyを自由注入しない。現行の実result.provisionalName/axes表示は#140の責任範囲で、確認時点board255では#140/#13はbacklog・取得なし、develop e8bf8e4のUI data.tsもtitle:null/axes:[]。データ投入だけをUI表示完了や実AI成功と扱わない。
