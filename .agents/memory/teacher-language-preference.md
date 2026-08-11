---
name: AI Teacher language preference
description: Language mode behavior for AI Teacher explanations and speech prompts
---

AI Teacher has a private two-option preference: follow the app’s selected Quran translation language, or use English only. It defaults to the selected language and must not change the app-wide Quran translation setting.

**Why:** Users may want Quran translations in one language while receiving Teacher guidance in English; coupling the two settings makes either workflow inconvenient.

**How to apply:** Keep this mode scoped to the Teacher lesson experience. Recompute Teacher copy and speech language from the mode plus the current app translation language, and preserve the choice locally between lessons.