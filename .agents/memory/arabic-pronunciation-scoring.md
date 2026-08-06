---
name: Arabic pronunciation scoring
description: Arabic speech-recognition transcripts need weighted comparison and explicit no-input status handling.
---

Weighted Arabic edit distance should treat long-vowel ا/و/ي insertions and deletions as partial-cost differences, while consonant substitutions retain full cost. Normalize harakat, Quranic marks, tatweel, hamza carriers, alif forms, ya/alif-maqsura, ta-marbuta-like forms, punctuation, and joiners before comparison. Empty or placeholder recognizer output must remain distinct from timeout and recognition failure.

**Why:** Android recognition can return a phonetically reasonable spelling such as `باسمي` for vocalized `بِسْمِ`; ordinary Levenshtein over-penalizes the inserted long-vowel letters and turns a likely correct recitation into a retry.

**How to apply:** Keep the scoring threshold strict for consonant errors, expose edit operation counts for tests/debugging, and require real-device verification for observed recognizer transcripts before declaring pronunciation evaluation fixed.