---
name: Android feature bug root causes
description: Root causes and fixes for 7 Android issues in Noor Quran Capacitor app
---

## Back button double-fire
`useAndroidBack()` was called in BOTH `App.tsx` (Router component) AND `components/layout.tsx`. Two App listeners fired simultaneously causing double history pops. Fix: remove from App.tsx, keep only in layout.tsx.

**Why:** layout.tsx wraps the entire app shell and is the correct single owner of the back handler.

## Notifications "prompt" treated as "denied"
`LocalNotifications.requestPermissions()` can return `{display: "prompt"}` (dialog dismissed without answer). Old code: `result.display === "granted" ? "granted" : "denied"` → stored "denied" permanently. Fix: handle "granted" / "denied" / else (return "default", never store). Also: if plugin throws in Capacitor, return "default" not fall-through to Web Notification API (which can't trigger Android runtime permission dialog).

## Share plugin fallthrough missing
In `nativeShare()`, if `@capacitor/share` plugin throws (unavailable/misconfigured), the old code had `return false` in the catch — skipping the `navigator.share` fallback entirely. Fix: remove `return false`; fall through to `navigator.share` unless error message contains "cancel"/"abort"/"dismiss".

**Why:** On Android, user-cancel from the share sheet RESOLVES (not rejects) the Capacitor Share promise, so catch is only hit by genuine plugin errors.

## Qibla compass double-firing
`startCompass()` registered both `deviceorientationabsolute` and `deviceorientation`. The regular handler had `if (absoluteListenerRef.current) { handleOrientation(e) }` — inverted logic! It fired handleOrientation when absolute WAS registered, causing both to process every reading simultaneously. Fix: add `lastAbsoluteMsRef = useRef(0)`, set `lastAbsoluteMsRef.current = Date.now()` in absoluteHandler, and in regular handler: `if (Date.now() - lastAbsoluteMsRef.current > 500) handleOrientation(e)`.

## Admin panel submit button hidden under nav bar
`AdminFormModal` uses `fixed inset-0 z-[60] flex flex-col` with the submit button in a bottom div. On Android with gesture navigation bar, the button was hidden under the system nav bar. Fix: add `style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}` to the button container div. Also added `submitting` state + try-catch + toast feedback to `AdminPanel.handleSave`.

## Azan scheduler no offline cache
`scheduleAzan()` fetched prayer times live; if offline or city/country not set, returned null and scheduled nothing. Fix: after successful network fetch, save `{todayDate, locationKey, today, tomorrow}` to `localStorage["noor-azan-timings-v1"]`. On network failure, try loading this cache (keyed by date + city:city:country or gps:lat,lng).

## Azan audio was silently broken (dead streaming URL)
`AzanService` played the Azan by streaming an MP3 from a domain that no longer resolves; `MediaPlayer` failed silently with no fallback, so notifications fired but no sound ever played. Fix: bundle licensed/public-domain audio files as local `res/raw/*.mp3` and play via `MediaPlayer.create()` (no network), with a last-resort bundled tone if the primary resource fails to load, plus proper `AudioFocusRequest` request/abandon around playback.

**Why:** Never trust a remote media URL for a time-critical local notification sound — no connectivity or a dead host means total silent failure with no user-visible error. Bundle critical audio locally.

## CI auto-stamps versionCode/versionName, ignoring build.gradle
The Android CI workflow (`.github/workflows/android-build.yml`) always overwrites `versionCode`/`versionName` in `app/build.gradle` via `sed` before building — `versionCode = now() - epoch` (seconds) and `versionName = "1.0.1"` — unless the workflow_dispatch run is given explicit `version_name`/`version_code` inputs.

**Why:** Guarantees a monotonically increasing versionCode per CI run without relying on the repo's committed value.

**How to apply:** Manually bumping versionCode/versionName in `build.gradle` before pushing has no effect on the CI-built artifact unless you also pass the `version_name`/`version_code` workflow_dispatch inputs. Don't bother bumping it locally for CI-triggered builds — check the actual stamped values in the build log (`grep -E "versionCode|versionName" app/build.gradle` step) if you need to know what shipped.
