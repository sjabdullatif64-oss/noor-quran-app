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

## Next APK version
After these JS-only fixes, the next debug APK is v1.0.15 (build dispatched on commit f863fd99).
