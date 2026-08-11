---
name: Native API base compatibility
description: API URL handling for Capacitor builds and older installed releases
---

Capacitor builds must normalize the configured API origin before appending `/api`; configuration may already contain a scheme, a trailing slash, or the `/api` suffix. During migration, the API can temporarily mount the same router at `/api/api` so older native builds do not fail with 404 while users update.

**Why:** Native bundles persist the API base and can remain installed after the web source changes. A duplicated `/api` segment produces a misleading route-not-found error in Admin create/edit flows.

**How to apply:** Keep client normalization and the compatibility mount until the old native release has aged out, then remove the alias in a deliberate release cleanup.