# UI-MAP 地図描画の先行提供

## 対象

Issue #8 の地図描画部品。`src/map/MapRenderer.tsx` は主地図、`src/map/MapPreview.tsx` は同じ描画器をカード内で使う入口。背景は Mapbox Standard の実データで、トークン未設定・取得失敗は明示する。参照画像を背景として貼っていない。

- 候補、保存場所、経路候補、欠測で分割済みの観測線を ownerKey ごとに描画し、選択を共有bridgeへ返す。
- 2D/3D、レンズ、時間、カメラを独立して反映する。2D中も3Dのpitchを保持する。
- 通常の地図操作と現在地追従は、訪問APIを呼ばない。
- MapPreview は `bridge`, `label?`, `className?`, `interactive?`（既定false）, `padding?`, `center?`, `radiusM?` を受ける。高さはCSSで上書きできる。preview用paddingを主Sheetのpaddingと分離し、表示専用previewから主cameraへ書き戻さない。
- 半径は球面距離に基づくGeoJSONを描く。zoomに依存した固定pxの円ではない。
- ObjectPreview はThree.jsの装飾形状であり、実建物の高さではない。

## 確認環境と結果

2026-09-15、worktree `/Users/roz/.codex/worktrees/ui-map-8`。base `6d1b08a`。Mapbox GL JS 3.30.0、Three.js 0.180.0、Vite 7.1.5。IAB/WebKit、390x844/320x844。

`docs/evidence/UI-MAP/renderer.html` は画面上に模擬データと明示した描画確認用入口。背景のみ実Mapboxで、地点・経路・観測は確認用座標。API成功・保存・機能全体の証拠には使わない。

- Mapbox実地図とカード内MapPreviewを同時表示。
- 地点をクリック→`map-search/candidate/test-candidate`、pressed=true。
- 3D→2D→3Dとfocusを連続操作し、選択とpitch=52を保持。
- day/night、personal/physical、500m/1000mを切替。次元と選択を保持。
- `route-planner`をclearし、独立した2観測区間と候補マーカーを保持。
- 地図マーカーのARIA roleがMapboxのimgで上書きされる問題を修正し、操作可能なマーカーはbutton、表示専用はimgにした。
- preview paddingの参照変化によるmoveendの無限更新、およびcameraアニメーションの中断によるpitch書戻しを修正。ブラウザerrorログ0件。
- 390/320の画面で横方向のはみ出しなし。証拠画像は `screenshots/renderer-390.png` と `screenshots/renderer-320.png`。
- COREのstrict/noUncheckedIndexedAccessを含むTypeScript検査に成功。未統合UI-BASEの型は担当worktreeから読取参照し、共通ファイルの複製・変更はしていない。

## 未完了

これはUI-MAP全体の完了ではない。指定5画面の全状態・実API保存/再取得、建物成長、手動装飾の地図表示、表示設定/AI採用、プラグイン面/意味色、現在地共有契約の接続は後続。実建物の選択は実装済みだが、API buildingKeyと成長の結合検証は未実施。先行PRの統合後もIssueを開いたままにする。

## 参照

- [Mapbox Standard building selection](https://docs.mapbox.com/mapbox-gl-js/example/highlight-buildings-standard/)
- [Mapbox Standard style configuration](https://docs.mapbox.com/map-styles/reference/standard/)
- [Three.js custom layer](https://docs.mapbox.com/mapbox-gl-js/example/add-3d-model/)
