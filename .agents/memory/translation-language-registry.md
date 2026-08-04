---
name: Translation language registry
description: Non-obvious requirements for expanding Quran translation language support
---

Adding a Quran translation language is not just a selector change. The language must be represented consistently in the shared type/catalog, saved-language validation, labels, direction/TTS metadata, source-provider mapping, and any offline/download surfaces.

**Why:** The app has more than one translation provider with different response shapes, and localStorage changes do not notify other mounted React screens in the same browser session by themselves.

**How to apply:** Preserve the original language order, keep provider-specific parsing behind one shared fetch adapter, validate new language IDs in settings storage, and emit/subscribe to a language-change event for live Home and saved-ayah refreshes.