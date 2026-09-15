# 実画面を開く最短手順

このディレクトリは製品のUI・API・DBを作り直さず、developに統合された既存の起動処理を呼んで、利用者がブラウザで目視・操作確認するための入口だけを持つ。

## 起動

リポジトリの現在のdevelopを取得したworktreeで実行する。

```sh
mise trust
mise exec -- bun install --frozen-lockfile
mise exec -- bun qa/manual/run.mjs --check
mise exec -- bun qa/manual/run.mjs
```

`--check`が`READY`になる前は、表示される`WAIT`が未統合箇所である。launcherは既存の`bun run dev`だけを呼び、別のVite/API/DBを作らない。

起動logに出るViteの`Local` URLをブラウザで開く。既定は `http://127.0.0.1:5173/`、APIは `http://127.0.0.1:3001/`。ポート競合時はViteが表示した実URLを正本にする。別terminalで次を1回実行し、UIとlive/demoのAPI入口が200であることを確認する。

```sh
mise exec -- bun qa/manual/probe.mjs
```

URLを変更した場合だけ `--ui http://127.0.0.1:5174/ --api http://127.0.0.1:3002/` を付ける。

## demoとlive

- demoは画面遷移・空/失敗状態・サンプル内容を見るための隔離状態。既定DBは`.local/demo.sqlite`で、サンプル表示をlive保存の証拠にしない。
- liveは利用者が確定した保存を確認する状態。既定DBは`.local/app.sqlite`。最後の「保存→再読込」はliveで新しく入力した識別可能な値を使う。
- API起動logにlive/demo両方の実DB pathが出る。画面のモード表示とlogのpathを記録し、同じperson・同じmodeで再表示する。

## 4本の短い確認journey

最初はブラウザ幅390px・高さ844pxで行い、最後に広い画面でも主操作が欠けないことだけを見る。操作名が実画面にない場合は別経路を推測せず、その画面を未統合として扱う。

### 1. 共通メニューと復帰

1. 起動画面で地図を開き、任意の場所を選ぶ。
2. メニューから「自分」へ移動し、戻る/Escapeで地図へ戻る。
3. 選択場所・地図範囲・フォーカスが保持されることを確認する。

照合先：[参照画像](../../docs/01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2008_11_51.png) / [navigation仕様](../../docs/01_requirements/03_pages/navigation/README.md) / [遷移一覧](../../docs/01_requirements/03_pages/navigation/interactions.json)。

### 2. 地図の検索と選択

1. 地図の検索欄で実在する場所を検索し、候補を1件選ぶ。
2. 地点情報と地域情報を開閉し、地図へ戻る。
3. 検索中・0件・通信失敗を、成功結果やデモ結果に置き換えず表示できることを確認する。

照合先：[地点選択](../../docs/01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2007_41_12.png) / [地域情報](../../docs/01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2007_41_17.png) / [検索結果](../../docs/01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2007_41_21.png) / [map仕様](../../docs/01_requirements/03_pages/map/README.md)。

### 3. liveの保存と再表示

1. liveへ切り替え、「体験を残す」で本文に確認時刻を含む一意な文字列を入力する。
2. 場所選択を開いて戻り、入力が残ることを確認する。確認画面ではまだ保存されていないことを見る。
3. 保存を確定し、一覧または詳細へ戻る。ブラウザを再読込し、同じ本文・場所・日時精度・公開範囲が表示されることを確認する。
4. DevToolsのNetworkで保存APIと再取得APIが成功し、API起動logのlive DBが同じpathであることを確認する。

照合先：[3状態の参照画像](../../docs/01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2008_07_53.png) / [record-create仕様](../../docs/01_requirements/03_pages/record-create/README.md) / [受入](../../docs/01_requirements/03_pages/record-create/acceptance.json)。

### 4. 拡張機能の試用と管理

1. 「アプリを育てる」から拡張機能一覧→詳細→試用へ進む。
2. 試用中はdemo/previewであることを確認し、導入を確定するまでは保存済み扱いにしない。
3. 導入後に地図へ戻って変化を確認し、管理画面で有効/無効を切り替える。再読込後も確定値が一致することを確認する。

照合先：[試用・導入の参照画像](../../docs/01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2008_23_14.png) / [管理の参照画像](../../docs/01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2008_23_21.png) / [plugin-trial仕様](../../docs/01_requirements/03_pages/plugin-trial/README.md) / [plugin-manage仕様](../../docs/01_requirements/03_pages/plugin-manage/README.md)。

## 完了としない状態

URLが開くだけ、静的fixtureだけ、demoサンプルだけ、保存直後の表示だけでは完了にしない。操作→API→SQLite保存→ブラウザ再読込→再取得が同じbuild・person・modeで揃った結果だけを保存再表示の確認とする。
