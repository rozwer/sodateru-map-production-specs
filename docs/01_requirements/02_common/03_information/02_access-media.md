# 閲覧権限と媒体

場所詳細、共有検索、比較、地域の声が他の人の文章と写真を読むときに使う。
本文と媒体の両方で同じ公開条件を確認する。

## 閲覧判定

| records.visibility | 読める本人 |
|---|---|
| private | records.person_id本人だけ |
| public | アプリの本人が確定している閲覧者 |
| selected | 投稿者本人、またはshared_with_jsonに含まれる本人 |

共有先の配列は重複なく、peopleに存在するIDのみ保存する。
selectedの相手にフレンド状態を自動で追加条件として課さない。
公開範囲の正本はvisibilityとshared_with_json。

検索audienceは閲覧可能な集合をさらに絞る。
ownは本人投稿、publicは公開投稿、selectedは本人宛ての選択共有、friendsはfriendshipsで承認済みの相手の閲覧可能投稿。
visibleは全閲覧可能投稿。
フレンド解除はfriends検索から除外する。明示されたselected共有を解除するには共有範囲を更新する。

直接IDを指定して読めない対象はNOT_FOUNDで返す。
生成用の引用も、この判定後の内容だけを使う。

## 媒体の形式と取得

MediaViewは{id,kind,mimeType,byteSize,position,status,contentUrl}。
kindはphoto/video/audio、statusはpending/ready/failed。
contentUrlはreadyなら本人確認付きの /api/v1/media/{id}/content、それ以外はNULL。
storage_keyはHTTPへ返さない。
同じ記録の媒体はposition昇順、同順位は保存制約違反として失敗にする。

GET /media/{id}/contentは次の順序。

1. mediaとrecordを読む。
2. 現在の本人が記録を読めるか確認する。
3. status=readyか確認する。pendingは409、failedは503。
4. SODATERU_ASSET_ROOTとstorage_keyを結び、実パスが媒体ルート内であることを確認する。
5. ファイルを開き、mime_typeとbyte_sizeに従って返す。

Content-Typeは保存済みmime_type、Cache-Controlはprivate, no-store。
動画・音声では単一のbytes Rangeに対応し、206とContent-Rangeを返す。
範囲外は416、複数Rangeは416。
Rangeを指定した取得でも毎回閲覧判定する。
Content-Dispositionはinline。

ファイルが失われていた場合は、その媒体だけPROVIDER_UNAVAILABLE。
本文の読出しは成功として返す。
パス解決でルート外やシンボリックリンクの実体が外部に出る場合は失敗にする。

## ブラウザ側

直接の認証付きURLをimg・video・audioへ渡せる場合はそのURLを使う。
Blobを取得する場合は媒体IDをキーに重複を除き、Object URLを作る。
場所変更・本人変更・モード変更・画面終了・共有取消でObject URLをrevokeする。
動画と音声は停止し、srcを解除する。

一件の媒体が失敗したら、その位置に失敗表示と再試行を置く。
その再試行で本文と成功済み媒体まで取り直さない。
新しい取得前に媒体の現在状態と閲覧権限を確認する。

## 共有取消と編集の順序

本文の訂正はrecordのexpectedVersionで更新し、versionを増やす。
公開範囲の更新も同じrecordの版で照合する。
共有更新と本文更新が競合したらVERSION_CONFLICTを返す。

取消成功後は、変更したrecordIdを画面の読出し状態へ通知する。
一覧・詳細・比較カードから該当内容を外し、媒体を停止する。
その後の取得は現在の閲覧条件で判定する。

元の本人の記録は保持する。
引用した分析の扱いは [根拠と更新](03_evidence.md)に従う。
