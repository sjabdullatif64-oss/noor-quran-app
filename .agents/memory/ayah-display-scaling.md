---
name: Ayah text zoom + explanatory-word toggle pattern
description: Cross-cutting display settings shared between Surah and Juz readers — CSS var scaling and display-layer-only text stripping
---

Two readers (Surah, Juz) render ayah text with different base Tailwind sizes and responsive breakpoints (Surah has `md:` variants + transliteration; Juz doesn't). A single flat `baseRem * scale` inline `fontSize` would flatten responsive breakpoints and force one reader's base sizes onto the other.

**Decision:** set a CSS custom property (`--ayah-scale`) on each page's own ayah-list container, then use per-page Tailwind arbitrary-value classes like `text-[calc(1.875rem*var(--ayah-scale))] md:text-[calc(2.25rem*var(--ayah-scale))]` on each text element, keeping each page's own base sizes intact.

**Why:** preserves each reader's existing responsive design while sharing one persisted "zoom level" (`noor-ayah-scale` in localStorage) and one pub/sub store (`src/lib/ayah-display.ts`) so changing the setting from either reader's menu live-updates both.

**How to apply:** any future per-ayah display setting (e.g. another text transform) should also be applied strictly at the render site of the `<p>` tag, never by mutating the underlying data arrays — those same arrays feed TTS audio playback and get persisted verbatim into bookmarks/favorites, so mutating them would silently change audio or saved data.
