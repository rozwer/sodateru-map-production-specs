# 接続Issueへの引継ぎ下書き

このディレクトリの `.ts.txt` は、UI/API分割前に準備した未検証の接続コードを保持している。製品buildからは除外し、UI合格の証拠に含めない。元の処理を破棄していない。

接続担当はCOMMUNITY v1.1.0の統合済みgenerated client、共通api singleton、active/scopeKeyを確認してから適切なsrc pathへ戻し、型検査と実APIを通すこと。

- 一覧/全件地図: 同じcategory/bbox/目的/期間/共有対象を送る。101件目以降、場所不明件数、413を確認する。
- しおり: 全cursor読取、対象ごとの作成key再利用、version付き削除、失敗後再読取を確認する。Record.bookmarkedを流用しない。
- 詳細: active復帰で単体共有詳細を再取得し、404/取消/本人切替では旧本文と媒体を再表示しない。
- 媒体: getMediaMediaIdContentのBlobを使う。active=falseで中断・停止・Object URL解放する。
- 地域候補: 文字編集でcenter/boundsを解除する。検索responseの遅着で以前の候補を新しい名前へ紐付けないよう、親controllerで世代/AbortSignalを扱う。
- 投稿: UI-RECORDSのrecord-createへplaceId/topicKey/returnPageを渡し、保存/共有後の戻りで再取得する。

正式な後続Issue番号は仕様調整担当の分割確定後に追記する。
