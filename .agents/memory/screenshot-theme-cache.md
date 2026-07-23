---
name: Screenshot caching for theme verification
description: When verifying visual changes like light/dark mode, the Screenshot tool can return cached images even after the page has re-rendered, causing false negatives.
---

# Screenshot caching for theme verification

When using the `Screenshot` tool to verify visual changes (especially light/dark mode toggles), the returned image may be cached by the browser or proxy. If the file sizes and sampled colors look identical across multiple screenshots, the image is likely stale.

**Why:** The Screenshot tool shares the same browser context, and the proxy may serve a previously-captured snapshot instead of re-rendering the current page state.

**How to apply:**
- Always append a cache-busting query parameter to the path, e.g. `/more?t=12345` or `/?theme-test=abc`, when taking verification screenshots after theme changes.
- Compare file sizes (and pixel samples if available) to confirm the image is fresh.
- Do not rely on a single repeated screenshot of the same path to confirm a fix; it may be the same cached frame.
