// Noor Quran — Notification permissions, settings, and Service Worker bridge

const STORAGE_KEY        = "noor-notif-settings";
const SW_PATH            = "/service-worker.js";
const DENIAL_STORED_KEY  = "noor-notif-explicit-denied"; // set only after we actually request & get denied

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
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
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
  if (isCapacitorApp())                return "capacitor";
  if (isAndroid() && isInstalledPWA()) return "twa";
  if (isAndroid())                     return "android";
  return "browser";
}

// ── Notification API support ──────────────────────────────────────────────────

export function isNotificationAPISupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isSWSupported(): boolean {
  return isNotificationAPISupported() && "serviceWorker" in navigator;
}

export function isSupported(): boolean {
  if (isCapacitorApp()) return true; // always show — native path
  return isNotificationAPISupported();
}

// ── Permission state ──────────────────────────────────────────────────────────

export type PermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Read the current notification permission.
 *
 * Android 13+ TWA/PWA edge case:
 *   `Notification.permission` can report "denied" even when the user has NOT yet
 *   been shown the system prompt, because Android treats the web permission as
 *   "denied" until the app explicitly requests it via requestPermission().
 *   Additionally, after the user grants permission in Android Settings,
 *   `Notification.permission` may not update until the next page load.
 *
 * Strategy: If we're in a TWA/Android environment AND we have NOT stored an
 * explicit denial record (set only when requestPermission() actually returns
 * "denied"), we treat a raw "denied" as "default" — keeping the Enable button
 * visible so the user can trigger the system permission prompt.
 */
export function getPermissionState(): PermissionState {
  // Capacitor: use localStorage flag set by requestPermission()
  if (isCapacitorApp()) {
    if (!isNotificationAPISupported()) {
      const stored = localStorage.getItem("noor-cap-notif-perm");
      if (stored === "granted") return "granted";
      if (stored === "denied")  return "denied";
      return "default";
    }
  }

  if (!isNotificationAPISupported()) return "unsupported";

  const raw = Notification.permission as PermissionState;

  // Android TWA/PWA: don't treat "denied" as hard-blocked unless we explicitly
  // recorded a denial after calling requestPermission().
  if (raw === "denied" && (isAndroid() || isInstalledPWA())) {
    const explicitlyDenied = localStorage.getItem(DENIAL_STORED_KEY) === "1";
    if (!explicitlyDenied) return "default";
  }

  return raw;
}

/**
 * Async version that uses the Permissions API (more accurate on Android).
 * Falls back to getPermissionState() if the Permissions API is unavailable.
 */
export async function getPermissionStateAsync(): Promise<PermissionState> {
  if (!isNotificationAPISupported()) return "unsupported";

  // Use the Permissions API when available — it reflects system-level changes
  // (e.g. user granting in Android Settings) more reliably than Notification.permission.
  if ("permissions" in navigator) {
    try {
      const status = await navigator.permissions.query({
        name: "notifications" as PermissionName,
      });

      // Subscribe to future changes so the UI updates without a reload
      status.onchange = null; // caller can subscribe if needed

      if (status.state === "granted") return "granted";
      if (status.state === "denied") {
        // Same Android TWA guard as above
        if (isAndroid() || isInstalledPWA()) {
          const explicitlyDenied = localStorage.getItem(DENIAL_STORED_KEY) === "1";
          if (!explicitlyDenied) return "default";
        }
        return "denied";
      }
      return "default";
    } catch {
      // Permissions API blocked (e.g. some browsers throw on "notifications")
    }
  }

  return getPermissionState();
}

// ── Permission request ────────────────────────────────────────────────────────

/**
 * Request notification permission using the best available API.
 * MUST be called from a user-gesture handler (button click), never from
 * setTimeout / useEffect — Android Chrome auto-denies outside user gestures.
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
        if (state === "denied") localStorage.setItem(DENIAL_STORED_KEY, "1");
        return state;
      } catch {
        // Plugin failed — fall through to web Notification API
      }
    }
  }

  // ── Web Notification API path ───────────────────────────────────────────────
  if (!isNotificationAPISupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";

  // If the browser says "denied" but we're in Android/TWA mode and haven't
  // explicitly denied before, try requesting anyway — the system prompt may
  // still appear (Android 13+ runtime permission).
  const isAndroidLike = isAndroid() || isInstalledPWA();
  const hardDenied =
    Notification.permission === "denied" &&
    (!isAndroidLike || localStorage.getItem(DENIAL_STORED_KEY) === "1");

  if (hardDenied) return "denied";

  try {
    const result = await Notification.requestPermission();
    if (result === "denied") {
      // Record the explicit denial so we don't keep prompting
      localStorage.setItem(DENIAL_STORED_KEY, "1");
    } else if (result === "granted") {
      // Clear any stale denial record
      localStorage.removeItem(DENIAL_STORED_KEY);
    }
    return result as PermissionState;
  } catch {
    return "denied";
  }
}

// ── Settings storage ──────────────────────────────────────────────────────────

export function getNotifSettings(): AllNotifSettings {
  try {
    const raw    = localStorage.getItem(STORAGE_KEY);
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
