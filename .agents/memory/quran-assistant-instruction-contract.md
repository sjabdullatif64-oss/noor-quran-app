---
name: Quran Assistant instruction contract
description: Durable rules for multilingual scope, verified references, follow-ups, and response isolation.
---

The Assistant must classify the raw question before user lookup, usage reservation, or AI generation, while allowing a narrowly recognized follow-up only when a selected Ayah or prior conversation supplies Quran context. References must be verified server-side, and Quran text, translations, Hadith-based practices, and medical guidance must remain clearly distinct.

**Why:** Generic or stale answers, unrelated-question usage consumption, and duplicated context/audio state are user-visible failures that are difficult to correct after the request is reserved.

**How to apply:** Keep scope and usage server-authoritative; pass prior messages as bounded context; use deterministic topic references only as conservative supplements; assign each successful/refusal response and rendered Ayah audio a stable response identity.