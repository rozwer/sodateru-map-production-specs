# UI-EXPLORE #10 の先行画面部品

2026-09-15。**部品検証の段階で、実API/DB・共通Shell・実地図への接続は未完了。Issue全体の完了証拠ではない。**

## 取得と提供範囲

- worktree: `/Users/roz/.codex/worktrees/ui-explore-10`
- branch: `rozwer/10-exploration`
- 起点: `26a25329111af5e72ee42c3120c06993adbeae91`。共通worktree修復とQA入口を `ea87c01` まで取り込んだ。
- `CODEX_OWNER=rozwer mise run task:verify` 成功。取得pathは `src/features/exploration/`、`src/features/transfer/`、本ディレクトリ。
- `src/features/exploration/index.ts` と `src/features/transfer/index.ts` から表示部品・表示用propsを提供する。HTTP Schemaや共通clientの代替ではない。
- 画面は保存/生成/再試行をcallbackへ渡す。成功前にAPI保存済みと表示しない。文字と表示だけの検証では、実行中の本人・保存DBは存在しない。

## 画像との対応

実装前に指定画像3枚を実際に開いた。参照画像の切抜き・画面画像は製品に配信していない。

| 画面 | 参照 | ブラウザ検証と残差 |
|---|---|---|
| 探索候補 | [07_41_24](../../01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2007_41_24.png) | [390px](explore-390.png)。見出し、利用者/応答欄、候補カード、移動/滞在、経路領域、合計、地図ボタンと下部入力。写真・地図・共通Chatは接続後の照合が必要。 |
| 声で相談 | [08_18_10 左](../../01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2008_18_10.png) | [390px](voice-390.png)。相談目的、マイク/波形/時間/停止、編集本文/消去、送信の白カード構成。 |
| 相談履歴 | 08_18_10 中央 | [390px](history-390.png)。検索、日付見出し、写真領域/タイトル/本文/タグ/時刻、下部の新規相談。写真の取得元は未提供。 |
| AI送信確認 | 08_18_10 右 | [320px](consent-320.png)。AI状態、確認本文、場所の変更/解除、入力の扱い、取消/送信。要件JSONの有効化switchも表示。 |
| もや候補詳細 | [08_12_03 左](../../01_requirements/03_pages/references/Codex%20画像%202026年9月15日%2008_12_03.png) | [390px](mist-390.png)。地図領域と下の詳細、写真/名称/住所、入口/出典/理由、三つの操作。写真・ギャラリー・実地図は未提供。 |
| コンパス | 08_12_03 中央 | [方位拒否390px](compass-denied-390.png)、[文字200%・320px](compass-text200-320.png)。目的地、動的SVG、直線距離/測位時刻/精度、方位拒否、道路経路/終了。背景地図は未提供。 |
| 発見 | 既存リハーサル `src/features/discovery/entry.tsx` / `styles.css` | [390px](discovery-390.png)。対象/観察→カード→詳しく読む/出典/反応の既存構成。 |
| 体験移転 | 既存リハーサル `src/features/transfer/entry.tsx` / `styles.css` | [390px](transfer-390.png)。元体験/段階/意味→次の街と条件→忠実/本人向け比較の既存構成。Q10の本番契約へは未接続。 |

発見・体験移転は「リハーサルにあるものはそれを元に画像を組んでよい」という追加指示を適用。[Issueの記録](https://github.com/rozwer/sodateru-map-production-specs/issues/10#issuecomment-5673498140)。旧API/保存実装は移植していない。

プレビューの上部に「表示例・通信なし・写真は未取得」を表示している。検証用ヘッダーによる縦位置の差もあり、共通Shell組込み後に同じ状態・画面幅で差分を直す。写真や地図を未取得表示にした状態を、指定画像との一致合格として扱わない。

## 実施した確認

- TypeScript strict / React JSX / ES2022・DOMの型検査に成功。
- 端末処理4件のVitestに成功。取消後の文字起こし遅着を破棄、古い録音の停止イベントが新しい録音を止めない、方位拒否の識別と測位watch解除、実座標からの距離/方角（経度180度を跨ぐ場合を含む）。
- 390pxの実ブラウザで、録音停止の表示→本文を編集→送信内容確認→取消。編集した本文が戻り、プレビューの送信確定数は0。
- 320pxの同意画面で、AI有効化後に送信操作へ到達できることを確認。documentの横幅/scrollWidthはともに320px。
- 履歴で該当なし検索→0件表示。取得済み範囲の検索である旨を表示。
- コンパスの方位拒否を現在地取得失敗と別表示。位置時刻/精度を保持する。これは表示fixtureと単体検証であり、実端末のGPS/方位センサー検証は残る。
- 文字200%・320pxで発生した距離欄と目的地名の重なりを修正し、両者の矩形が重ならず、横幅320px内に収まることを確認。

録音はMediaRecorderで取得し、波形はWeb Audioの実測値から描く。音声blobは指定された文字起こしcallbackへ渡す。音声→AI相談の自動送信はしない。[MediaRecorderの停止イベント](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop_event)と[方位の許可](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static)に合わせた解除処理を持つ。

### 再現

```sh
mise exec -- bunx vite --config docs/evidence/UI-EXPLORE/vite.config.ts --host 127.0.0.1 --port 5184 --strictPort
mise exec -- bunx vitest run src/features/exploration/device.test.tsx --config docs/evidence/UI-EXPLORE/vite.config.ts --environment jsdom
```

表示URL: `http://127.0.0.1:5184/docs/evidence/UI-EXPLORE/preview.html?page=voice-consultation`。
`page`には `ai-explore`、`ai-consent`、`conversation-history`、`mist-detail`、`quest-compass`、`discovery`、`experience-transfer`も指定できる。`large-text=1`は文字200%の検査用。

## 完了までの残件

1. UI-BASEのScreenDefinition登録、useScreenState、共通Chat、CORE共通client、単一Sheet/MapBridgeとUI-MAPのMapPreviewに接続する。
2. EXPLORATIONの相談/履歴接続契約を確定して、固定起点・候補ID・resultId・期限・会話IDの同一性を、実API保存/再取得で確認する。旧一時相談文書と永続履歴の差を推測fieldで埋めない。
3. AI.voiceとSETTINGS.preferencesの提供後、実録音→文字起こし編集→AI利用選択保存→送信を接続。取消で送信しないことと遅着の破棄を実APIでも確認する。
4. COMMUNITYのしおりとEXPLORATIONの発見/反応を保存・再取得・非表示・根拠変更へ接続する。保存や接近から訪問/成長を確定しない。
5. TRANSFERのQ10契約に元記録の意味/順序・二案比較・採用を接続。採用地点列をROUTESへ渡し、再起動後に同じ計画を開く。
6. 独立した候補写真、入口、候補理由、滞在時間等の提供元を確定し、指定画像との残差を修正する。現在のPlaceCandidateにないfieldを追加送信しない。
7. 共通Shell組込み後に1440px、全画面の文字200%、キーボード、reduced motion、空/失敗/再試行/版競合/期限切れを確認する。全受入を満たすまでtask:finishとIssue closeは行わない。
