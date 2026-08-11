---
name: Welcome campaign media storage
description: Persistent image, GIF, and video handling for the welcome campaign
---

Welcome Campaign media must be stored in Object Storage rather than as base64 text in Google Sheets. Admin uploads are converted to stored media paths, and the public campaign route streams those files with the correct content type and byte-range support.

**Why:** Google Sheets cells are not reliable binary media storage; large base64 values can be truncated or fail to render in browser and Capacitor media elements.

**How to apply:** Keep the Admin UI and campaign schema stable. When an existing campaign still contains base64 media, re-save it once through Admin to migrate it to the Object Storage-backed path.