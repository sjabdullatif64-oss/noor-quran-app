---
name: Android release build environment
description: Environment-specific constraints for producing signed Android release artifacts locally
---

Local Android release builds require Gradle plus a writable SDK containing the target platform and build-tools. The Nix-composed SDK is immutable, and Gradle may request a different build-tools directory, so use a temporary writable SDK copy for the build.

**Why:** Replit workspaces may have Gradle available while `/home/runner/android-sdk` and the requested Android SDK components are absent; pointing Gradle at the immutable Nix store also prevents SDK component installation.

**How to apply:** Provision the required Android platform/build-tools with Nix, copy the SDK to a writable temporary directory, and set the Android `local.properties` SDK path only for the build. Keep signing metadata in the existing keystore configuration and never expose its values.