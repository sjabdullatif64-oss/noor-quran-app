---
name: Translation proper-name boundary
description: Rules for preserving semantic divine terms while normalizing Allah in Quran translation output
---

Allah normalization must be source-backed: explicit Allah spellings can normalize directly, while generic `God`/`خدا` aliases require an original Arabic Allah token. Arabic orthography may omit the alif after attached prepositions, as in `لِلَّهِ`, so detection must recognize that form too.

**Why:** Global replacement incorrectly changed semantic `رب`, `پروردگار`, `Lord`, `God`, and `خدا`; Quran translations can also contain both an Allah proper name and a semantic Rabb term in the same ayah.

**How to apply:** Keep translation files and stored records unchanged. Pass the original Arabic ayah to both display and translation-audio output boundaries, and consume contextual generic-name matches conservatively so semantic terms remain intact.