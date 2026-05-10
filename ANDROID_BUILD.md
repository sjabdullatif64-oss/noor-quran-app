# Noor Quran — Android AAB Build Guide

**Package:** `com.sj64noorquran`  
**Method:** Trusted Web Activity (TWA) via Bubblewrap CLI  
**Approach:** No Android Studio required — just Node.js, Java 17, and the Bubblewrap CLI.

---

## Overview

Noor Quran is a PWA. The Android App Bundle is a **Trusted Web Activity (TWA)** wrapper that loads the deployed PWA inside a full-screen Chrome shell — giving you a native-quality Play Store listing with zero code duplication. All features (audio, GPS, notifications, offline storage) work through the browser engine exactly as they do on the web.

---

## Option A — PWA Builder (Easiest — Zero local tools needed)

1. Deploy the app on Replit (click **Publish** in the Replit sidebar)
2. Go to **https://www.pwabuilder.com/**
3. Enter your Replit app URL: `https://YOUR_APP.replit.app`
4. Click **Package for stores → Google Play**
5. Fill in:
   - Package ID: `com.sj64noorquran`
   - App version: `1.0.0` / version code `1`
   - Signing: generate a new key or upload your existing keystore
6. Download the `.aab` file + `signing-key-info.txt`
7. Keep the `signing-key-info.txt` safe — you need the SHA-256 fingerprint for the next step

**Then update Digital Asset Links** (required for TWA verification):

- Open `artifacts/islamic-app/public/.well-known/assetlinks.json`
- Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` with the SHA-256 from `signing-key-info.txt`
- Re-deploy the app so the file is live at `https://YOUR_APP.replit.app/.well-known/assetlinks.json`

---

## Option B — Bubblewrap CLI (Local build, full control)

### Prerequisites

```bash
# Java 17+
java -version   # must show 17 or higher

# Node.js 18+
node --version

# Install Bubblewrap
npm install -g @bubblewrap/cli

# Accept Android SDK licenses
bubblewrap doctor --accept-licenses
```

### Step 1 — Deploy the app

Deploy Noor Quran on Replit so it has a public HTTPS URL:  
`https://YOUR_APP.replit.app`

### Step 2 — Generate a signing keystore (one time only)

```bash
keytool -genkey -v \
  -keystore noor-quran-release.keystore \
  -alias noor-quran-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Noor Quran, OU=Mobile, O=YourOrg, L=City, S=State, C=PK" \
  -storepass YOUR_KEYSTORE_PASS \
  -keypass YOUR_KEY_PASS
```

> **Critical:** Store `noor-quran-release.keystore` and both passwords securely.  
> If you lose the keystore you cannot update your Play Store listing ever again.

### Step 3 — Get your SHA-256 fingerprint

```bash
keytool -list -v \
  -keystore noor-quran-release.keystore \
  -alias noor-quran-key \
  -storepass YOUR_KEYSTORE_PASS \
  | grep SHA256
```

Copy the fingerprint (format: `AB:CD:EF:...`) into  
`artifacts/islamic-app/public/.well-known/assetlinks.json` → `sha256_cert_fingerprints`.  
Re-deploy the app so the file is live.

### Step 4 — Edit android/twa-manifest.json

Replace all `REPLACE_WITH_YOUR_REPLIT_APP_DOMAIN` with your actual domain, e.g. `noor-quran.replit.app`.

### Step 5 — Initialise the TWA project

```bash
mkdir -p android-build && cd android-build

bubblewrap init \
  --manifest https://YOUR_APP.replit.app/site.webmanifest \
  --directory .
```

Bubblewrap will ask a series of questions. Key answers:

| Question | Answer |
|---|---|
| Package ID | `com.sj64noorquran` |
| App name | `Noor Quran` |
| Launcher name | `Noor Quran` |
| Theme color | `#1a5c38` |
| Background color | `#1a5c38` |
| Start URL | `/` |
| Display mode | `standalone` |
| Keystore path | `../noor-quran-release.keystore` |
| Key alias | `noor-quran-key` |
| App version | `1.0.0` |
| App version code | `1` |

### Step 6 — Build the AAB

```bash
bubblewrap build
```

The signed AAB is output to: `android-build/app-release-bundle.aab`

---

## Option C — GitHub Actions (Automated CI/CD)

The workflow at `.github/workflows/build-android.yml` builds and signs the AAB automatically on every push to `main`.

### Required GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|---|---|
| `REPLIT_APP_DOMAIN` | `YOUR_APP.replit.app` (no `https://`) |
| `KEYSTORE_BASE64` | Base64 of your keystore: `base64 -w0 noor-quran-release.keystore` |
| `KEY_ALIAS` | `noor-quran-key` |
| `KEYSTORE_PASSWORD` | Your keystore password |
| `KEY_PASSWORD` | Your key password |

### Trigger a build

```bash
# Push to main → auto-build
git push origin main

# Or trigger manually from GitHub Actions tab

# Or create a release tag
git tag v1.0.0
git push origin v1.0.0
# → builds AAB and attaches it to a GitHub Release
```

Download the `.aab` from the Actions run → Artifacts section.

---

## Uploading to Google Play Console

1. Go to **https://play.google.com/console**
2. Create a new app → **Noor Quran**, package `com.sj64noorquran`
3. Navigate to **Testing → Internal testing → Create new release**
4. Upload `noor-quran-1.0.0.aab`
5. Fill in release notes
6. Roll out to internal testers

### Content rating
- Category: **Education**
- No violence, no adult content, Quran/Islamic content
- IARC rating: will likely be **Everyone**

---

## Android Permissions (Automatic via TWA)

The TWA shell automatically requests these permissions through Chrome:

| Permission | Feature |
|---|---|
| `ACCESS_FINE_LOCATION` | GPS prayer times, Qibla |
| `ACCESS_COARSE_LOCATION` | Location fallback |
| `POST_NOTIFICATIONS` | Prayer time reminders |
| `RECEIVE_BOOT_COMPLETED` | Persistent notification schedules |
| `INTERNET` | Quran API, audio streaming |
| `ACCESS_NETWORK_STATE` | Offline detection |

No `AndroidManifest.xml` changes required — Chrome handles all permissions on behalf of the TWA.

---

## App Settings for Play Store Listing

| Field | Value |
|---|---|
| App name | Noor Quran |
| Package name | com.sj64noorquran |
| Category | Education → Islamic / Religion |
| Content rating | Everyone |
| Target SDK | 34 (Android 14) |
| Min SDK | 24 (Android 7.0) |
| Version | 1.0.0 (code 1) |
| Supported languages | English, Urdu, Sindhi, Hindi, Turkish, Bengali, Indonesian, French, Spanish, Malay |
| Short description | Read the Holy Quran with 10 translations, audio, prayer times & more |
| Full description | See below |

### Suggested Play Store description

```
Noor Quran — Read & Listen to the Holy Quran

Noor Quran is a beautifully designed Islamic app for reading the Holy Quran with 10 translation languages, high-quality audio recitation, prayer times, and much more.

📖 QURAN READER
• Full Arabic text with 10 translations: Urdu, English, Sindhi, Hindi, Turkish, Bengali, Indonesian, French, Spanish, Malay
• High-quality audio recitation by Sheikh Al-Afasy
• Dual-mode playback: Arabic + translation together
• Bookmark and favourite any ayah
• Continuous & repeat playback modes

🕌 PRAYER TIMES
• GPS-based accurate prayer times for any city worldwide
• Live countdown to next prayer
• All 5 daily prayers + Jumu'ah

🧭 QIBLA DIRECTION
• Compass-based Qibla finder

📿 TASBEEH COUNTER
• Digital dhikr counter with presets

🗓️ ISLAMIC CALENDAR
• Hijri & Gregorian dual calendar
• Islamic events and holidays

📥 OFFLINE DOWNLOADS
• Download Surahs for offline reading
• Offline audio playback

🔔 NOTIFICATIONS
• Prayer time reminders
• Daily Quran ayah
• Morning & Evening Azkar
• Islamic Quote of the Day

🕋 ISLAMIC GIFTS
• Beautiful greeting cards for Eid, Ramadan, and more

بسم الله الرحمن الرحيم
```

---

## Checklist Before Play Store Submission

- [ ] App deployed and accessible at `https://YOUR_APP.replit.app`
- [ ] `assetlinks.json` live at `https://YOUR_APP.replit.app/.well-known/assetlinks.json`
- [ ] SHA-256 fingerprint matches the signing keystore
- [ ] AAB successfully built and signed
- [ ] Play Console: content rating questionnaire completed
- [ ] Play Console: privacy policy URL added
- [ ] Play Console: at least 2 screenshots uploaded (phone + 7-inch tablet)
- [ ] Internal testing release created and at least 1 tester added
- [ ] Tested on a physical Android device (TWA must open without a browser address bar)

---

## Troubleshooting

**"Digital Asset Links verification failed" / address bar visible in TWA**  
→ The `assetlinks.json` file is not reachable or the SHA-256 doesn't match the signing key.  
→ Verify: `curl https://YOUR_APP.replit.app/.well-known/assetlinks.json`  
→ The fingerprint in the file must exactly match `keytool -list -v ...` SHA256 output.

**"App not installed" error on Android**  
→ Ensure minSdkVersion is 24 and the test device runs Android 7+.

**Notifications not working on Android**  
→ Open app → More → Notifications → tap "Enable Notifications" (must be a user gesture).  
→ On Android 13+, grant POST_NOTIFICATIONS in system settings.

**GPS not working**  
→ Open app → Prayer Times → tap "Enable GPS" → grant location in the Chrome permission prompt.

**Audio stops when screen locks**  
→ This is a known Chrome/TWA limitation. Audio continues if the user keeps the screen on or uses the media notification controls.
