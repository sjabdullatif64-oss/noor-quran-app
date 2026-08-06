---
name: Service-worker app-shell cache
description: The Noor Quran PWA service worker caches same-origin app-shell responses cache-first, which can hide fresh route and UI changes in preview.
---

# Service-worker app-shell cache

The web app's service worker uses a versioned cache for same-origin shell assets and serves cache hits before the network. A running Vite workflow does not guarantee that a browser preview is using the latest `index.html` or JavaScript bundle.

**Why:** During Practice Mode verification, the source and Vite bundle contained the new routes while the preview continued showing the old dashboard and a 404. The stale app-shell cache made a valid routing change look broken.

**How to apply:**
- When a route or app-shell UI change appears absent after a workflow restart, check the service-worker cache version and bump it with the change.
- Use a cache-busting query parameter on verification screenshots as well, but treat that as insufficient if the service worker has already cached the shell response.
- Re-run the workflow and verify both the direct route and the originating navigation surface after invalidating the cache.