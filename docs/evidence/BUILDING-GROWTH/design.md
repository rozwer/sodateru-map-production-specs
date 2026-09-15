# BUILDING-GROWTH 設計（2026-09-15）

## 保存正本と責務（既存仕様）
SQLiteの本人・live/demo領域に属するvisits、records、places.buildingKeyを正本とする。本人は既存client/contextで判定し本文から取らない。getMapGrowthのplace / confirmedVisitCount / purposes / sourceRefs / stageを取得する。サーバーがconfirmed限定で集計し、Reactは取得・選択・失敗、MapSceneは実地理描画を持つ。postVisits / patchVisitsVisitId / deleteVisitsVisitId、記録訂正は独立ACTIVITY/RECORDS担当。既存operationId/Schemaを変えない。

## 着色（今回の具体値）
検索・候補保存・クリック・しおり・通過・経路終了は着色しない。confirmed訪問IDをsourceRefsで重複排除し、1回/2–4回/5回以上を段階1/2/3とする。同一建物の施設はplaceIdを維持して集約。用途原文を保持し、完全一致の辞書だけで表示カテゴリへ変換する。代表色は食事・カフェ #E8AE79、休憩 #9CBD9A、散歩・運動 #82BDB4、学び・読書 #92AED1、買い物 #D9A0B6、交流 #B3A0CEの固定優先順。未知用途 #ADB9C7。最多の意味ではない。薄灰色 #D8D8D6 と40/65/85%混合し不透明度は固定。高さは実データ値を維持する。

## 地理と対応
既存Mapbox Standardのbuildings featureset、feature IDとnamespaceを含む既存キー形式 mapbox:basemap:buildings:<namespace>:<id> を継承する。配列位置や最近傍で永続対応しない。保存済み明示キーを最優先し、未表示でも別建物へfallbackしない。キーなしの場所は地点を含む実ポリゴンの一意候補、複数なら本人選択、0なら未対応。対応保存には既存patchPlacesPlaceIdのbuildingKey/versionを使う。地図提供元のIDが取得できない建物は対応不能と明示する。Mapboxのタイル更新を跨ぐ永久不変保証はなく、保存キーが見つからないときは再選択を案内する。

## 画面と更新
道路白・地面淡い暖灰・公園淡緑・水面淡青・建物薄灰。新規表示はpitch55/zoom16。ロゴ/帰属維持。建物選択で関連施設・確認済み回数・全用途・sourceRefsの記録を表示し施設詳細へ進む。場所の建物選択では保存前プレビューを成長色にしない。
保存成功通知または地図復帰で全ページのgetMapGrowthを再取得し、旧応答にだけ存在した建物も消す。取得失敗時は直近成功材料を保持して再試行を表示。scope変更では本人/demo材料をclear。mapインスタンス・カメラは維持しstyle.loadでsource/layerと現在材料を復元、イベントは重複登録しない。409では入力保持・再取得。訪問削除は本文保持/関連解除、記録削除は訪問回数維持（API担当の受入）。

## 防災と流用
同じMapSceneへSceneImage/SceneOverlayを渡す。DATA #214のclipDisasterRaster処理済み画像座標と欠測geometryを利用。mockは明示しlive snapshotにしない。リハーサル src/map/host/growth-state.ts の本人confirmedのみ実建物対応という原則を継承。growth-models.tsの装飾モデル/独自Meaning契約は今回使わず、本番GrowthItemへ接続する。原本 personal-map/map page.jsonは853×1844と390幅を参照し共通Shell/CSSを改変しない。

## 最小受入と未確定
9条件を削らず検証する: 未訪問灰色／検索・候補非着色／confirmed実API→着色／reloadとserver再起動の同一対応／用途訂正と本文保持／取消0で灰色／場所訂正の旧色除去／map操作・style再読込で同一対応／保存失敗を成功にしない。サーバー再起動は共有runtime担当のみ行う。実タイルのID/高さ露出と同一建物複数施設を実ブラウザで検証し、不足は証拠へ残す。
