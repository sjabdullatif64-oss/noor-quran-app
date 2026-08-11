---
name: Translation language registry
description: Non-obvious requirements for expanding Quran translation language support
---

Adding a Quran translation language is not just a selector change. The language must be represented consistently in the shared type/catalog, saved-language validation, labels, direction/TTS metadata, source-provider mapping, and any offline/download surfaces.

**Why:** The app has more than one translation provider with different response shapes, and localStorage changes do not notify other mounted React screens in the same browser session by themselves.

**How to apply:** Preserve the original language order, keep provider-specific parsing behind one shared fetch adapter, validate new language IDs in settings storage, and emit/subscribe to a language-change event for live Home and saved-ayah refreshes.

For Divine Name display normalization, localize only explicit written forms of Allah's proper name according to the selected translation language. Keep semantic words such as English "God", "Lord", and Urdu "خدا" unchanged.

**Why:** Translation providers mix localized Divine Name spellings with ordinary theological words; broad replacement changes the translation's meaning and can damage unrelated text.

**How to apply:** Keep this normalization in the shared translation display boundary; scope aliases by language and word boundaries so online, offline, readers, saved ayahs, and share/copy output render consistently while raw translations, caches, TTS input, saved records, and the original Arabic Quran field remain untouched.

AI Teacher translation language is a separate preference from the Quran reader/settings language; Teacher defaults to English and changes only from its own lesson control.

**Why:** Users may choose a different translation from an ayah's three-dot menu without wanting Teacher guidance or lesson translations to change.

**How to apply:** Store and broadcast Teacher language under its own setting/event, fetch lesson translation text with that value, and never subscribe Teacher to the reader's global translation-language event.