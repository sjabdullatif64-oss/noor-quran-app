/**
 * Azan Scheduler — fetches real prayer times from Aladhan API and schedules
 * exact native alarms via AzanPlugin for each enabled prayer.
 *
 * Call scheduleAzan() on app start and whenever Azan settings or location change.
 * Safe to call in the browser (no-ops gracefully when Capacitor is unavailable).
 */

import { isCapacitorApp } from "./notifications";
import { getGpsCoords, getCity, getCountry, getLocationSource } from "./settings";
import {
  getAzanSettings,
  AZAN_PRAYER_DEFS,
  type AzanPrayerToggles,
} from "./azan-settings";
import {
  azanSchedulePrayer,
  azanCancelAll,
  azanSavePrayerTimes,
  type PrayerScheduleItem,
} from "./azan-plugin";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawTimings {
  Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string;
  [k: string]: string;
}

interface AladhanDayData {
  timings: RawTimings;
}

// Prayer key → alarm ID offset (1000 = today, 1010 = tomorrow)
const PRAYER_ID: Record<keyof AzanPrayerToggles, number> = {
  fajr:    0,
  dhuhr:   1,
  asr:     2,
  maghrib: 3,
  isha:    4,
};

const PRAYER_API_KEY: Record<keyof AzanPrayerToggles, string> = {
  fajr:    "Fajr",
  dhuhr:   "Dhuhr",
  asr:     "Asr",
  maghrib: "Maghrib",
  isha:    "Isha",
};

// ── API helpers ───────────────────────────────────────────────────────────────

function dateStr(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

async function fetchTimings(date: Date): Promise<RawTimings | null> {
  try {
    const src   = getLocationSource();
    const coords = getGpsCoords();
    let url: string;

    if (src === "gps" && coords) {
      url = `https://api.aladhan.com/v1/timings/${dateStr(date)}?latitude=${coords.lat}&longitude=${coords.lng}&method=2`;
    } else {
      const city    = getCity();
      const country = getCountry();
      if (!city || !country) return null;
      url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2&date=${dateStr(date)}`;
    }

    const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json() as { code: number; data: AladhanDayData };
    if (data.code !== 200) return null;
    return data.data.timings;
  } catch {
    return null;
  }
}

/** Parse "HH:MM (timezone)" → timestamp for the given calendar date */
function parseTimestamp(timeStr: string, date: Date): number | null {
  try {
    const clean = timeStr.replace(/ \(.*\)/, "").trim();
    const parts = clean.split(":");
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  } catch {
    return null;
  }
}

// ── Main scheduler ────────────────────────────────────────────────────────────

let _scheduling = false; // prevent concurrent runs

export async function scheduleAzan(): Promise<void> {
  if (!isCapacitorApp()) return;

  const settings = getAzanSettings();
  if (!settings.enabled) {
    await azanCancelAll();
    return;
  }

  if (_scheduling) return;
  _scheduling = true;

  try {
    const now      = new Date();
    const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayTimings, tomorrowTimings] = await Promise.all([
      fetchTimings(today),
      fetchTimings(tomorrow),
    ]);

    if (!todayTimings && !tomorrowTimings) return; // no internet / no location

    await azanCancelAll();

    const scheduled: PrayerScheduleItem[] = [];

    const scheduleDay = (
      timings:   RawTimings,
      date:      Date,
      idOffset:  number,
    ) => {
      for (const def of AZAN_PRAYER_DEFS) {
        if (!settings.prayers[def.key]) continue;
        const raw = timings[PRAYER_API_KEY[def.key]];
        if (!raw) continue;
        const ts = parseTimestamp(raw, date);
        if (!ts || ts <= Date.now()) continue; // already past
        const item: PrayerScheduleItem = {
          id:        1000 + PRAYER_ID[def.key] + idOffset,
          name:      def.label,
          timestamp: ts,
          sound:     settings.sound,
        };
        scheduled.push(item);
      }
    };

    if (todayTimings)    scheduleDay(todayTimings,    today,    0);
    if (tomorrowTimings) scheduleDay(tomorrowTimings, tomorrow, 10);

    // Schedule all collected alarms
    for (const item of scheduled) {
      await azanSchedulePrayer(item);
    }

    // Persist schedule for boot-time rescheduling
    if (scheduled.length > 0) {
      await azanSavePrayerTimes(scheduled);
    }
  } finally {
    _scheduling = false;
  }
}

/** Cancel all Azan alarms immediately (e.g. when user disables Azan). */
export async function cancelAzan(): Promise<void> {
  if (!isCapacitorApp()) return;
  await azanCancelAll();
}
