# Noor Quran — Android Build Guide

**Package:** `com.sj64noorquran`  
**Build method:** Capacitor (native Android shell — not TWA/Bubblewrap)  
**Pipeline file:** `.github/workflows/android-build.yml`

---

## What this builds

A fully native Android app with:

- No browser UI, no address bar, no "powered by Chrome" banner
- Full-screen edge-to-edge experience with dark status bar (`#071a0e`)
- Native splash screen (hides after web content loads)
- Android hardware back-button handling
- Native AdMob banner ads (`ca-app-pub-5050437827917011`)
- Native push notifications (prayer alarms)
- Native haptic feedback on Tasbeeh counter
- Offline audio downloads via device Filesystem API
- Min Android 7.0 (API 24) — covers 99%+ of active devices

---

## PART 1 — First-time GitHub setup

### Step 1 — Create a GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Create a **private** repository (recommended for a Play Store app)
3. Name it anything — e.g. `noor-quran-app`
4. Do **not** add README, .gitignore, or license (your repo already has these)

### Step 2 — Push this codebase to GitHub

Run these commands from the Replit shell (or your local machine after downloading):

```bash
git remote add origin https://github.com/YOUR_USERNAME/noor-quran-app.git
git branch -M main
git push -u origin main
```

That's it. The workflow file is already at `.github/workflows/android-build.yml`
so GitHub Actions picks it up automatically on the first push.

---

## PART 2 — Signing keystore

> ⚠️ **CRITICAL — Existing Play Store app**
>
> Your app (`com.sj64noorquran`) is already published on Google Play.
> You **must** use the **exact same keystore** that was used to sign the version
> already on the Play Store. If you use a different keystore, the signed APK/AAB
> will be rejected by Google Play and existing users cannot receive updates.
>
> If you still have the original `.keystore` file → go straight to Step B below.  
> If you **lost** your original keystore → contact Google Play support; there is
> no way to reset app signing unless you enrolled in Play App Signing.

### Step A — Generate a keystore (only if you do NOT have one yet)

Run this on any machine with Java installed (JDK 11+):

```bash
keytool -genkey -v \
  -keystore noor-quran-release.keystore \
  -alias noor-quran \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Noor Quran, OU=Mobile, O=Noor Quran, L=Unknown, ST=Unknown, C=PK"
```

Replace `YOUR_STORE_PASSWORD` and `YOUR_KEY_PASSWORD` with strong passwords.
**Save these passwords somewhere safe — they cannot be recovered.**

### Step B — Convert keystore to base64 (required for GitHub)

**macOS / Linux:**
```bash
base64 -i noor-quran-release.keystore | tr -d '\n' > keystore.base64.txt
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("noor-quran-release.keystore")) `
  | Out-File -Encoding ascii -NoNewline keystore.base64.txt
```

The contents of `keystore.base64.txt` is what goes into the GitHub secret below.

---

## PART 3 — Add GitHub Secrets

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

Add these **4 secrets** exactly (names are case-sensitive):

| Secret name          | Value                                                   |
|---------------------|---------------------------------------------------------|
| `KEYSTORE_BASE64`   | Full contents of `keystore.base64.txt` (one long line)  |
| `KEYSTORE_PASSWORD` | The store password you used with `keytool -storepass`   |
| `KEY_ALIAS`         | `noor-quran`  (or whatever alias you used)              |
| `KEY_PASSWORD`      | The key password you used with `keytool -keypass`       |

Screenshot reference:
```
GitHub repo → Settings
  └── Secrets and variables
        └── Actions
              └── Repository secrets
                    ├── KEYSTORE_BASE64      ← paste full base64 string
                    ├── KEYSTORE_PASSWORD    ← store password
                    ├── KEY_ALIAS            ← noor-quran
                    └── KEY_PASSWORD         ← key password
```

---

## PART 4 — Triggering a build

### Automatic — every push to main

Every time you push code to the `main` branch, a release build starts
automatically. No extra steps needed.

### Manual — custom version number

1. Go to your GitHub repository
2. Click the **Actions** tab
3. Click **"Noor Quran — Android Build"** in the left sidebar
4. Click **"Run workflow"** (top right of the workflow table)
5. Fill in:
   - **Build type:** `release` (for Play Store) or `debug` (for testing)
   - **Version name:** e.g. `1.2.0`
   - **Version code:** e.g. `5` — must be **higher** than your last Play Store upload
6. Click the green **"Run workflow"** button

### Tag-based release (creates a GitHub Release automatically)

```bash
git tag v1.2.0
git push origin v1.2.0
```

This triggers the build AND automatically creates a GitHub Release with the
APK and AAB attached. The release notes are auto-generated from your commits.

---

## PART 5 — Downloading the APK / AAB

### After any push or manual run

1. Go to your GitHub repository
2. Click the **Actions** tab
3. Click the most recent **"Noor Quran — Android Build"** run (green ✅ = success)
4. Scroll to the bottom of the run page → **Artifacts** section
5. Download:
   - `noor-quran-apk-X.X.X-N` → contains the signed `.apk` file
   - `noor-quran-aab-X.X.X-N` → contains the `.aab` for Play Store

Each download is a `.zip` — unzip it to get the actual `.apk` or `.aab` file.

### From a GitHub Release (tag builds only)

1. Go to your repository → **Releases** (right sidebar or `/releases`)
2. Find the release tagged `v1.2.0`
3. Download the `.apk` or `.aab` directly — no zip wrapping

---

## PART 6 — Installing the APK on a device (sideload)

The `.apk` from GitHub Actions is a release-signed APK — install it directly:

1. Transfer the `.apk` to your Android device (USB, Google Drive, email, etc.)
2. On the device: **Settings → Security → Install unknown apps** → allow your file manager
3. Open the `.apk` file with the file manager → tap **Install**
4. The app installs as `com.sj64noorquran` — same as your Play Store version

---

## PART 7 — Uploading AAB to Google Play Console

1. Sign in to [Google Play Console](https://play.google.com/console)
2. Select **Noor Quran** (`com.sj64noorquran`)
3. Go to **Release → Production** (or Internal testing for a test release)
4. Click **Create new release**
5. Under **App bundles**, click **Upload** → select the `.aab` file
6. Fill in **Release notes** (what changed in this version)
7. Click **Save** → **Review release** → **Start rollout to Production**

Review takes 1–3 days for new releases, usually faster for updates.

---

## PART 8 — Local build (without GitHub)

If you want to build on your own machine:

### Prerequisites
- JDK 17 (`java -version` should show 17.x)
- Android Studio Hedgehog (2023.1) or later, OR Android SDK command-line tools
- Node.js 20+, pnpm 10+

### Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Build web assets + sync to Android
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/islamic-app run build
cd artifacts/islamic-app && npx cap sync android

# 3a. Build from Android Studio:
#     File → Open → select  artifacts/islamic-app/android/
#     Build → Generate Signed Bundle / APK → Bundle
#     Use your keystore file and passwords

# 3b. OR build from command line:
cd artifacts/islamic-app/android
export KEYSTORE_PATH=/path/to/noor-quran-release.keystore
export KEYSTORE_PASSWORD=your_store_password
export KEY_ALIAS=noor-quran
export KEY_PASSWORD=your_key_password
./gradlew assembleRelease bundleRelease --no-daemon
```

Output files:
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

---

## PART 9 — Version management

### Version code rules (Play Store enforced)

- Must be a **positive integer**
- Must be **strictly higher** than the last version uploaded to Play Store
- Once uploaded, that version code can never be reused

### Recommended version code strategy

The CI workflow automatically uses `secondsSince2024-01-01` as the version code
when you don't specify one manually. This is always increasing, so you never
need to track it manually.

For manual runs, increment by 1 each time:

| Release | Version name | Version code |
|---------|-------------|-------------|
| Launch  | 1.0.0       | 1           |
| Update  | 1.1.0       | 2           |
| Hotfix  | 1.1.1       | 3           |
| Major   | 2.0.0       | 4           |

---

## Build times (reference)

| Run type                  | Approximate time |
|---------------------------|-----------------|
| First run (cold cache)    | 18–25 minutes   |
| Subsequent runs (cached)  | 6–10 minutes    |
| Debug build               | 5–8 minutes     |

---

## Troubleshooting

### ❌ Build fails: "KEYSTORE_BASE64 is not set"
→ You haven't added the GitHub secrets yet. See Part 3.

### ❌ Build fails: "keytool: Keystore file does not exist"
→ The base64 string in `KEYSTORE_BASE64` is corrupted.  
→ Re-run the base64 command and paste the full output (no line breaks).

### ❌ Play Console rejects the AAB: "APK signature does not match"
→ You are using a different keystore than the one used for your first upload.  
→ You must use the original keystore. See the warning in Part 2.

### ❌ Play Console rejects the AAB: "Version code already used"
→ Increment your version code. See Part 9.

### ❌ Build fails: "SDK location not found"
→ This should not happen in CI (the workflow sets ANDROID_SDK_ROOT).  
→ For local builds: set `ANDROID_SDK_ROOT` to your SDK path and retry.

### ❌ Workflow shows "disabled" when I try to run "Build Android AAB"
→ That is the old Bubblewrap workflow (disabled).  
→ Use the workflow named **"Noor Quran — Android Build"** instead.

---

## App details

| Field           | Value                          |
|----------------|-------------------------------|
| Package ID      | `com.sj64noorquran`           |
| App name        | Noor Quran                    |
| Min Android     | 7.0 (API 24)                  |
| Target Android  | 15 (API 35)                   |
| Orientation     | Portrait only                 |
| Theme color     | `#1a5c38` (Islamic green)     |
| Status bar      | `#071a0e` (dark green/black)  |
| AdMob App ID    | `ca-app-pub-5050437827917011~3831002202` |
| Banner Unit ID  | `ca-app-pub-5050437827917011/3064265739` |
| Gradle version  | 8.9                           |
| Java version    | 17                            |
