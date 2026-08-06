---
name: Android release build environment
description: Environment-specific constraints for producing signed Android release artifacts locally
---

Local Android builds require Gradle plus a writable SDK containing the target platform, build-tools, and platform-tools. The Nix-composed SDK is immutable, and Gradle may request a different build-tools directory, so use a temporary writable SDK copy for the build. Capacitor 8 modules may also declare Build Tools 35 and Java 21 even when the app targets 36; the root Android build must override all Android subprojects to Build Tools 36 and Java 17 when only JDK 17 is installed.

**Why:** Replit workspaces may have Gradle available while `/home/runner/android-sdk` and the requested Android SDK components are absent; pointing Gradle at the immutable Nix store also prevents SDK component installation. Overriding only the app module is insufficient because Capacitor library modules resolve their own toolchain requirements.

**How to apply:** Provision the required Android platform/build-tools with Nix, copy the SDK to a writable temporary directory, add platform-tools and accepted license files, and set the Android `local.properties` SDK path only for the build. Keep signing metadata in the existing keystore configuration and never expose its values.