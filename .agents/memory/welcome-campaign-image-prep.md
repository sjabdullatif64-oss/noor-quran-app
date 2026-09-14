---
name: Welcome Campaign image upload budget
description: The browser-side still-image preparation budget must stay below the existing campaign API limits.
---

Keep confirmed still-image data URLs at or below 1.85 million characters. The existing client rejects 1.9 million, the API accepts 2 million, and Object Storage allows up to 4 MiB decoded; GIFs and video must remain on their existing direct-upload path.

**Why:** The client and API limits are character-based while storage is decoded-byte-based, so a small buffer prevents base64 expansion and boundary failures without inventing a new server contract.

**How to apply:** Preserve already-safe small images; resize/compress only when dimensions or encoded length require it, attach the prepared data URL only after confirmation, and resolve stored `/campaigns/media/...` paths through `API_BASE` in Admin previews.

Admin previews cannot treat stored campaign paths as root-relative browser assets: `/campaigns/media/...` must become `${API_BASE}/campaigns/media/...`, while data URLs and absolute external URLs stay unchanged.

**Why:** Public campaign responses intentionally store short API media paths, and the web app is served through an API prefix; omitting that prefix produces a browser 404 even though the media endpoint is healthy.

**How to apply:** Reuse the Admin media URL resolver for still-image, GIF, and video previews whenever a value may be a stored campaign path.