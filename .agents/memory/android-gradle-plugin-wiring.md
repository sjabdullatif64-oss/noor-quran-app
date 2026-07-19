---
name: Android hand-maintained gradle plugin wiring
description: New Capacitor plugins need manual gradle wiring; cap sync's generated files are ignored in this project
---

The Android project ignores Capacitor's generated `capacitor.settings.gradle` / `capacitor.build.gradle`. Plugin modules are hand-listed in `android/settings.gradle` and `android/app/build.gradle`.

**Why:** CI runs `npx cap sync` but nothing applies its generated files, so a plugin added to package.json + `includePlugins` compiles NOTHING natively. The JS side still lists it in `capacitor.plugins.json`, causing Class.forName failure that poisons auto plugin loading. This is exactly why AI Teacher speech recognition silently never started (fixed in v1.2.5).

**How to apply:** For every new Capacitor plugin, do ALL of: (1) `include` + `projectDir` in `android/settings.gradle`, (2) `implementation project(...)` in `android/app/build.gradle`, (3) add to `includePlugins` in capacitor.config.ts, (4) explicit `registerPlugin(X.class)` in MainActivity (defense-in-depth). Verify by unzipping the APK: plugin classes must appear in `classes*.dex` (`grep -l <pkg> classes*.dex`) and any library-manifest entries (e.g. `android.speech.RecognitionService` queries) must appear in the merged manifest (`strings -e l AndroidManifest.xml`).
