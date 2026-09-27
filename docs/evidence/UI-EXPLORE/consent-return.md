# 同意後の対象付き画面復帰

2026-09-27、Issue #10/#136/#102。発見・体験移転から同意画面へ進む際、元のroute.paramsをConsentDraftへ複写し、確認送信/取消の両方で復帰先へ渡す。以前は画面IDだけで戻り、shellの別state keyを開くため対象/結果が見えなくなっていた。

- consent-navigation.test.tsx: 発見のkind/targetId、移転のrecipeIdを保持した取消と確認送信の2件PASS。取消はAPI/送信0回、確認送信1回。APIは制御応答であり実AI受入ではない。
- 変更時のTypeScript全体検査成功。
- 既存live証拠: docs/evidence/EXPLORATION/followup-verification.md、live-discovery-ui.json。旧DBは別端末 /Users/kmattsun 配下にあり、この端末での旧カード再表示は未実施。
- 専用runtime: explore-finish.localhost:5287 strictPort、API3187、.local/acceptance.sqlite と acceptance-demo.sqlite。共有DBは使用しない。
- 実音声/方位、全viewport/参照画像、全実接続受入は未完了。部分修正でIssueを閉じない。
