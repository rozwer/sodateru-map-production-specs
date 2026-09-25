# UI-MAP #8: personal map empty state (2026-09-25)

In an isolated account with no records or themes, the `personal-map` screen loaded from the existing API. The “すべて” filter was selected, but the empty sheet previously said “このテーマの記録はまだありません”, which described a selected theme that did not exist.

The all-records empty state now says that the map has no records yet and points to recording an experience. The theme-specific message remains for an actual theme filter. The empty sheet text and action have interior spacing at mobile and desktop widths.

At 390 × 844, the replay button was disabled, its empty explanation and the “体験を記録する” action were visible and reachable. At 1440 × 900, the same empty content appeared in the left sheet without clipping. [390px screenshot](personal-empty-390.png) · [1440px screenshot](personal-empty-1440.png).

The account had no theme or record, so a theme-filtered empty state and populated personal map were not rechecked here. Their previous evidence and child Issues remain separate. The external map sometimes showed a partial tile-loading warning during these checks.
