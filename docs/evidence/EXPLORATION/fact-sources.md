# 発見の根拠定義
2026-09-15に気象庁の公開説明を取得して確認。AI生成のURLを採用しない。
- [雲・大気現象・大気光象について](https://www.jma.go.jp/jma/kishou/know/faq/faq13.html): jma-cloud-white
- [散乱される紫外線](https://www.jma.go.jp/jma/kishou/know/env/uvhp/3-75uvindex_mini.html): jma-blue-sky
二件ともgeneralであり、個別建物・場所・写真の事実を示さない。場所固有の事実はanchor kind/targetId一致が必須。未知のfactKeyや未取得URLは拒否する。
