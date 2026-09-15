# 地図上の画面固有header

- `ScreenDefinition.toolbar?: ComponentType<ScreenProps>`を追加。既存画面は無指定で従来どおり。
- toolbarを指定し、`layout.mapControls:true`にすると上部全幅へmountする。通常のback/navigate/scopeKey/activeを渡す。
- 固有headerが戻る/メニューを描画するため、BASEの重複メニューボタンを隠す。
- `local-knowledge`向け設定は `header:'none',contentPadding:'none',mobileHeight:58,mapControls:true`。画面固有ViewはSheet本文を持ち、単一地図/Sheet/navはBASEが所有する。

`session.html#/local-knowledge`は実COREセッションと検査用header/Sheet。390×844でtoolbar left0/right390、Sheet top354.5/height489.5（58%）、共通Sheet header 0件をDOMで確認した。これは共通配置の検査であり、地域の知の業務APIや参照絵全体の照合完了ではない。型をBASE入口と確認画面に対してstrict/noUncheckedIndexedAccessで検査し成功。

同じ提出branchに任意の `src/integration/registry.ts` / `configureApp(discovered:AppProps):AppProps` 入口も保持する。未配置時は既存features/screens.tsx自動収集のまま。組込み担当の指示どおりregistryファイルは作成していない。
