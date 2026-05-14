// Noor Quran — Native app initialization
// Called once at startup (from main.tsx) before React renders.
// Sets up Status Bar, Notification Channel, AdMob SDK, reschedules
// any active notifications, then hides the Splash Screen.
// All calls are gated behind isNative() — zero effect in the browser.

import { setupStatusBar, hideSplash, createNotifChannel, isNative } from "./capacitor";
import { getNotifSettings, getPermissionState } from "./notifications";

let initialized = false;

export async function initNative(): Promise<void> {
  if (initialized || !isNative()) return;
  initialized = true;

  try {
    // 1. Status bar: dark style, #071a0e — must happen before WebView paints
    await setupStatusBar();

    // 2. Notification channel (Android 8+): create before scheduling anything.
    //    Android ignores notifications sent to a non-existent channel.
    await createNotifChannel();

    // 3. AdMob SDK initialization — must happen before any ad is requested.
    //    We call this here (startup) so the first banner loads without delay.
    await initAdMob();

    // 4. Reschedule active notifications.
    //    On Android, local notifications are cleared after:
    //      - Device reboot (RECEIVE_BOOT_COMPLETED handles it via Capacitor's
    //        LocalNotificationRestoreReceiver, but we re-arm here as extra safety)
    //      - App update / re-install
    //    Re-scheduling is idempotent (cancel-all then reschedule enabled only).
    await restoreNotifications();

    // 5. Hide splash after the app has fully painted
    setTimeout(() => hideSplash(), 800);
  } catch {
    // Never block app startup on native init failures —
    // a missing AdMob config or flaky network must not crash the app.
  }
}

// ── AdMob initialization ──────────────────────────────────────────────────────

async function initAdMob(): Promise<void> {
  try {
    const { AdMob, MaxAdContentRating } = await import("@capacitor-community/admob");

    await AdMob.initialize({
      initializeForTesting: false,
      maxAdContentRating: MaxAdContentRating.General,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });

    console.log("[AdMob] initialize() OK");

    // Start the banner immediately after SDK init so it's ready before the
    // first page renders. startBanner() is idempotent — safe to call again.
    const { startBanner } = await import("../components/banner-ad");
    await startBanner();
  } catch (err) {
    console.warn("[AdMob] initialize error:", err);
  }
}

// ── Notification restore ──────────────────────────────────────────────────────

async function restoreNotifications(): Promise<void> {
  try {
    // Only reschedule if the user has already granted permission
    const perm = getPermissionState();
    if (perm !== "granted") return;

    const settings = getNotifSettings();
    const hasEnabled = Object.values(settings).some((s) => s.enabled);
    if (!hasEnabled) return;

    const { scheduleNativeNotifications } = await import("./native-scheduler");
    await scheduleNativeNotifications(settings);
  } catch {
    // Scheduling errors must never block startup
  }
}
