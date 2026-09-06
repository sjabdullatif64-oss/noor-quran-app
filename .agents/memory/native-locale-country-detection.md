---
name: Native locale country detection
description: Why Android Quran translation defaults must prefer the native device language tag over WebView locale data
---

Android WebViews can report a browser/UI locale that does not match the device's native locale region. For first-launch Quran translation selection, read the native Capacitor Device language tag first, then preserve the existing country mapping and browser/timezone fallbacks.

**Why:** The Android device plugin exposes the system BCP-47 locale, while `navigator.language` can reflect the WebView/browser configuration and select the wrong country-based translation.

**How to apply:** Only use this detection when no valid saved translation exists. If the lookup is asynchronous, re-check storage before saving so a manual language selection can never be overwritten; keep transliteration preferences separate.