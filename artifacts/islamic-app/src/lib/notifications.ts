// Noor Quran — Notification permissions, settings, and Service Worker bridge

const STORAGE_KEY = "noor-notif-settings";
const SW_PATH     = "/service-worker.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotifSetting {
  enabled: boolean;
  time:    string; // "HH:MM" 24-hour
}

export interface AllNotifSettings {
  quranAyah:       NotifSetting;
  fajrReminder:    NotifSetting;
  dhuhrReminder:   NotifSetting;
  asrReminder:     NotifSetting;
  maghribReminder: NotifSetting;
  ishaReminder:    NotifSetting;
  jummaReminder:   NotifSetting;
  islamicQuote:    NotifSetting;
  tasbeehReminder: NotifSetting;
  morningAzkar:    NotifSetting;
  eveningAzkar:    NotifSetting;
}

// Default: only Daily Quran Ayah ON — everything else is opt-in
export const DEFAULT_SETTINGS: AllNotifSettings = {
  quranAyah:       { enabled: true,  time: "08:00" },
  fajrReminder:    { enabled: false, time: "05:00" },
  dhuhrReminder:   { enabled: false, time: "12:30" },
  asrReminder:     { enabled: false, time: "15:30" },
  maghribReminder: { enabled: false, time: "18:30" },
  ishaReminder:    { enabled: false, time: "20:00" },
  jummaReminder:   { enabled: false, time: "12:00" },
  islamicQuote:    { enabled: false, time: "09:00" },
  tasbeehReminder: { enabled: false, time: "07:00" },
  morningAzkar:    { enabled: false, time: "06:30" },
  eveningAzkar:    { enabled: false, time: "17:30" },
};

// ── Environment detection ─────────────────────────────────────────────────────

/** True when running on an Android device (Chrome, WebView, TWA, Capacitor). */
export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

/** True when the app is installed as a PWA / TWA (standalone display mode). */
export function isInstalledPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-ignore — navigator.standalone exists on iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * True when running inside a Capacitor native shell (APK / IPA built with
 * Capacitor). Capacitor sets window.Capacitor before the page loads.
 */
export function isCapacitorApp(): boolean {
  return typeof window !== "undefined" &&
    !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
}

/**
 * Environment label for UI hints.
 * - "capacitor" → native Capacitor APK shell
 * - "twa"       → installed TWA / standalone PWA on Android
 * - "android"   → Android browser tab
 * - "browser"   → desktop or iOS browser
 */
export type AppEnv = "capacitor" | "twa" | "android" | "browser";

export function getAppEnv(): AppEnv {
  if (isCapacitorApp())          return "capacitor";
  if (isAndroid() && isInstalledPWA()) return "twa";
  if (isAndroid())               return "android";
  return "browser";
}

// ── Notification API support ──────────────────────────────────────────────────

/**
 * Whether the browser's Notification API is available.
 * Deliberately does NOT require serviceWorker — that is only needed for
 * push/test notifications, not for permission requests.
 */
export function isNotificationAPISupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Whether the Service Worker + Notification combo is fully supported
 * (needed for test notifications and future push support).
 */
export function isSWSupported(): boolean {
  return isNotificationAPISupported() && "serviceWorker" in navigator;
}

/**
 * Whether the notifications feature is usable enough to show the UI.
 * On Capacitor, we show it and direct the user to native settings.
 */
export function isSupported(): boolean {
  if (isCapacitorApp()) return true; // always show — native path
  return isNotificationAPISupported();
}

// ── Permission state ──────────────────────────────────────────────────────────

export type PermissionState = "granted" | "denied" | "default" | "unsupported";

export function getPermissionState(): PermissionState {
  // Capacitor: check if the Capacitor LocalNotifications plugin granted permission
  if (isCapacitorApp()) {
    const cap = (window as Window & {
      Capacitor?: {
        Plugins?: {
          LocalNotifications?: { checkPermissions?: () => Promise<{ display: string }> };
        };
      };
    }).Capacitor;
    // We can't read this synchronously via the plugin, so fall through to
    // Notification API if available, else optimistically say "default"
    if (!isNotificationAPISupported()) {
      const stored = localStorage.getItem("noor-cap-notif-perm");
      if (stored === "granted") return "granted";
      if (stored === "denied")  return "denied";
      return "default";
    }
  }

  if (!isNotificationAPISupported()) return "unsupported";
  return Notification.permission as PermissionState;
}

// ── Permission request ────────────────────────────────────────────────────────

/**
 * Request notification permission using the best available API for the
 * current environment.
 *
 * IMPORTANT: This MUST be called from a user-gesture handler (button click).
 * Never call it from a setTimeout or useEffect — Android Chrome will silently
 * ignore or auto-deny the request outside of a user gesture.
 */
export async function requestPermission(): Promise<PermissionState> {
  // ── Capacitor path ──────────────────────────────────────────────────────────
  if (isCapacitorApp()) {
    const cap = (window as Window & {
      Capacitor?: {
        Plugins?: {
          LocalNotifications?: {
            requestPermissions?: () => Promise<{ display: string }>;
          };
        };
      };
    }).Capacitor;

    const plugin = cap?.Plugins?.LocalNotifications;
    if (plugin?.requestPermissions) {
      try {
        const result = await plugin.requestPermissions();
        const state  = result.display === "granted" ? "granted" : "denied";
        localStorage.setItem("noor-cap-notif-perm", state);
        return state;
      } catch {
        // Plugin failed — fall through to web Notification API
      }
    }
    // If Capacitor plugin unavailable, fall through to web API below
  }

  // ── Web Notification API path ───────────────────────────────────────────────
  if (!isNotificationAPISupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied")  return "denied";

  try {
    const result = await Notification.requestPermission();
    return result as PermissionState;
  } catch {
    return "denied";
  }
}

// ── Settings storage ──────────────────────────────────────────────────────────

export function getNotifSettings(): AllNotifSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AllNotifSettings>;
    const merged: AllNotifSettings = { ...DEFAULT_SETTINGS };
    (Object.keys(DEFAULT_SETTINGS) as (keyof AllNotifSettings)[]).forEach((key) => {
      if (parsed[key]) merged[key] = { ...DEFAULT_SETTINGS[key], ...parsed[key] };
    });
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveNotifSettings(s: AllNotifSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  syncToSW(s);
}

// ── Service Worker ────────────────────────────────────────────────────────────

export async function registerSW(): Promise<void> {
  if (!isSWSupported()) return;
  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    await navigator.serviceWorker.ready;
    syncToSW(getNotifSettings());
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "LAST_SHOWN") {
        localStorage.setItem("noor-notif-lastShown", JSON.stringify(e.data.lastShown));
      }
    });
  } catch {
    // SW unavailable — silently ignore
  }
}

export function syncToSW(settings: AllNotifSettings): void {
  if (!isSWSupported() || !navigator.serviceWorker.controller) return;
  const lastShown = (() => {
    try { return JSON.parse(localStorage.getItem("noor-notif-lastShown") ?? "{}"); }
    catch { return {}; }
  })();
  navigator.serviceWorker.controller.postMessage({ type: "SYNC_SETTINGS", settings, lastShown });
}

export async function sendTestNotification(): Promise<boolean> {
  if (getPermissionState() !== "granted") return false;
  if (!isSWSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) {
      reg.active.postMessage({ type: "TEST_NOTIFICATION" });
      return true;
    }
  } catch { /* ignore */ }
  return false;
}
