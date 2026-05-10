// Noor Quran — Notification settings management and Service Worker bridge

const STORAGE_KEY = "noor-notif-settings";
const SW_PATH = "/service-worker.js";

export interface NotifSetting {
  enabled: boolean;
  time: string; // "HH:MM" 24-hour
}

export interface AllNotifSettings {
  quranAyah: NotifSetting;
  fajrReminder: NotifSetting;
  dhuhrReminder: NotifSetting;
  asrReminder: NotifSetting;
  maghribReminder: NotifSetting;
  ishaReminder: NotifSetting;
  jummaReminder: NotifSetting;
  islamicQuote: NotifSetting;
  tasbeehReminder: NotifSetting;
  morningAzkar: NotifSetting;
  eveningAzkar: NotifSetting;
}

export const DEFAULT_SETTINGS: AllNotifSettings = {
  quranAyah:      { enabled: false, time: "08:00" },
  fajrReminder:   { enabled: false, time: "05:00" },
  dhuhrReminder:  { enabled: false, time: "12:30" },
  asrReminder:    { enabled: false, time: "15:30" },
  maghribReminder:{ enabled: false, time: "18:30" },
  ishaReminder:   { enabled: false, time: "20:00" },
  jummaReminder:  { enabled: false, time: "12:00" },
  islamicQuote:   { enabled: false, time: "09:00" },
  tasbeehReminder:{ enabled: false, time: "07:00" },
  morningAzkar:   { enabled: false, time: "06:30" },
  eveningAzkar:   { enabled: false, time: "17:30" },
};

export function getNotifSettings(): AllNotifSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveNotifSettings(s: AllNotifSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  syncToSW(s);
}

export function getPermissionState(): "granted" | "denied" | "default" | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

export async function registerSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    await navigator.serviceWorker.ready;
    syncToSW(getNotifSettings());

    // Listen for lastShown updates from SW
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
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
  const lastShown = (() => {
    try { return JSON.parse(localStorage.getItem("noor-notif-lastShown") ?? "{}"); }
    catch { return {}; }
  })();
  navigator.serviceWorker.controller.postMessage({
    type: "SYNC_SETTINGS",
    settings,
    lastShown,
  });
}

export async function sendTestNotification(): Promise<boolean> {
  if (getPermissionState() !== "granted") return false;
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.ready;
  if (reg.active) {
    reg.active.postMessage({ type: "TEST_NOTIFICATION" });
    return true;
  }
  return false;
}

export function isSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}
