# UI-MAP #8: layer and object draft checks (2026-09-25)

## Map layers

- At 320 × 740, the theme and suggestion switches changed independently. The motorcycle switch remained disabled and was labelled as lacking display data. The settings-save limitation was visible in the sheet body. [320px screenshot](map-layers-320.png).
- The sheet body scrolled (`clientHeight` 413px, `scrollHeight` 634px). Its bottom “地図に戻る” button was reachable and returned to the map. The earlier `名古屋大学` search still showed four results and the selected marker after returning.
- Reopening the layer screen retained the two switch positions within this app session. The UI explicitly says the switches are a map preview and settings are not saved. At 1440 × 900, all rows and the return button were visible together. [1440px screenshot](map-layers-1440.png).
- This isolated account had no saved theme, suggestion, or friend markers to compare. Marker-level layer effects remain unverified with differing data.

## Object draft and placement

- At 320 × 740, the name, memo, color, size, and placement controls were reachable. A 25-character name was limited to 20; a 205-character memo was limited to 200.
- Entered a name and memo, selected orange and large, opened placement, used map zoom, then cancelled placement. The original name, memo, color, size, and coordinates were retained in the edit draft.
- Save displayed “目印の保存は現在利用できません。入力は保持されています。” and kept the input. The form Cancel returned to the map; reopening object edit showed an empty draft. No object was saved or deleted.

The map sometimes displayed its partial tile-loading warning. These checks do not establish map settings persistence or object CRUD, which remain unavailable in the current UI/API integration.
