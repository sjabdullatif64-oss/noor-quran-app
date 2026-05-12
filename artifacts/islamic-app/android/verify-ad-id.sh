#!/usr/bin/env bash
# verify-ad-id.sh
# Run from the android/ directory after a release build:
#   bash verify-ad-id.sh
#
# What it checks:
#   1. Merged manifest (written by processReleaseManifest)
#   2. Final AAB base module manifest (the definitive artefact Google Play reads)
#
# Usage:
#   cd artifacts/islamic-app/android
#   ./gradlew clean bundleRelease && bash verify-ad-id.sh

set -euo pipefail

MERGED_MANIFEST="app/build/intermediates/merged_manifests/release/AndroidManifest.xml"
AAB_FILE="app/build/outputs/bundle/release/app-release.aab"
PERM="com.google.android.gms.permission.AD_ID"

echo ""
echo "══════════════════════════════════════════════════"
echo "  Noor Quran — AD_ID permission verification"
echo "══════════════════════════════════════════════════"

# ── 1. Merged manifest ──────────────────────────────────────────────────────────
echo ""
echo "① Merged manifest: $MERGED_MANIFEST"
if [[ -f "$MERGED_MANIFEST" ]]; then
    if grep -q "$PERM" "$MERGED_MANIFEST"; then
        echo "   ✅  AD_ID permission FOUND"
        grep "$PERM" "$MERGED_MANIFEST" | sed 's/^/   /'
    else
        echo "   ❌  AD_ID permission MISSING from merged manifest!"
        echo "   ── Relevant permissions present ──"
        grep "uses-permission" "$MERGED_MANIFEST" | sed 's/^/   /'
    fi
else
    echo "   ⚠️   File not found — run: ./gradlew processReleaseManifest"
fi

# ── 2. Final AAB (base/manifest/AndroidManifest.xml) ───────────────────────────
echo ""
echo "② Final AAB: $AAB_FILE"
if [[ -f "$AAB_FILE" ]]; then
    # The AAB is a ZIP; the base module manifest is at base/manifest/AndroidManifest.xml
    # It is stored as binary XML (proto format), so we search for the raw string bytes.
    if unzip -p "$AAB_FILE" "base/manifest/AndroidManifest.xml" 2>/dev/null | strings | grep -q "AD_ID"; then
        echo "   ✅  AD_ID permission FOUND inside the AAB"
    else
        echo "   ❌  AD_ID permission NOT found in AAB base manifest!"
        echo "   This is what Google Play Console will see."
    fi
else
    echo "   ⚠️   AAB not found — run: ./gradlew bundleRelease"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "  Done."
echo "══════════════════════════════════════════════════"
echo ""
