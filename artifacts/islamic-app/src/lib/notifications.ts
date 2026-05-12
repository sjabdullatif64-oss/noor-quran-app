// Noor Quran — Notification permissions, settings, and Service Worker bridge

const STORAGE_KEY       = "noor-notif-settings";
const SW_PATH           = "/service-worker.js";
const DENIAL_STORED_KEY = "noor-notif-explicit-denied"; // set only after explicit denial

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
 * True when running inside a Capacitor native shell (APK built with Capacitor).
 * Capacitor injects window.Capacitor before the page script runs.
 */
export function isCapacitorApp(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  );
}

/** Environment label used by the Notifications UI. */
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
  if (isCapacitorApp()) return true; // always show UI — native LocalNotifications path
  return isNotificationAPISupported();
}

// ── Permission state ──────────────────────────────────────────────────────────

export type PermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Synchronous permission read.
 *
 * Capacitor: uses the value cached in localStorage by requestPermission().
 *   We never rely on the Web Notification API permission inside Capacitor because
 *   that permission is separate from the native POST_NOTIFICATIONS permission.
 *
 * TWA/Android browser: treats a raw "denied" as "default" if we haven't
 *   explicitly recorded a denial — Android 13+ sometimes reports "denied" before
 *   the system prompt has ever appeared.
 */
export function getPermissionState(): PermissionState {
  // ── Capacitor: read stored value only (native API is always async) ──────────
  if (isCapacitorApp()) {
    const stored = localStorage.getItem("noor-cap-notif-perm");
    if (stored === "granted") return "granted";
    if (stored === "denied")  return "denied";
    return "default"; // show the Enable button so the user can grant
  }

  if (!isNotificationAPISupported()) return "unsupported";

  const raw = Notification.permission as PermissionState;

  // Android TWA/PWA guard: don't show "blocked" state if we've never actually
  // called requestPermission() and received a "denied" result.
  if (raw === "denied" && (isAndroid() || isInstalledPWA())) {
    const explicitlyDenied = localStorage.getItem(DENIAL_STORED_KEY) === "1";
    if (!explicitlyDenied) return "default";
  }

  return raw;
}

/**
 * Async permission check — more accurate on Android because it queries the
 * native plugin (Capacitor) or the Permissions API (browser).
 */
export async function getPermissionStateAsync(): Promise<PermissionState> {
  // ── Capacitor: query the LocalNotifications plugin directly ─────────────────
  if (isCapacitorApp()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.checkPermissions();
      // Cache the result for the sync getPermissionState()
      if (result.display === "granted") {
        localStorage.setItem("noor-cap-notif-perm", "granted");
        return "granted";
      }
      if (result.display === "denied") {
        localStorage.setItem("noor-cap-notif-perm", "denied");
        return "denied";
      }
      return "default";
    } catch {
      return getPermissionState();
    }
  }

  // ── Web: use the Permissions API when available ──────────────────────────────
  if (!isNotificationAPISupported()) return "unsupported";

  if ("permissions" in navigator) {
    try {
      const status = await navigator.permissions.query({
        name: "notifications" as PermissionName,
      });

      if (status.state === "granted") return "granted";
      if (status.state === "denied") {
        if (isAndroid() || isInstalledPWA()) {
          const explicitlyDenied = localStorage.getItem(DENIAL_STORED_KEY) === "1";
          if (!explicitlyDenied) return "default";
        }
        return "denied";
      }
      return "default";
    } catch {
      // Permissions API blocked in some browsers
    }
  }

  return getPermissionState();
}

// ── Permission request ────────────────────────────────────────────────────────

/**
 * Request notification permission.
 * MUST be called from a direct user-gesture handler (button click).
 * Android auto-denies Notification.requestPermission() outside user gestures.
 */
export async function requestPermission(): Promise<PermissionState> {
  // ── Capacitor: use @capacitor/local-notifications plugin ────────────────────
  if (isCapacitorApp()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.requestPermissions();
      const state: PermissionState = result.display === "granted" ? "granted" : "denied";
      localStorage.setItem("noor-cap-notif-perm", state);
      if (state === "denied") localStorage.setItem(DENIAL_STORED_KEY, "1");
      else                    localStorage.removeItem(DENIAL_STORED_KEY);
      return state;
    } catch {
      // Plugin unavailable — fall through to web Notification API
    }
  }

  // ── Web Notification API ────────────────────────────────────────────────────
  if (!isNotificationAPISupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";

  const isAndroidLike = isAndroid() || isInstalledPWA();
  const hardDenied =
    Notification.permission === "denied" &&
    (!isAndroidLike || localStorage.getItem(DENIAL_STORED_KEY) === "1");

  if (hardDenied) return "denied";

  try {
    const result = await Notification.requestPermission();
    if (result === "denied") {
      localStorage.setItem(DENIAL_STORED_KEY, "1");
    } else if (result === "granted") {
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

/**
 * Persist updated notification settings.
 *
 * In Capacitor (native APK): also reschedules all native LocalNotifications
 *   so the Android alarm manager fires at the user-configured times.
 * In browser/TWA: syncs to the Service Worker for web push handling.
 */
export function saveNotifSettings(s: AllNotifSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

  if (isCapacitorApp()) {
    // Reschedule native notifications — dynamic import avoids circular deps
    import("./native-scheduler")
      .then(({ scheduleNativeNotifications }) => scheduleNativeNotifications(s))
      .catch(() => { /* never block saving on scheduling errors */ });
  } else {
    syncToSW(s);
  }
}

// ── Service Worker (web/TWA path) ─────────────────────────────────────────────

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
    // SW registration failed — silently ignore (Capacitor doesn't need SW)
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

/**
 * Fire a test notification immediately.
 *
 * Capacitor: schedules via LocalNotifications (fires in 3 s).
 * Browser/TWA: delegates to the Service Worker.
 */
export async function sendTestNotification(): Promise<boolean> {
  if (getPermissionState() !== "granted") return false;

  // ── Capacitor native path ──────────────────────────────────────────────────
  if (isCapacitorApp()) {
    try {
      const { sendNativeTestNotification } = await import("./native-scheduler");
      return sendNativeTestNotification();
    } catch {
      return false;
    }
  }

  // ── Web / Service Worker path ───────────────────────────────────────────────
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
