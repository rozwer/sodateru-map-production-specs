# DEMO-MEDIA 生成画像とプロンプト

生成日: 2026-09-15

生成方法: Codex built-in `image_gen`

用途: デモDBの体験記録に表示する、架空の場所・活動の写真

画面上の各対象記録には次の開示文を追記する。

> 添付写真はデモ用に画像生成したイメージです。実在の店舗・景色を撮影したものではありません。

元画像は生成時のPNG、リポジトリ内の配布物は長辺1280pxのJPEGである。生成画像には人物、読み取れる文字、ロゴ、ブランド、透かしを入れない。

## 素材一覧

| ファイル | サイズ | SHA-256 |
| --- | ---: | --- |
| `higashiyama-park-generated.jpg` | 1280 x 853 | `aa076cb355ed8d1214cfc8e86be8cf1380040c623388d60d0d4c2a218b50ba41` |
| `motoyama-bookshop-generated.jpg` | 1280 x 720 | `0d923c1b465e623274ed2f7a47adb827a2570aa588fc4ff6339474b06fa3493d` |
| `motoyama-cafe-generated.jpg` | 1280 x 853 | `891faca9d0899d2d2f9484c094f679769b3684e049c015c00a616c8734a83cc6` |
| `neighborhood-bakery-generated.jpg` | 1280 x 720 | `39216dabbcdee7c5a2187ec686039599e9654caeebe082ffc364568d47968b71` |
| `neighborhood-shrine-generated.jpg` | 1280 x 720 | `f6f8abfdae36ce58a72dc8900daff0b57f1a9a5574c6c3f6e2b884f6abaa8cf7` |
| `reading-diary-generated.jpg` | 1280 x 853 | `358c326d6850429e787d5cd37fc370c2708e9a9dd3ccb239de79304bde99736c` |
| `yokohama-seaside-venue-generated.jpg` | 1280 x 720 | `ce03a7e1037bc528b84d8375a2c0f665a25caed7c858cfce8497b74f2cd3b5e5` |
| `yokohama-urban-hotel-generated.jpg` | 1280 x 720 | `02f0b3d7de3750645a534ca3a64c2d6c0397d6c1f888674380fe77fc46f6a485` |
| `yokohama-waterfront-generated.jpg` | 1280 x 853 | `b640dae55eee652cedca264d76f9e735b936e3dd2f94ef7a164801b29cb8ca7e` |

## 本山風カフェ

出力: `motoyama-cafe-generated.jpg`

```text
Use case: photorealistic-natural
Asset type: landscape place photo for a local walking-map demo
Primary request: an imagined small neighborhood cafe evocative of Motoyama, Nagoya, centered on a warm wooden table holding one simple ceramic cup of coffee and one modest baked pastry on a small plate
Scene/backdrop: cozy, quiet, unbranded cafe interior beside a window; subtle greenery and a softly blurred ordinary Japanese streetscape outside; generic location, not a depiction of any identifiable real business
Subject: the coffee, baked pastry, and tactile wooden tabletop
Style/medium: photorealistic natural editorial photography with believable everyday detail
Composition/framing: horizontal 3:2 landscape frame, seated eye-level medium-wide view, intimate but with enough surrounding cafe context, natural depth of field
Lighting/mood: gentle daylight entering through the window, calm and inviting, natural color balance
Materials/textures: visible wood grain, matte ceramic, realistic flaky baked pastry, soft fabric and plaster textures in the background
Constraints: no people; no text; no logos; no signage; no trademarks; no watermark; no identifiable real venue or exact storefront likeness
Avoid: staged commercial gloss, fantasy decor, CGI or illustration look, excessive props
```

## 東山風公園

出力: `higashiyama-park-generated.jpg`

```text
Use case: photorealistic-natural
Asset type: landscape place photo for a local walking-map demo
Primary request: an imagined green urban park evocative of the Higashiyama area of Nagoya, with a pleasant walking path beside a calm pond and one simple park bench
Scene/backdrop: lush mature broadleaf trees and layered greenery in a maintained yet natural Japanese city park; generic location, not an exact depiction of any identifiable real site
Subject: the gently curving pedestrian path, pond water, and bench integrated naturally into the landscape
Style/medium: photorealistic natural location photography with believable foliage, paving, water, and everyday imperfections
Composition/framing: horizontal 3:2 landscape frame at walking eye level; the path leads naturally into the scene while the pond and bench create a balanced, spacious view
Lighting/mood: soft morning daylight filtering through leaves, fresh, quiet, restorative, natural color balance
Materials/textures: realistic tree bark, varied leaves, slightly weathered paving, subtle reflections and ripples on the pond, understated wood-and-metal bench
Constraints: no people; no animals; no text; no logos; no signs; no trademarks; no watermark; no distinctive landmark; no claim of documenting a real place
Avoid: fantasy garden styling, extreme saturation, pristine CGI surfaces, dramatic tourism-ad effects
```

## 横浜港風海辺公園

出力: `yokohama-waterfront-generated.jpg`

```text
Use case: photorealistic-natural
Asset type: landscape place photo for a local walking-map demo
Primary request: an imagined waterfront urban park evocative of Yokohama Harbor and the atmosphere of Yamashita Park, featuring a broad seaside walking promenade beside calm bay water
Scene/backdrop: a generic Japanese harborfront park with mature shade trees, restrained flower beds, a low waterfront railing, open water, and a softly distant nondescript port skyline; not an exact depiction of any identifiable real place
Subject: the inviting empty promenade and its relationship to the sea and greenery
Style/medium: photorealistic natural location photography with believable everyday textures
Composition/framing: horizontal 3:2 landscape frame at walking eye level; the promenade leads gently into the distance while water and park greenery share the view
Lighting/mood: soft clear late-afternoon daylight, light coastal haze, calm and refreshing, natural color balance
Materials/textures: realistic paving, lightly weathered railing, mature tree bark and leaves, subtle ripples and reflections on the bay
Constraints: no people; no readable text; no logos; no signage; no trademarks; no watermark; no recognizable landmark; no exact real-site documentation
Avoid: famous Yokohama landmarks, named ships, flags with symbols, tourism-ad gloss, extreme saturation, CGI or illustration look
```

## 読書日記

出力: `reading-diary-generated.jpg`

```text
Use case: photorealistic-natural
Asset type: landscape activity photo for a reading-diary entry in a walking-map demo
Primary request: a calm everyday reading scene on a wooden desk with an open book, an open notebook, and one simple ceramic cup of coffee, with no person present
Scene/backdrop: quiet home or small library desk near soft window light, uncluttered and unbranded
Subject: the open book, notebook, and coffee arranged naturally as if someone briefly stepped away
Style/medium: photorealistic natural editorial still-life photography with believable everyday imperfections
Composition/framing: horizontal 3:2 landscape frame, gentle three-quarter overhead view, intimate medium close-up with clear visual hierarchy
Lighting/mood: soft diffused window light, warm and contemplative, natural color balance
Materials/textures: visible wood grain, matte paper, lightly worn book edges, matte ceramic
Constraints: no people; the book's printed lines must be too softly out of focus or too small to decipher; the notebook must contain no legible writing; no readable text anywhere; no logos; no trademarks; no watermark
Avoid: identifiable book cover, readable characters or words, decorative typography, excessive props, staged commercial gloss, CGI or illustration look
```

## 近所の神社

出力: `neighborhood-shrine-generated.jpg`

```text
Use case: photorealistic-natural
Asset type: landscape photo for a Japanese walking-map demo
Primary request: a quiet, authentic neighborhood Shinto shrine in Japan, photographed naturally during a calm daytime walk
Scene/backdrop: a modest shrine precinct surrounded by mature green trees, with a traditional wooden shrine building, a stone-paved approach, and one simple torii gate
Subject: the wooden shrine building and the inviting stone path leading toward it
Style/medium: photorealistic candid travel photograph, realistic Japanese architecture and everyday natural textures, understated documentary quality
Composition/framing: horizontal 16:9 landscape frame, eye-level walking viewpoint, balanced depth along the approach, no dramatic wide-angle distortion
Lighting/mood: soft diffused midday daylight, tranquil and welcoming, natural color balance
Materials/textures: aged unpainted wood grain, weathered stone paving, subtle moss and foliage detail
Constraints: no people, no readable text, no signs with lettering, no logos, no brands, no watermark; culturally and architecturally plausible; no fantasy elements
Avoid: staged tourism advertising, oversaturation, cinematic spectacle, cherry-blossom cliché, crowds
```

## 住宅街のパン屋

出力: `neighborhood-bakery-generated.jpg`

```text
Use case: photorealistic-natural
Asset type: landscape photo for a Japanese walking-map demo
Primary request: a small local shopping street inspired by a residential neighborhood in Nagoya, photographed naturally during an everyday walk
Scene/backdrop: a quiet, lived-in Japanese neighborhood street with a modest independent bakery storefront and a small well-kept flower bed, low-rise homes and local-scale shops nearby
Subject: the bakery exterior and flower bed as the gentle focal point of the street scene
Style/medium: photorealistic candid street photograph, authentic contemporary Japan, understated documentary quality
Composition/framing: horizontal 16:9 landscape frame, eye-level pedestrian viewpoint, natural perspective and comfortable walking distance
Lighting/mood: soft natural daytime light, calm and friendly neighborhood atmosphere, realistic neutral colors
Materials/textures: ordinary stucco, tile and wood storefront materials, slightly weathered pavement, healthy seasonal flowers
Constraints: no people, no readable text anywhere, blank or abstract storefront surfaces only, no logos, no brands, no watermark; geographically plausible for Nagoya; no identifiable real business
Avoid: staged advertising, luxury retail, tourist landmark, oversaturation, cinematic spectacle, legible Japanese characters
```

## 近所の本屋

出力: `motoyama-bookshop-generated.jpg`

```text
Use case: photorealistic-natural
Asset type: landscape photo for a Japanese walking-map demo
Primary request: a small independent neighborhood bookstore in Japan, photographed naturally during a quiet daytime walk
Scene/backdrop: a calm low-rise residential shopping street with a welcoming bookshop exterior, broad windows showing neatly arranged books, a simple recessed entrance, and a few modest potted plants
Subject: the bookshop facade and window display as the clear focal point
Style/medium: photorealistic candid street photograph, authentic contemporary Japan, understated documentary quality
Composition/framing: horizontal 16:9 landscape frame, eye-level pedestrian viewpoint, natural perspective and comfortable walking distance
Lighting/mood: soft clear daytime light, calm and inviting, realistic neutral colors
Materials/textures: slightly weathered wood and plaster, clean glass, ordinary pavement, natural book-paper texture visible through the windows
Constraints: no people, no readable text anywhere, book spines and signs must contain no legible lettering, blank or abstract facade surfaces only, no logos, no brands, no watermark; no identifiable real business
Avoid: staged advertising, luxury concept store, tourist landmark, oversaturation, cinematic spectacle, legible Japanese characters
```

## 横浜風の架空海辺イベント会場

出力: `yokohama-seaside-venue-generated.jpg`

```text
Use case: photorealistic-natural
Asset type: landscape photo for a Japanese walking-map demo
Primary request: a bright fictional seaside event venue with the relaxed coastal atmosphere of Yokohama, suitable for small community gatherings
Scene/backdrop: an airy waterfront courtyard with pale stucco walls, light wood pergolas, white canvas shade, sandy-toned paving, subtle coastal greenery, and a glimpse of blue bay water beyond; entirely original architecture
Subject: the welcoming open-air event courtyard and its connection to the waterfront
Style/medium: photorealistic natural architectural and travel photograph, refined but believable contemporary Japan
Composition/framing: horizontal 16:9 landscape frame, eye-level arrival viewpoint, generous depth through the courtyard, natural lens perspective
Lighting/mood: bright soft morning sunlight, fresh sea air, relaxed and open, realistic warm-neutral color balance
Materials/textures: limewashed stucco, pale weathered timber, linen canvas, textured stone paving, salt-tolerant grasses
Constraints: fictional venue only; do not reproduce any real venue facade or layout; no people, no readable text, no signage, no logos, no brands, no watermark
Avoid: branded beach club, tropical resort cliché, wedding ceremony setup, excessive luxury, oversaturation, dramatic cinematic effects
```

## 架空の現代ホテル外観

出力: `yokohama-urban-hotel-generated.jpg`

```text
Use case: photorealistic-natural
Asset type: landscape photo for a Japanese walking-map demo
Primary request: an original contemporary urban hotel exterior in Japan with a lively, approachable design, seen from the sidewalk during a morning walk
Scene/backdrop: a modern mid-rise hotel on a broad clean city street, with a distinctive but entirely fictional facade using warm concrete, glass, wood accents, varied window bays, a sheltered entrance, and small street trees
Subject: the hotel exterior and the calm morning sidewalk leading past its entrance
Style/medium: photorealistic candid architectural street photograph, authentic contemporary Japan, understated documentary quality
Composition/framing: horizontal 16:9 landscape frame, eye-level pedestrian viewpoint, three-quarter view showing both facade and morning sidewalk, natural perspective
Lighting/mood: clear gentle morning light with long soft shadows, welcoming urban atmosphere, realistic neutral colors
Materials/textures: board-formed concrete, clear glass, warm timber accents, metal window frames, tactile sidewalk paving and fresh greenery
Constraints: an original generated design only, inspired by the approachable energy of a modern Japanese city hotel but not reproducing OMO7 or any other real property; no people, no readable text, no hotel name, no signage, no logos, no brands, no watermark
Avoid: exact real-world facade, corporate tower, luxury palace, staged advertising, oversaturation, cinematic spectacle
```
