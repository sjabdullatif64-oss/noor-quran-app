// Noor Quran — Native app initialization
// Called once at startup (from main.tsx) before React renders.
// Sets up Status Bar, Notification Channel, AdMob SDK, then hides the Splash Screen.
// All calls are gated behind isNative() — zero effect in the browser.

import { setupStatusBar, hideSplash, createNotifChannel, isNative } from "./capacitor";

let initialized = false;

export async function initNative(): Promise<void> {
  if (initialized || !isNative()) return;
  initialized = true;

  try {
    // 1. Status bar: dark style, #071a0e — must happen before WebView paints
    await setupStatusBar();

    // 2. Notification channel (Android 8+): created at boot so scheduled
    //    notifications can fire even before the user opens notifications settings
    await createNotifChannel();

    // 3. AdMob SDK initialization — must happen before any ad is requested.
    //    We call this here (startup) so the first banner on Home loads instantly.
    await initAdMob();

    // 4. Hide splash after a short delay so the app has fully painted
    setTimeout(() => hideSplash(), 800);
  } catch {
    // Never block app startup on native init failures —
    // a missing AdMob config or flaky network must not crash the app.
  }
}

// ── AdMob initialization ──────────────────────────────────────────────────────

async function initAdMob(): Promise<void> {
  try {
    const { AdMob, MaxAdContentRating } = await import(
      "@capacitor-community/admob"
    );

    await AdMob.initialize({
      // Production mode — real ads for real users
      initializeForTesting: false,
      // Content rating: General (suitable for all ages — Islamic content)
      maxAdContentRating: MaxAdContentRating.General,
      // Not a children's app but content is family-safe
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
  } catch (err) {
    // Log but don't throw — ads failing must never crash the app
    console.warn("[AdMob] initialize error:", err);
  }
}
