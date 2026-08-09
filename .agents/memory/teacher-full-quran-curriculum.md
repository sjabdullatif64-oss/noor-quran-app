---
name: AI Teacher full-Quran curriculum
description: Durable rules for extending Teacher lessons and progressive phrase practice
---

The AI Teacher curriculum keeps its original lesson IDs and order, then appends a deterministic full-Quran path built from the bundled Arabic Quran data. New passages use stable IDs and verified word-by-word audio references.

**Why:** Existing completion records, recovery snapshots, practice stats, and locked progression all key off lesson IDs; replacing or renumbering the original catalog would make prior progress appear lost.

**How to apply:** Derive the passage length from valid completed curriculum lessons, increase it by one word per 30 completed lessons, and cap it at 10. Treat multi-word passages as complete phrases during scoring; single-word lessons retain the prior tolerant token behavior.