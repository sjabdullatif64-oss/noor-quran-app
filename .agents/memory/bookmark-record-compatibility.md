---
name: Bookmark record compatibility
description: Storage rules for extending the local bookmark system beyond Ayah records
---

The shared bookmark storage is append-compatible: legacy Ayah records may have no `type`, while whole-Surah records use `type: "surah"`. Ayah and Surah identity/removal checks must stay scoped to their record type.

**Why:** Existing users already have Ayah bookmarks in localStorage, and a second storage key would split the Bookmarks section and risk losing or hiding established data.

**How to apply:** Add new bookmark kinds to the existing union and filter Surah records out of Ayah reader state. Do not reuse the Favorites storage or change Ayah-level reader handlers when adding whole-Surah actions.