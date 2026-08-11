---
name: Noor Quran legacy cleanup boundary
description: Durable distinction between the active Noor Quran runtime and removed legacy project surfaces
---

The active Noor Quran runtime uses the Google Sheets API layer and the routed Capacitor/Vite app under `artifacts/islamic-app`. Marketplace product browsing and user submissions remain active even though the obsolete product admin panel was removed.

**Why:** The project retained several abandoned implementations at once: an Updates admin editor, a separate product-admin API, an unused PostgreSQL/Drizzle package, an unreferenced default Expo scaffold, and unrouted feature pages. Removing them required separating administrative/legacy code from active user-facing product, coin, Teacher, campaign, and Updates-reader behavior.

**How to apply:** Future cleanup should preserve `/api/products`, user product submission/editing, public Updates reading, Google Sheets persistence, and the current routed app. Treat the removed Admin Panel, old Apps Script CRUD backend, `lib/db`, `noor-quran-expo`, and unrouted page modules as abandoned unless a new explicit integration is added.