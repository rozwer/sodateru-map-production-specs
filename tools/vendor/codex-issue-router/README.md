# Codex Issue Router

GitHub Issue上の `@githubUser Codex: 連絡` を、その人のPCで担当登録されたDesktop Codexセッションへ届けます。Node.js 22以上とGitHub CLIを使います。アプリ用DB・共有サーバー・Slackは不要です。

各セッションがJSONへ担当Issueを登録し、各PCに一つ置くDesktopの定期配送役がコメントを取得して、アプリ標準の `send_message_to_thread` で送信します。返信は元Issueへ残します。

**現バージョンの配送役はCodexの定期タスクです。空の確認にもCodexの利用量が発生します。** CLIの取得・登録処理自体はAIを呼びません。外部プロセスからDesktopの非公開ソケットへ注入する仕組みには依存しません。

## 初回設定（各PC）

```sh
gh auth status
node bin/router.mjs init --repo rozwer/sodateru-map-rehearsal --reaction
node bin/router.mjs doctor
```

`init` はGitHubユーザーとリポジトリのcollaborator一覧を保存します。一覧を取得できない場合は `--senders rozwer,Kmattsun28,shymky,koshiroucl` を指定します。許可する送信者は実際のメンバーに合わせてください。miseでツールを管理するプロジェクトでは `mise exec -- node ...` / `mise exec -- gh ...` を使います。

続いてDesktopで、このPCの配送役にするタスクを開き、次の出力をプロンプトとして「1分ごとにこの処理を行う定期タスクを設定して」と依頼します。

```sh
node bin/router.mjs relay-prompt
```

配送役は各PCに一つだけ設定してください。設定前に同名の既存定期タスクがないか確認します。プロンプトは絶対パスを出力します。配送役から該当CLIが実行でき、Desktop標準のタスク送信ツールが使える必要があります。PCのスリープ中・アプリ停止中・使用量制限中の即時配送は保証しません。

## Issueを担当するセッション内で登録

```sh
node /absolute/path/codex-issue-router/bin/router.mjs register --repo rozwer/sodateru-map-rehearsal --issue 604
```

`CODEX_THREAD_ID` から実行中セッションを登録します。環境変数がない場合のみ `--thread <Desktopの実際のthreadId>` を指定します。Issue番号は例です。宛先は担当者のGitHubユーザー名＋投稿先Issueで決まります。AさんがBさんへ連絡するときは、Bさんが登録しているIssueに投稿します。

担当登録は完全にローカルです。設定JSONと対象Issueの登録だけを読み、初回は約200バイトのJSONを一時ファイルからrenameします。同じ登録の再実行では書き込みません。GitHub・AI・DBへのアクセス、配送役のロック待ち、他Issueの全件走査はありません。Issueの存在・アクセス可否は定期取得時に判明します。登録成功だけでは実在Issueや配送成功を保証しません。登録はclaim時に1回、解除は完了・移管時に1回で十分です。CLIをCodexが起動するtool call自体の利用量はゼロではありません。

```text
@Kmattsun28 Codex: このIssueで保持しているcontracts/map.tsの変更について相談です。
```

`@Kmattsun28+Codex:` も検出しますが、GitHub本来のユーザーメンションとして読みやすい空白形式を推奨します。引用・コードブロック内の表記は宛先にしません。PR・Discussionはv0.1の対象外です。

完了・担当移管時は元セッションで登録を外します。同じPCの同じIssueへ複数セッションが登録されていたら、配送役は宛先を推測しません。

```sh
node /absolute/path/codex-issue-router/bin/router.mjs unregister --repo rozwer/sodateru-map-rehearsal --issue 604
```

同じGitHubユーザーを複数PCで使う場合は、一つのIssueを同時に両PCへ登録しないでください。PC間の担当登録は同期しません。

## 配送と復旧

`tick` が登録Issueだけを取得し、許可した送信者の明示メンションをローカルキューへ保存します。個人の通知既読状態は変更しません。登録前のコメントは配送せず、同じコメントの編集を新規配送として扱いません。

配送役は `pending` → `begin` → Desktop送信 → `sent` の順に実行します。`--reaction` を設定すると配送済みに👀を付けます。👀はアプリの受付済みで、受信側の作業完了ではありません。

```sh
node bin/router.mjs status
```

送信途中の停止は `dispatching`、成否不明は `uncertain` として残し、自動再送しません。宛先タスクの履歴で `[codex-issue-router:コメントID]` を探し、届いていれば `sent --key KEY --receipt '履歴で確認'`、未配送を確認できたときだけ `retry --key KEY` を使います。自動再送による同じ依頼の二重実行を防ぎます。

状態の保存先は `~/.codex/issue-router/`。`--root` または `ISSUE_ROUTER_HOME` で変更できます。セッションごとの登録とコメントごとの配送記録を別JSONに分け、書込は一時ファイルからのrenameを使います。短時間の二重実行防止はPIDファイルで行い、専用DBはありません。GitHubトークンは保存せず、既存の `gh auth` を使います。

## 検証

```sh
node --test
```

[実通信の確認記録](docs/verification.md)を参照してください。CLI動作、Desktopの実行中タスクへの受信、定期起動、複数PCでの受信は別々に記録します。

参考: [GitHub Issue comments API](https://docs.github.com/en/rest/issues/comments)、[OpenAIの定期タスク](https://learn.chatgpt.com/docs/automations)。
