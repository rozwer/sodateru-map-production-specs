## 変更

京都のカフェ検索が居酒屋候補を返し、二案の必須喫茶店ステップが不成立になっていました。TRANSFERの共通検索queryをカフェのカテゴリ指定にし、実際のカフェ候補を渡します。変更は固有adapterの2行です。

## 実接続確認

正式server/app/main.ts、実Nominatim/Mapbox/共通gpt-5.6-lunaで、公園→喫茶店のレシピ保存・二案生成・faithful採用・共通経路保存が成功。OS再起動後に同じ採用計画と同じ順序の保存経路を取得し、元記録が変わらないことも確認しました。

証拠: docs/evidence/TRANSFER/integration-acceptance.md / plans-http.json。Q10実画面受入はUI #10に残ります。

Refs #109
