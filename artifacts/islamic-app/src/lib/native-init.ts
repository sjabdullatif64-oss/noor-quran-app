// Noor Quran — Native app initialization
// Called once at startup (from main.tsx) before React renders.
// Sets up Status Bar, Notification Channel, reschedules active notifications,
// then hides the Splash Screen.
// AdMob is DISABLED — re-enable after confirming startup stability.
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

    // 3. AdMob — DISABLED for startup stability testing.
    //    Uncomment the line below once startup is confirmed stable:
    // await initAdMob();

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
    // Never block app startup on native init failures.
  }
}

// ── AdMob initialization — DISABLED ──────────────────────────────────────────
// MobileAdsInitProvider was confirmed as the startup crash root cause.
// This function is kept for when AdMob is re-enabled after stability testing.

// async function initAdMob(): Promise<void> {
//   try {
//     const { AdMob, MaxAdContentRating } = await import("@capacitor-community/admob");
//     await AdMob.initialize({
//       initializeForTesting: false,
//       maxAdContentRating: MaxAdContentRating.General,
//       tagForChildDirectedTreatment: false,
//       tagForUnderAgeOfConsent: false,
//     });
//     console.log("[AdMob] initialize() OK");
//     const { startBanner } = await import("../components/banner-ad");
//     await startBanner();
//   } catch (err) {
//     console.warn("[AdMob] initialize error:", err);
//   }
// }

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
