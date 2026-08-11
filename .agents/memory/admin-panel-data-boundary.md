---
name: Admin panel data boundary
description: Rules for the new private Admin Panel over Teacher snapshots and Google Sheets-backed content.
---

Admin analytics must use a read-only, minimized projection of decrypted Teacher snapshots. Never return recovery material, device identifiers, raw local storage, encrypted fields, or complete learner snapshots to the admin client.

**Why:** Teacher accounts contain recovery credentials and sensitive learner data; the dashboard only needs aggregate progress, lesson completion, level placement, and minimized learner rows.

**How to apply:** Keep analytics endpoints separate from account restore/save routes, avoid mutation-oriented hydration helpers, and preserve server-side authorization before decrypting or aggregating.

Google Sheets schema extensions must be appended after established columns and initialized non-destructively. Public product ordering is an optional trailing field so historical rows and active coin/user columns remain compatible.

**Why:** The Sheets layer is append/update-by-index and existing production data depends on stable column positions.

**How to apply:** Add new headers at the end, default missing legacy cells safely, and keep public sorting behavior backward-compatible for rows without the new field.

Legacy Products rows may have an empty `id` and the historical `Image` category. Admin product reads should expose a stable derived ID for those rows, and edit validation should preserve that category rather than rejecting an otherwise valid legacy product.

**Why:** The catalog can render legacy rows successfully but edit requests need a non-empty `/products/:id` path, and strict new-category validation otherwise turns a harmless same-value edit into a 400.

**How to apply:** Derive the ID deterministically from the row until it is written back by an edit, allow `Image` only on product PATCH compatibility, and keep product creation restricted to the current category enum.

Audience activity is privacy-safe and aggregate-only: country/last-seen fields are appended to Users, raw IPs are never stored, and missing geo headers remain `Unknown`.

**Why:** Admin needs country and activity windows without exposing individual reader identities or changing the established Users column positions.

**How to apply:** Update presence on registration and a low-frequency heartbeat, calculate 5-minute/24-hour/30-day unique-user windows server-side, and present only country buckets and totals in Admin.

Location permission requests use a shared branded pre-permission dialog across Prayer Times, Settings, and Qibla; denied states offer retry plus native app settings.

**Why:** Direct geolocation calls produced inconsistent first-use UX and no recovery path after Android denial, while the app already has a native settings bridge.

**How to apply:** Show the app-colored explanation before the OS prompt, request location only from the user action, and open app settings through `capacitor-native-settings` when permission is blocked.