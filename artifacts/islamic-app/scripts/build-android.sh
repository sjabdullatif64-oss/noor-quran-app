#!/usr/bin/env bash
# Noor Quran — local Android build helper
# Run from the workspace root: bash artifacts/islamic-app/scripts/build-android.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Building Vite web assets..."
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/islamic-app run build

echo "==> Syncing Capacitor Android..."
cd "$APP_DIR"
npx cap sync android

echo "==> Building Android release APK + AAB..."
cd "$APP_DIR/android"
chmod +x gradlew

if [[ "${1:-release}" == "debug" ]]; then
  ./gradlew assembleDebug --no-daemon
  echo ""
  echo "✅ Debug APK: android/app/build/outputs/apk/debug/app-debug.apk"
else
  ./gradlew assembleRelease bundleRelease --no-daemon
  echo ""
  echo "✅ Release APK: android/app/build/outputs/apk/release/app-release.apk"
  echo "✅ Release AAB: android/app/build/outputs/bundle/release/app-release.aab"
fi
