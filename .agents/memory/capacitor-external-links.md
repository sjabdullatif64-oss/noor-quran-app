---
name: Capacitor external URL opening
description: window.open(_blank) does not open external URLs in Capacitor WebView; use @capacitor/browser Browser.open() instead
---

## Rule
In a Capacitor WebView (Android/iOS), `window.open(url, '_blank')` does NOT open external URLs in the system browser. Use `@capacitor/browser` `Browser.open({ url })` via the `openUrl()` helper in `src/lib/capacitor.ts`.

**Special schemes** (mailto:, market://, tel:) must go through `window.open()` — they are OS intents and Browser plugin does not handle them.

**Why:** Capacitor WebView intercepts navigation and never hands off https:// URLs to Chrome/Safari unless Browser plugin or allowNavigation config is used.

**How to apply:** Any time you add a button/link that opens an external URL, import `openUrl` from `@/lib/capacitor` instead of calling `window.open`.

Files updated: privacy-policy.tsx, more.tsx, about.tsx, updates.tsx (all window.open → openUrl)
