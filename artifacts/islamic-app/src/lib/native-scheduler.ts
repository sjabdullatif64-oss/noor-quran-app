/**
 * Noor Quran — Capacitor Local Notifications scheduler
 *
 * Uses @capacitor/local-notifications to schedule/cancel recurring Islamic
 * reminders natively on Android.  Zero-impact in the browser — every call is
 * gated behind isCapacitorApp().
 *
 * Notification ID map (fixed, so cancel/reschedule is deterministic):
 *   1  quranAyah        daily
 *   2  fajrReminder     daily
 *   3  dhuhrReminder    daily
 *   4  asrReminder      daily
 *   5  maghribReminder  daily
 *   6  ishaReminder     daily
 *   7  jummaReminder    weekly (Friday)
 *   8  islamicQuote     daily
 *   9  tasbeehReminder  daily
 *  10  morningAzkar     daily
 *  11  eveningAzkar     daily
 * 999  test             one-shot (3 s delay)
 */

import { isCapacitorApp } from "./notifications";
import type { AllNotifSettings } from "./notifications";

// ── ID map ────────────────────────────────────────────────────────────────────

const NOTIF_IDS: Record<keyof AllNotifSettings, number> = {
  quranAyah:       1,
  fajrReminder:    2,
  dhuhrReminder:   3,
  asrReminder:     4,
  maghribReminder: 5,
  ishaReminder:    6,
  jummaReminder:   7,
  islamicQuote:    8,
  tasbeehReminder: 9,
  morningAzkar:    10,
  eveningAzkar:    11,
};

// ── Notification content ──────────────────────────────────────────────────────

const CONTENT: Record<keyof AllNotifSettings, { title: string; body: string }> = {
  quranAyah:       { title: "Daily Quran Ayah",        body: "Open Noor Quran for your verse of the day" },
  fajrReminder:    { title: "Fajr Prayer Time \uD83C\uDF05", body: "Time for the dawn prayer — start your day with Allah" },
  dhuhrReminder:   { title: "Dhuhr Prayer Time \u2600\uFE0F", body: "Midday prayer — take a moment for salah" },
  asrReminder:     { title: "Asr Prayer Time \u26C5",   body: "Afternoon prayer — remember Allah" },
  maghribReminder: { title: "Maghrib Prayer \uD83C\uDF07", body: "Sunset prayer — the day turns toward night" },
  ishaReminder:    { title: "Isha Prayer Time \uD83C\uDF19", body: "Night prayer — end your day with remembrance" },
  jummaReminder:   { title: "Jumu\u02BCah Mubarak \uD83D\uDD4C", body: "Read Surah Al-Kahf today and send salawat upon the Prophet \uFDFA" },
  islamicQuote:    { title: "Islamic Wisdom \u2728",    body: "Your daily reminder from the Sunnah" },
  tasbeehReminder: { title: "Tasbeeh Reminder \uD83D\uDCFF", body: "SubhanAllah · Alhamdulillah · Allahu Akbar" },
  morningAzkar:    { title: "Morning Azkar \uD83C\uDF24\uFE0F",  body: "Begin with the morning remembrance — 33× SubhanAllah" },
  eveningAzkar:    { title: "Evening Azkar \uD83C\uDF06",  body: "Evening dhikr time — seek forgiveness before night" },
};

/** Keys that fire weekly on Friday rather than daily. */
const FRIDAY_KEYS: ReadonlySet<keyof AllNotifSettings> = new Set(["jummaReminder"]);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Cancel all previously scheduled Noor Quran notifications and reschedule
 * only the ones that are currently enabled in `settings`.
 *
 * Safe to call whenever the user changes notification preferences.
 */
export async function scheduleNativeNotifications(
  settings: AllNotifSettings
): Promise<void> {
  if (!isCapacitorApp()) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Cancel every known notification ID first (clean slate)
    const allIds = [...Object.values(NOTIF_IDS), 999].map((id) => ({ id }));
    await LocalNotifications.cancel({ notifications: allIds }).catch(() => {});

    // Build the list to schedule
    const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];

    for (const [rawKey, setting] of Object.entries(settings)) {
      const key = rawKey as keyof AllNotifSettings;
      if (!setting.enabled) continue;

      const fridayOnly = FRIDAY_KEYS.has(key);
      const [hour, minute] = setting.time.split(":").map(Number);
      const { title, body } = CONTENT[key];

      // Use 'on' (calendar-field matching) instead of 'at' (exact timestamp).
      // 'at' scheduling requires SCHEDULE_EXACT_ALARM permission which:
      //   - Android 12+ (API 31): must be manually granted in system settings
      //   - Android 14+ (API 34): revoked by default for new installs
      // 'on: { hour, minute }' uses inexact AlarmManager repeats — no special
      // permission needed, fires at the specified wall-clock time each day/week.
      // Capacitor weekday: 1 = Sunday … 6 = Friday … 7 = Saturday
      const on: { hour: number; minute: number; weekday?: number } = { hour, minute };
      if (fridayOnly) on.weekday = 6;

      toSchedule.push({
        id:    NOTIF_IDS[key],
        title,
        body,
        schedule: {
          on,
          allowWhileIdle: true,
        },
        channelId:    "noor-islamic",
        smallIcon:    "ic_stat_noor",
        iconColor:    "#1a5c38",
        // No `sound` field — let the channel's configured sound play
        actionTypeId: "",
        extra: null,
      });
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch (err) {
    console.warn("[NativeNotif] scheduling failed:", err);
  }
}

/**
 * Request the native POST_NOTIFICATIONS permission (Android 13+).
 * Returns "granted" or "denied".
 */
export async function requestNativePermission(): Promise<"granted" | "denied"> {
  if (!isCapacitorApp()) return "denied";
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

/**
 * Check the current native notification permission without prompting.
 */
export async function checkNativePermission(): Promise<"granted" | "denied" | "default"> {
  if (!isCapacitorApp()) return "default";
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.checkPermissions();
    if (result.display === "granted") return "granted";
    if (result.display === "denied")  return "denied";
    return "default";
  } catch {
    return "default";
  }
}

/**
 * Fire an immediate test notification (fires 3 seconds after call).
 */
export async function sendNativeTestNotification(): Promise<boolean> {
  if (!isCapacitorApp()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{
        id:       999,
        title:    "Noor Quran \uD83C\uDF19",
        body:     "Notifications are working! Alhamdulillah.",
        schedule: { at: new Date(Date.now() + 3_000), allowWhileIdle: true },
        channelId:    "noor-islamic",
        smallIcon:    "ic_stat_noor",
        iconColor:    "#1a5c38",
        // No `sound` field — let the channel's configured sound play
        actionTypeId: "",
        extra: null,
      }],
    });
    return true;
  } catch {
    return false;
  }
}
