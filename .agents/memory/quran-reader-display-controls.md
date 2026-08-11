---
name: Quran reader display controls
description: Shared implementation boundary for Quran ayah visibility and translation-language controls
---

Surah and Juz readers use the existing three-dot ayah menu for transliteration visibility, translation visibility, and translation-language selection. Visibility preferences are display-only and persisted independently; Arabic and transliteration source data remain unchanged. Language changes use the shared saved-language registry and change event so Home, favorites, bookmarks, Teacher, and reader data stay synchronized.

**Why:** The Quran app has multiple readers and multiple translation consumers. Duplicating language lists or mutating ayah data would cause inconsistent translations, stale views, or altered saved/audio content.

**How to apply:** Add future ayah display preferences to the shared `ayah-display` store and apply them only at render/share/copy boundaries. Use `ALL_LANGUAGES`, `getLang`, `setLang`, and `TRANSLATION_LANGUAGE_CHANGED_EVENT` rather than page-local language registries or storage keys.