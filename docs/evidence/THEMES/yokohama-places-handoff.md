@shymky Codex: D司令塔1からユーザー依頼の横浜実世界15件を引渡し。収集済みのため二重研究不要。原文をdocs/evidence/PLACES/yokohama-15-spots-source.jsonへ保存→名称/出典で重複照合→13null座標と2代表点を正式providerで解決/確認→共有デモ管理#105と投入時刻調整→demo/self正式POST /places。優先5=kita/象の鼻カフェ/大さん橋/山下公園/赤レンガ。本人records捏造なし、休館/未確認写真/出典を保持。C別PCからこのMacのlocalhostへ直接接続できるとは扱わず、取込実行は#105と調整。保存path/commitと取込結果を#105へ返信願う

収集正本（相談役から受領したJSONを省略・改変なしで転載。API payloadではありません）：

```json
{
  "schemaVersion": "research.yokohama-spots.v1",
  "title": "横浜デモ用・実在スポット15件",
  "checkedAt": "2026-09-15",
  "dataKind": "real_place_research",
  "notAnApiPayload": true,
  "scope": "みなとみらい・新港・日本大通り・山下町・中華街・山手",
  "provenance": "施設・横浜市などの公開公式ページを検索して要約。緯度経度の参考値2件のみWikipedia。",
  "usageNotes": [
    "shortDescriptionは公開情報の要約。demoHighlightsとsuggestedAxesとscenariosは編集上の提案。",
    "suggestedAxesは行き先の提案用。訪問だけで日次5軸を達成扱いしない。既存記録に明記された体験で判定し、記録なしは不明。",
    "人物の訪問、感情、同行者、日記、評価は含まない。",
    "座標未確認13件はposition:null。名称と住所を用い既存の地図プロバイダで解決してから登録。2件の座標も施設の代表点で入口精度は保証しない。",
    "営業時間・価格・開花・空席・当日入場をリアルタイム保証しない。",
    "写真は同梱していない。sourceUrlsに掲載されている写真の利用権は一括確認していない。"
  ],
  "existingSeedFindings": [
    {
      "path": "docs/evidence/UI-FRIENDS/live-seed.mjs",
      "finding": "名古屋の手動確認用の場所と明示された合成体験。API投入方法の参考。横浜の実世界データの根拠にはしない。"
    },
    {
      "path": "docs/evidence/INSIGHTS/shared-demo-seed.ts",
      "finding": "demo/selfの明示された合成日記。今回の場所調査と混ぜて本人の実体験にしない。"
    }
  ],
  "spots": [
    {
      "id": "yokohama-red-brick",
      "name": "横浜赤レンガ倉庫",
      "area": "新港",
      "category": [
        "歴史建築",
        "海辺",
        "買い物"
      ],
      "address": "神奈川県横浜市中区新港1-1",
      "position": {
        "longitude": 139.64278,
        "latitude": 35.45222
      },
      "positionStatus": "reference_point_not_entrance",
      "geocodingQuery": "横浜赤レンガ倉庫 神奈川県横浜市中区新港1-1",
      "sourceUrls": [
        "https://www.yokohama-akarenga.jp/about/",
        "https://www.yokohama-akarenga.jp/access/"
      ],
      "shortDescription": "かつての保税倉庫を文化・商業施設として活用。赤い煉瓦の建物と海辺の広場が広がる。",
      "demoHighlights": [
        "煉瓦の建物と港を一緒に見せる",
        "残された鉄道のレールから街の歴史へ話を広げる"
      ],
      "suggestedAxes": [
        "散歩"
      ],
      "visitNotes": "屋外景観と館内店舗を分けて扱う。店舗営業時間・イベントは別途確認。",
      "priority": 1,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": [],
      "positionSourceUrl": "https://en.wikipedia.org/wiki/Yokohama_Red_Brick_Warehouse"
    },
    {
      "id": "yokohama-yamashita-park",
      "name": "山下公園",
      "area": "山下町",
      "category": [
        "公園",
        "海辺",
        "花"
      ],
      "address": "神奈川県横浜市中区山下町279",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "山下公園 神奈川県横浜市中区山下町279",
      "sourceUrls": [
        "https://www.city.yokohama.lg.jp/kurashi/machizukuri-kankyo/midori-koen/koen/koen/daihyoteki/kouen008.html"
      ],
      "shortDescription": "海を眺められる公園。沈床花壇や記念碑があり、港の風景と花壇を楽しめる。",
      "demoHighlights": [
        "港の景色と緑で地図の印象を変える",
        "氷川丸の姿や記念碑を発見のきっかけにする"
      ],
      "suggestedAxes": [
        "自然",
        "散歩"
      ],
      "visitNotes": "花の見頃・開花状態を現在の事実として断定しない。",
      "priority": 1,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-osanbashi",
      "name": "大さん橋 屋上広場",
      "area": "海岸通",
      "category": [
        "展望",
        "海辺",
        "建築"
      ],
      "address": "神奈川県横浜市中区海岸通り1-1-4",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "大さん橋 屋上広場 神奈川県横浜市中区海岸通り1-1-4",
      "sourceUrls": [
        "https://osanbashi.jp/floorguide/rooftop",
        "https://osanbashi.jp/access"
      ],
      "shortDescription": "国際客船ターミナルの屋上に広がるウッドデッキの広場。港を見渡せる。",
      "demoHighlights": [
        "海と街のパノラマを見せる",
        "木のデッキの形を建築の発見として紹介"
      ],
      "suggestedAxes": [
        "散歩"
      ],
      "visitNotes": "屋上は公式案内で24時間開放。客船が必ず停泊しているとは扱わない。",
      "priority": 1,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-zounohana-park",
      "name": "象の鼻パーク",
      "area": "海岸通",
      "category": [
        "公園",
        "海辺",
        "港の歴史"
      ],
      "address": "神奈川県横浜市中区海岸通1丁目",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "象の鼻パーク 神奈川県横浜市中区海岸通1丁目",
      "sourceUrls": [
        "https://www.city.yokohama.lg.jp/kanko-bunka/minato/yokohamako/gaiyo/zonohana/zounohana.html"
      ],
      "shortDescription": "象の鼻に似た防波堤に由来する公園。横浜開港150周年の2009年に開園した。",
      "demoHighlights": [
        "地名の由来を短い発見として提示",
        "赤レンガと山下公園をつなぐ立ち寄り候補"
      ],
      "suggestedAxes": [
        "自然",
        "散歩"
      ],
      "visitNotes": "公園とテラス内カフェは別スポットとして保持。",
      "priority": 2,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-zounohana-cafe",
      "name": "象の鼻カフェ",
      "area": "海岸通",
      "category": [
        "カフェ",
        "スイーツ",
        "海辺"
      ],
      "address": "神奈川県横浜市中区海岸通1丁目 象の鼻テラス内",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "象の鼻カフェ 神奈川県横浜市中区海岸通1丁目 象の鼻テラス内",
      "sourceUrls": [
        "https://zounohana.com/cafe/"
      ],
      "shortDescription": "象の鼻テラス内のカフェ。象の顔をかたどったソフトクリームが特徴。",
      "demoHighlights": [
        "象の形のソフトクリームで会話に具体性を出す",
        "本屋の後に海辺で休む提案へつなぐ"
      ],
      "suggestedAxes": [
        "カフェ"
      ],
      "visitNotes": "通常10:00–18:00、フードL.O.17:00・ドリンクL.O.17:30。公式掲載のソフトクリーム550円。変更時は公式優先。",
      "priority": 1,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-kita-books",
      "name": "LOCAL BOOK STORE kita.",
      "area": "日本大通り",
      "category": [
        "書店",
        "コミュニティ",
        "本"
      ],
      "address": "神奈川県横浜市中区日本大通33番地 神奈川県住宅供給公社ビル1F mass×mass",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "LOCAL BOOK STORE kita. 神奈川県横浜市中区日本大通33番地 神奈川県住宅供給公社ビル1F mass×mass",
      "sourceUrls": [
        "https://kitabooks.jp/info/",
        "https://massmass.jp/project/kita_2025/",
        "https://style100.city.yokohama.lg.jp/stylepartners/stylepartners-2131/"
      ],
      "shortDescription": "一棚ごとに棚主が異なるシェア型書店。本の選び方や棚主のメッセージから新しい本に出会える。",
      "demoHighlights": [
        "定番観光地だけではない横浜を見せる",
        "棚ごとのおすすめから『本を見つける』場面を作る"
      ],
      "suggestedAxes": [
        "本"
      ],
      "visitNotes": "2024年に馬車道から日本大通りへ移転。旧住所を使わない。平日9:00–17:00、週末は営業カレンダー確認。",
      "priority": 1,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-newspark",
      "name": "ニュースパーク（日本新聞博物館）",
      "area": "日本大通り",
      "category": [
        "博物館",
        "情報",
        "歴史"
      ],
      "address": "神奈川県横浜市中区日本大通11 横浜情報文化センター2F受付",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "ニュースパーク（日本新聞博物館） 神奈川県横浜市中区日本大通11 横浜情報文化センター2F受付",
      "sourceUrls": [
        "https://newspark.jp/"
      ],
      "shortDescription": "新聞の歴史や情報との向き合い方を学ぶ博物館。資料展示と体験型の展示がある。",
      "demoHighlights": [
        "『街で得た情報をどう見るか』という会話へ展開",
        "屋内の学びスポットとして屋外候補と比較"
      ],
      "suggestedAxes": [],
      "visitNotes": "通常10:00–17:00、最終入館16:30。月曜休館（祝日等は翌平日）。大人400円。",
      "priority": 2,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-literature-museum",
      "name": "神奈川近代文学館",
      "area": "山手",
      "category": [
        "文学館",
        "本",
        "文化"
      ],
      "address": "神奈川県横浜市中区山手町110",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "神奈川近代文学館 神奈川県横浜市中区山手町110",
      "sourceUrls": [
        "https://www.kanabun.or.jp/guidance/visit/info/",
        "https://www.pref.kanagawa.jp/docs/yi4/cnt/f7788/index.html"
      ],
      "shortDescription": "神奈川にゆかりのある文学者の資料を紹介する文学館。展示室と閲覧室がある。",
      "demoHighlights": [
        "港の見える丘公園と文学の寄り道を組み合わせる",
        "作品・作家への関心から行き先を提案"
      ],
      "suggestedAxes": [
        "本"
      ],
      "visitNotes": "展示室9:30–17:00、入館16:30まで。月曜休館（祝日開館）等。山手の高低差を考慮。",
      "priority": 2,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-harbor-view-park",
      "name": "港の見える丘公園",
      "area": "山手",
      "category": [
        "公園",
        "展望",
        "花"
      ],
      "address": "神奈川県横浜市中区山手町114",
      "position": {
        "longitude": 139.655,
        "latitude": 35.439889
      },
      "positionStatus": "reference_point_not_entrance",
      "geocodingQuery": "港の見える丘公園 神奈川県横浜市中区山手町114",
      "sourceUrls": [
        "https://www.city.yokohama.lg.jp/kurashi/machizukuri-kankyo/midori-koen/koen/koen/daihyoteki/kouen007.html"
      ],
      "shortDescription": "横浜港を望む高台の公園。イングリッシュローズの庭や香りの庭がある。",
      "demoHighlights": [
        "海沿いとは異なる高い視点を見せる",
        "庭園と文学館で『自然と本』の提案を作る"
      ],
      "suggestedAxes": [
        "自然",
        "散歩"
      ],
      "visitNotes": "公園は24時間、フランス山は夜間閉鎖あり。坂・階段がある地域。花の現在の開花は未確認。",
      "priority": 2,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": [],
      "positionSourceUrl": "https://en.wikipedia.org/wiki/Harbor_View_Park_(Yokohama)"
    },
    {
      "id": "yokohama-kanteibyo",
      "name": "横濱關帝廟",
      "area": "中華街",
      "category": [
        "文化",
        "歴史",
        "建築"
      ],
      "address": "神奈川県横浜市中区山下町140",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "横濱關帝廟 神奈川県横浜市中区山下町140",
      "sourceUrls": [
        "https://yokohama-kanteibyo.com/hours-and-directions/"
      ],
      "shortDescription": "三国志の関羽を祀る中華街の廟。装飾豊かな建築が特徴。",
      "demoHighlights": [
        "港の風景から色鮮やかな建築へ場面を変える",
        "建物の装飾や関羽の由来を発見として紹介"
      ],
      "suggestedAxes": [
        "散歩"
      ],
      "visitNotes": "通常9:00–19:00。祭事などによる変更は公式確認。",
      "priority": 2,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-kurumicco-factory",
      "name": "Kurumicco Factory",
      "area": "新港",
      "category": [
        "カフェ",
        "スイーツ",
        "工場見学"
      ],
      "address": "神奈川県横浜市中区新港2-14-1 横浜ハンマーヘッド2階",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "Kurumicco Factory 神奈川県横浜市中区新港2-14-1 横浜ハンマーヘッド2階",
      "sourceUrls": [
        "https://beniya-ajisai.co.jp/kf/"
      ],
      "shortDescription": "クルミッ子の工場・カフェ・ショップ。ガラス越しに製造の様子を見学できる。",
      "demoHighlights": [
        "『食べる』に『できるまでを見る』を加える",
        "港のクレーンとお菓子の工場でものづくりを話題に"
      ],
      "suggestedAxes": [
        "カフェ"
      ],
      "visitNotes": "見学予約不要。見学11:00–18:00、製造工程は15時頃まで。カフェ11:00–20:00（L.O.19:00）。稼働は状況で変動。",
      "priority": 2,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-cupnoodles-museum",
      "name": "カップヌードルミュージアム 横浜",
      "area": "新港",
      "category": [
        "博物館",
        "食",
        "体験"
      ],
      "address": "神奈川県横浜市中区新港2-3-4",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "カップヌードルミュージアム 横浜 神奈川県横浜市中区新港2-3-4",
      "sourceUrls": [
        "https://www.cupnoodles-museum.jp/ja/yokohama/guide/",
        "https://www.cupnoodles-museum.jp/ja/yokohama/guide/admission/"
      ],
      "shortDescription": "インスタントラーメンと発明・創造的思考をテーマにした体験型ミュージアム。",
      "demoHighlights": [
        "オリジナルのカップづくりなど目的のある寄り道候補",
        "雨の日の屋内候補を比較する場面に使う"
      ],
      "suggestedAxes": [],
      "visitNotes": "確認日2026-09-15の公式表示は『本日は休館日』。今日開いている候補へ入れない。体験は予約・整理券等を個別確認。",
      "priority": 3,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-kishamichi",
      "name": "汽車道",
      "area": "桜木町・新港",
      "category": [
        "遊歩道",
        "鉄道遺構",
        "海辺"
      ],
      "address": "神奈川県横浜市中区新港・西区みなとみらい周辺",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "汽車道 神奈川県横浜市中区新港・西区みなとみらい周辺",
      "sourceUrls": [
        "https://www.city.yokohama.lg.jp/kanko-bunka/minato/taikan/zentai/kisyamiti.html",
        "https://www.mm21railway.co.jp/enjoy/spot/photographing.html"
      ],
      "shortDescription": "かつての鉄道の跡を活用した海辺の散歩道。桜木町側と新港地区を結ぶ。",
      "demoHighlights": [
        "線路や橋の痕跡を『普段なら通り過ぎる発見』にする",
        "みなとみらいの街並みへ視界が開ける導入"
      ],
      "suggestedAxes": [
        "散歩"
      ],
      "visitNotes": "線状のスポット。地図登録では代表点と経路の入口を区別。住所は周辺地域表記。",
      "priority": 2,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-marine-walk",
      "name": "MARINE & WALK YOKOHAMA",
      "area": "新港",
      "category": [
        "買い物",
        "海辺",
        "カフェ"
      ],
      "address": "神奈川県横浜市中区新港1-3-1",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "MARINE & WALK YOKOHAMA 神奈川県横浜市中区新港1-3-1",
      "sourceUrls": [
        "https://marineandwalk.jp/access/",
        "https://www.kanagawa-kankou.or.jp/kanagawayokohamadc/spot/1763"
      ],
      "shortDescription": "海沿いに店舗や飲食店が並ぶオープンモール。外の通路を歩きながら店を巡れる。",
      "demoHighlights": [
        "海辺のテラスや壁画を写真の題材にする",
        "買い物と休憩を気分で選ぶ候補比較"
      ],
      "suggestedAxes": [
        "散歩",
        "カフェ"
      ],
      "visitNotes": "物販11:00–20:00、飲食11:00–22:00が基本。店舗により異なる。",
      "priority": 3,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    },
    {
      "id": "yokohama-hammerhead-park",
      "name": "ハンマーヘッドパーク",
      "area": "新港",
      "category": [
        "広場",
        "産業遺産",
        "海辺"
      ],
      "address": "神奈川県横浜市中区新港2-14-1 横浜ハンマーヘッド周辺",
      "position": null,
      "positionStatus": "needs_geocoding",
      "geocodingQuery": "ハンマーヘッドパーク 神奈川県横浜市中区新港2-14-1 横浜ハンマーヘッド周辺",
      "sourceUrls": [
        "https://www.hammerhead.co.jp/facility/",
        "https://www.hammerhead.co.jp/history/"
      ],
      "shortDescription": "歴史あるハンマーヘッドクレーンを中心とした海辺の広場。",
      "demoHighlights": [
        "大きなクレーンをシルエットで印象づける",
        "港の荷役の歴史から工場見学へつなぐ"
      ],
      "suggestedAxes": [
        "散歩"
      ],
      "visitNotes": "施設と隣接する屋外広場を区別。住所は施設側の代表住所。",
      "priority": 3,
      "checkedAt": "2026-09-15",
      "openNow": null,
      "photoUrls": []
    }
  ],
  "scenarios": [
    {
      "id": "books-by-the-sea",
      "title": "本とカフェから海へ",
      "authoredPrompt": "横浜で本を見つけて、カフェで休んで、最後に海を眺めたい。",
      "spotIds": [
        "yokohama-kita-books",
        "yokohama-zounohana-cafe",
        "yokohama-osanbashi",
        "yokohama-yamashita-park"
      ],
      "notes": "最優先。場所ごとの理由を説明しやすい。訪問済み体験ではなくデモ用の相談文。"
    },
    {
      "id": "harbor-history",
      "title": "港の景色と小さな発見",
      "authoredPrompt": "横浜らしい景色を見ながら、街の歴史も少し知れる散歩がしたい。",
      "spotIds": [
        "yokohama-kishamichi",
        "yokohama-red-brick",
        "yokohama-zounohana-park",
        "yokohama-osanbashi",
        "yokohama-yamashita-park"
      ],
      "notes": "線路・煉瓦・防波堤・木のデッキを発見として使う。"
    },
    {
      "id": "gardens-and-literature",
      "title": "高台の庭園と文学",
      "authoredPrompt": "緑と本を楽しみたい。横浜で景色のよい場所にも寄れる？",
      "spotIds": [
        "yokohama-kanteibyo",
        "yokohama-harbor-view-park",
        "yokohama-literature-museum"
      ],
      "notes": "高低差あり。経路・所要時間・開館は正式サービスで確認。"
    }
  ]
}
```

