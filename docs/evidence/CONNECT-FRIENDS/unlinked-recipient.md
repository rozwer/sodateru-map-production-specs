# picker完了後・保存前の友達解除（#142）

2026-09-27。正式claim unit=sharing-save。製品変更はscreens.tsxの保存前確認のみ。

原因は未実装の再確認境界。picker完了時のaccepted情報だけを使い、保存時は新規共有相手の友達関係を再取得していなかった。

通常main/API3115（PID32429）、Vite strict5292（PID32474）、双方cwd=/Users/roz/Documents/sodateru-connect-friends-round2。友達担当固有friends-connect.localhostを使用。前周保全の専用DB /Users/roz/Documents/sodateru-connect-friends-0927/.local/friends-acceptance/live.sqlite を再利用。実データ・実APIでありmockなし。

再現: 通常共有画面でpicker→bob選択→完了→保全friend-boundary.mjsで相手本人としてDELETE friendship→共有する。修正前はprivate v4からselected v5へ変わり、解除済みbobへ新規共有された。

修正: 新たに追加するsharedWith IDがある時だけ、既存friendships()で全ページのacceptedを保存直前に取得。不一致ならPATCHせずエラーと下書きを保持する。既存selectedの同じ共有相手は再認可対象にしない。バックエンドの指定共有と友達関係が独立の契約は変更なし。

確認: 修正後、同じ実操作でprivate v7が版・範囲・sharedWith=[]すべて不変。画面は選択1人と未保存下書きを保持し「友達関係が変更されています…選び直してください」を表示。pickerへ戻ると解除済み相手を外せる。対照として既存selected/bobを関係なしで再保存してselected v6を維持できた。friend-boundary.jsonに実GET結果を保存。

全体tsc --noEmit、Vite build PASS。既存成功試験の繰返し・新規汎用基盤なし。今回割当1経路は完了。#142全体の比較引用・共有ルート等は別の未確認操作なのでcloseしない。友達再取得と記録PATCHは既存の別APIであり、その間の原子的な同時更新防止を追加したとは主張しない。
