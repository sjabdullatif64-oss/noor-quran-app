---
name: Rebase conflict strategy for Noor Quran Android repo
description: How to handle rebase conflicts when local Replit fixes conflict with old diagnostic commits on origin/main
---

The GitHub repo (sjabdullatif64-oss/noor-quran-app) often has diagnostic/crash-investigation commits on origin/main that conflict with the stable Replit workspace state.

**Rule:** Always keep HEAD (ours) for every conflict in these files:
- `artifacts/islamic-app/android/app/build.gradle` — AGP version, Java version, SplashScreen dep
- `artifacts/islamic-app/android/build.gradle` — classpath AGP version
- `artifacts/islamic-app/android/gradle.properties` — R8 flags, jlink flags
- `.github/workflows/android-build.yml` — Java 21, Gradle 8.13
- `artifacts/islamic-app/android/app/src/main/AndroidManifest.xml` — MainActivity as LAUNCHER, no AdMob meta-data
- `artifacts/islamic-app/android/app/src/main/java/com/sj64noorquran/MainActivity.java` — full implementation with back-button + SplashScreen

**Why:** Diagnostic commits temporarily stripped MainActivity to bare `extends BridgeActivity {}`, set LogViewerActivity as LAUNCHER, added AdMob meta-data (confirmed crash cause), and used Java 17 + Gradle 8.11.1 (which fails on CI with jlink error). The Replit workspace HEAD always has the correct final state.

**Shell-based auto-resolution:** Use `git checkout --ours -- <file>` + `git add <file>` in a loop, then `GIT_EDITOR=true git rebase --continue`. Run in code_execution as individual sequential calls (not a while loop — blocks event loop).
