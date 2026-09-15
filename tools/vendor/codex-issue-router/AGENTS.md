# Codex Issue Router

Node.js 22以上とGitHub CLIを使う。DB、共有ロック台帳を追加しない。担当登録はネットワーク・AI呼出しなし、ローカルJSONのみで完結させる。Desktop配送には内蔵の定期タスクを使うため、その利用量を明記する。
各セッションは担当IssueとthreadIdをローカルJSONへ登録する。GitHubコメントが通信記録の正本。
配送対象は明示的に登録されたセッションだけ。未確定の配送を自動で再送しない。
検証は `node --test`。実通信のテストは専用Issueと専用セッションだけで行う。
