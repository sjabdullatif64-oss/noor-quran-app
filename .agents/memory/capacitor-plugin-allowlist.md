---
name: Capacitor includePlugins allowlist
description: New Capacitor plugins silently no-op unless added to capacitor.config.ts includePlugins
---

The app's `capacitor.config.ts` uses an `includePlugins` allowlist. Any newly installed Capacitor plugin is NOT synced into the Android build unless its package name is added to that list — the JS side then fails silently (dynamic import or plugin call caught and swallowed).

**Why:** "Open Settings" via capacitor-native-settings was nonfunctional until added to the allowlist; also, the Android SpeechRecognizer `available()` pre-check can return false negatives on real devices — treat native as supported when the plugin loads and surface errors at call time instead of hiding UI.

**How to apply:** whenever adding a Capacitor plugin: (1) pnpm add, (2) add to `includePlugins`, (3) verify the CI "Found N Capacitor plugins" log line lists it before shipping the APK.
