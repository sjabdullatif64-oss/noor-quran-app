---
name: Quran Assistant scope gate
description: Durable rules for keeping Quran Assistant server-side and non-general-purpose
---

The Quran Assistant must classify scope on the server before user lookup, daily-question reservation, or AI generation. Clearly unrelated intents such as general programming, websites/apps, image creation, online work platforms, money-making, and general relationships must be rejected without consuming usage.

**Why:** The Assistant is a Quran/Islamic feature, not a general chatbot; model prompts alone cannot reliably prevent unrelated answers or protect the daily limit.

**How to apply:** Keep the classifier conservative and deterministic across the user's language, not only English. Accept Quran/Islamic terms plus clearly direct theological questions such as who created the world or the heavens and earth. Keep simple Islamic answers eligible without requiring a Quran keyword, and leave verified-reference selection downstream of the scope decision.

The Assistant request should carry a selected Ayah as explicit structured context alongside the raw user question. The server must scope-check the raw question before composing the AI prompt with that context.

**Why:** Including Quran text in a single precomposed question can make an unrelated request look Islamic to the scope classifier and makes it difficult to verify which Ayah reached the API.

**How to apply:** Preserve the exact Surah, Ayah number, and displayed Ayah fields from the client handoff; do not re-fetch or infer a replacement Ayah on the server.

For common guidance requests, the server may preselect a small set of verified reference coordinates (for example patience or worry), while the AI only supplies explanation and optional additional coordinates.

**Why:** The model can return a generic answer or omit references even when the user explicitly asks which Ayah to read; deterministic coordinates keep the user-facing Ayah card tied to the verified Quran source.

**How to apply:** Resolve coordinates server-side, fetch Arabic and the selected-language translation from the existing verified source, and keep all Read, Listen, and Bookmark actions on the returned Ayah cards.