---
name: Country data flow contract
description: The invariant connecting GPS reverse geocoding, local storage, user presence, Sheets, and Admin country analytics
---

Country display names and country codes are different data: reverse geocoding must preserve the human-readable name for prayer UI and the ISO alpha-2 code for analytics. The ISO code must travel from local GPS storage through registration and presence requests into the Users countryCode column; missing data remains ZZ/Unknown.

**Why:** The server and Admin analytics aggregate ISO country codes, while the client’s location UI stores display names. Dropping `address.country_code` or ignoring the request body silently converts valid locations into Unknown.

**How to apply:** Keep server headers authoritative when present, accept a validated client country-code fallback, update existing users on presence after GPS resolution, and never infer country from selected translation language.