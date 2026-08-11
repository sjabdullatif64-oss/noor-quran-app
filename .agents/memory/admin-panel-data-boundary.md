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