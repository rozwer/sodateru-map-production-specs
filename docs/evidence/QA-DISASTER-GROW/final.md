# 最終確認 — QA-DISASTER-GROW #217

## 記録の主要保存

- 配信HEAD `04bdbceec67f76dabee5b945a1e317f8c6e5e4fa` を開始・終了で確認。
- 既存demo本人、390×844、既存coffee.jpg、本文「QA-DISASTER-GROW 最終受入：写真付き記録の保存と再表示。」、場所/日時未指定、公開範囲「自分だけ」で保存。
- `recordId=ff147c28-0796-4766-b59c-2045aac1b48b` の今日の軌跡へ遷移。reload後、同本文・写真1を再表示。
- `.local/demo.sqlite` をread-onlyで確認。同ID、version=2、本文一致、visibility=private。記録は削除せず残した。live領域には投稿しない。
- 画像 `final-record-saved-390.png`。保存前の両幅入力は `record-entry.md` のPR240節。

## 境界

写真付き記録の保存・再表示は確認済み。場所/訪問の確認から建物着色、全record用途訂正、live領域の保存は本検証に含めない。
