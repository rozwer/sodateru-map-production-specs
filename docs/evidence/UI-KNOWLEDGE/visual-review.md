# UI-KNOWLEDGE UIの照合記録

2026-09-15。UI/API分割の正式なIssue対応は調整中。UI自体もlocal-knowledgeの共通外枠を確認中で、まだ完了報告ではない。

## 再現入口

```sh
KNOWLEDGE_MAP_ROOT=/Users/roz/.codex/worktrees/ui-map-8 mise exec -- bunx vite --config docs/evidence/UI-KNOWLEDGE/vite.config.ts
```

- URL: `http://127.0.0.1:5186/docs/evidence/UI-KNOWLEDGE/preview.html`
- 1536×1024は参照08_12_07.pngの3列配置。390px以下では1画面ずつ切替。
- 地図はUI-MAP担当worktreeの共通MapPreviewを読み取る。コピーした別rendererではない。現時点の読取HEADは1cfac6d。MAP統合後はKNOWLEDGE_MAP_ROOTを省略し同じcheckoutだけで起動する。
- データは明示したUI確認用入力。実API/DB/保存を証明しない。

## 一覧・条件・詳細

参照画像をview_imageで開き、同じ1536×1024の実ブラウザと照合した。カード、半径/用途/期間/公開対象の選択、写真と動画、作者/日時/場所、関連操作をDOMで描画している。

初回にカード内の余白、作者/タグの文字サイズ、地図プレビュー高さ、下部ボタン位置の差を確認して修正した。調整後の一覧カードは参照と同じ上部約322pxから始まり、下部ボタンは約899px。地図は177px高。3列の枠は約56–974px。

表示内容の差は、確認用写真/作者アイコン、2件の確認用入力、実座標による距離、現在のMapbox地図とnative動画controls。写真や地図を参照画面の切抜きで置換していない。地図範囲の操作名は、仕様F01のbbox選択と半径を混同しない「地図の範囲で探す」。

写真はnative img、動画は18秒のnative video。動画は生成した公園の静止画を動画形式にした操作確認用素材で、実際の投稿動画ではない。実再生と停止の検査は別の媒体記録も参照。

## 未完のUI

- local-knowledgeの上部header、操作可能な地図、下部場所Sheet、既存bottomNavを同じ共通shellで配置。BASE #4へbottom sheetの正式指定を依頼済み。
- 保存placeIdの地図上の立方体/選択枠はUI-MAP #8へ既存表示入口を照会済み。
- 上記統合状態で場所シートと戻る/scroll/キーボードを確認する。

## 生成した確認用素材

内蔵imagegenを使用。製品入口へはimportせず、この証拠用previewだけが参照する。

- [generated-cafe.png](assets/generated-cafe.png)
- [generated-park.png](assets/generated-park.png)
- [generated-park-test.mp4](assets/generated-park-test.mp4) — 公園画像からffmpegで作成した18秒の静止動画。

### 最終プロンプト

カフェ:

> Use case: photorealistic-natural. Asset type: explicitly labeled UI test fixture photograph, not a real user submission. A quiet Japanese neighborhood cafe interior with wooden chairs, large windows looking onto lush green trees, daylight, no people, no text or signage. Natural casual smartphone photograph, landscape composition, soft green and warm wood colors. No interface, no collage, no watermark.

公園:

> Use case: photorealistic-natural. Asset type: explicitly labeled UI test fixture photograph, not a real user submission. A peaceful small Japanese neighborhood park, green grass and leafy trees, a wooden bench beside a paved walking path, soft daytime sunlight. Natural casual smartphone photograph, landscape composition. No people, no text, no interface, no collage, no watermark.
