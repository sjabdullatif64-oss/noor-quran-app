# Noor Quran — Android APK/AAB Build Guide

## Overview

This project uses **Capacitor** to wrap the React/Vite web app in a real native Android shell.
The result is a proper Android app with:
- No browser UI / URL bar
- Full native fullscreen experience
- Native splash screen
- Android hardware back-button support
- Native notifications (LocalNotifications plugin)
- Device file storage (Filesystem plugin)
- Status bar color control
- Haptic feedback

---

## Option A — GitHub Actions (Recommended: automatic APK on every push)

### Step 1 — Push to GitHub

1. Create a GitHub repository
2. Push this codebase:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/noor-quran.git
   git push -u origin main
   ```

### Step 2 — Generate a signing keystore (one-time)

Run this on your local machine (requires Java/JDK installed):

```bash
keytool -genkey -v \
  -keystore noor-quran-release.keystore \
  -alias noor-quran \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Noor Quran, OU=Mobile, O=Noor Quran Team, L=Unknown, ST=Unknown, C=PK"
```

Convert to base64 for GitHub:
```bash
base64 -i noor-quran-release.keystore | tr -d '\n' > keystore.base64.txt
```

### Step 3 — Add GitHub Secrets

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Add these 4 secrets:

| Secret name         | Value                                      |
|--------------------|--------------------------------------------|
| `KEYSTORE_BASE64`  | Contents of `keystore.base64.txt`          |
| `KEYSTORE_PASSWORD`| Your store password                        |
| `KEY_ALIAS`        | `noor-quran`                               |
| `KEY_PASSWORD`     | Your key password                          |

### Step 4 — Trigger a build

Every push to `main` triggers a build automatically.
Or go to: **GitHub repo → Actions → Build Android APK & AAB → Run workflow**

### Step 5 — Download the APK/AAB

After the workflow completes (~10-15 minutes):
- Go to **Actions → latest run → Artifacts**
- Download `noor-quran-release-apk-*` → install directly on Android
- Download `noor-quran-release-aab-*` → upload to Google Play Console

---

## Option B — Build locally with Android Studio

### Prerequisites
- Android Studio Hedgehog (2023.1) or later
- JDK 17
- Node.js 20+, pnpm

### Steps

```bash
# 1. Install deps
pnpm install

# 2. Build web assets + sync to Android
bash artifacts/islamic-app/scripts/build-android.sh

# 3. Open in Android Studio
open artifacts/islamic-app/android     # macOS
# or: Android Studio → File → Open → select android/ folder

# 4. Build → Generate Signed Bundle/APK
```

---

## What each native plugin does

| Plugin | Purpose |
|--------|---------|
| `@capacitor/splash-screen` | Real Android splash screen, hides after app loads |
| `@capacitor/status-bar` | Sets status bar to `#071a0e` with white icons |
| `@capacitor/app` | Hardware back-button handling, app lifecycle |
| `@capacitor/local-notifications` | Native Android notifications with notification channel |
| `@capacitor/filesystem` | Save downloaded Quran audio to device storage |
| `@capacitor/haptics` | Haptic tap on Tasbeeh counter taps |
| `@capacitor/network` | Network state detection for download manager |

---

## Capacitor sync (after any code change)

Any time you change the web code, run:

```bash
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/islamic-app run build
cd artifacts/islamic-app && npx cap sync android
```

Then rebuild the APK/AAB.

---

## Google Play Store submission

1. Build the signed AAB (`.aab` file) from GitHub Actions
2. Go to [Google Play Console](https://play.google.com/console)
3. Create new app → Package: `com.sj64noorquran`
4. Upload the AAB under **Production → Create new release**
5. Fill in store listing (title: "Noor Quran", category: Education)
6. Privacy Policy URL: your deployed app URL + `/privacy-policy`
7. Submit for review (typically 1-3 days)

---

## App details

- **Package ID**: `com.sj64noorquran`
- **App name**: Noor Quran  
- **Min Android**: 7.0 (API 24)
- **Target Android**: 15 (API 35)
- **Orientation**: Portrait only
- **Theme color**: `#1a5c38` (Islamic green)
- **Background**: `#071a0e` (deep dark green)
