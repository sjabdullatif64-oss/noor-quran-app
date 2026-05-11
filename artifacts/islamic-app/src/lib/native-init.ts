// Noor Quran — Native app initialization
// Called once at startup; sets up Status Bar, Splash, back-button, notifications channel.
// Gracefully no-ops in the browser.

import { setupStatusBar, hideSplash, createNotifChannel, isNative } from "./capacitor";

let initialized = false;

export async function initNative(): Promise<void> {
  if (initialized || !isNative()) return;
  initialized = true;

  try {
    // 1. Configure status bar color/style before anything renders
    await setupStatusBar();

    // 2. Create Android notification channel (Oreo+)
    await createNotifChannel();

    // 3. Hide splash after a brief delay so the app renders first
    setTimeout(() => hideSplash(), 800);
  } catch {
    // Never block app startup on native init failures
  }
}
