# 本人の訪問・記録と建物成長：保存側設計

## 保存正本と境界
既存ACTIVITYのvisit(id/本人/placeId/status/version)、RECORDSのrecord(id/visitId/body/purposes/version)を正本とする。DTOはgenerated clientをそのまま利用しserver/schemaを増設しない。本人・live/demoは既存api/sessionとscopeKeyで分離。候補POSTはcandidate、確認PATCHだけconfirmed。場所検索/選択では保存しない。記録作成の「行きました」チェックは明示確認として既存POST→PATCHを維持。

## 地図側設計との分担（#222）
地図側がgetMapGrowthのconfirmedVisitCount/purposes/sourceRefs/stageを実建物へ対応付ける。placeIdと安定したprovider/source-layer/feature IDのbuildingKeyを分離。明示対応→包含ポリゴン→本人選択→未対応の順。曖昧な最寄建物へ吸着しない。複数施設はplaceIdを保持しvisitId重複排除。用途原文を保持し完全一致辞書のみ分類。
今回提案値：食事・カフェ#E8AE79、休憩#9CBD9A、散歩・運動#82BDB4、学び・読書#92AED1、買い物#D9A0B6、交流#B3A0CE、未知#ADB9C7。前記順で代表用途を固定。0回薄灰、1回40%、2–4回65%、5回以上85%の混色。高さは地理情報、透明度固定。これら描画実装/対応未確定は#222所有。

## 保存と更新
成功応答後のみscope付きnotifyGrowthChangedを発行。地図側は既存loadGrowthで全ページを再取得し旧集合を置き換える（取消/場所訂正の旧建物も対象）。取得失敗は旧材料を保持しエラー表示。保存失敗は通知せず入力保持。409では現在版を読み直し、利用者が下書きと現行値を確認して再保存する。候補作成は同ID/idempotency keyを再利用する。
用途訂正はrecordのpurposesのみPATCHし本文不変・訪問回数不変。record削除はvisit維持、visit削除は本文を残し関連解除。APIの責任は#20/#21へ、地図表示は#222へ。画面入口はvisit-confirm(visitIdまたはplaceId)、record-edit/interpretation-correction/record-delete(recordId)。

## 未対応・未達
建物未対応でも保存可能。成長取得失敗を0件として表示しない。旧#11/#135の全画像/媒体/共有/insight/daily-track受入は本修復だけで完了しない。

## 最小受入
実APIでcandidate→confirmed→用途訂正→取消→場所訂正→削除を同ID/versionで再取得。409で下書きを保持。UI入力/確認/実保存と再読込、#222との同じ建物着色/旧色消去、運用担当による再起動後再取得を記録。APIテストだけで実建物着色をPASSとしない。
