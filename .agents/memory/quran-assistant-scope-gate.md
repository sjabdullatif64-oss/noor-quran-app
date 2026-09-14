---
name: Quran Assistant scope gate
description: Durable rules for keeping Quran Assistant server-side and non-general-purpose
---

The Quran Assistant must classify scope on the server before user lookup, daily-question reservation, or AI generation. Clearly unrelated intents such as general programming, websites/apps, image creation, online work platforms, money-making, and general relationships must be rejected without consuming usage.

**Why:** The Assistant is a Quran/Islamic feature, not a general chatbot; model prompts alone cannot reliably prevent unrelated answers or protect the daily limit.

**How to apply:** Keep the classifier conservative and deterministic across the user's language, not only English. Accept Quran/Islamic terms plus clearly direct theological questions such as who created the world or the heavens and earth. Keep simple Islamic answers eligible without requiring a Quran keyword, and leave verified-reference selection downstream of the scope decision.