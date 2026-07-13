/**
 * Azan Scheduler — fetches real prayer times from Aladhan API and schedules
 * exact native alarms via AzanPlugin for each enabled prayer.
 *
 * Call scheduleAzan() on app start and whenever Azan settings or location change.
 * Safe to call in the browser (no-ops gracefully when Capacitor is unavailable).
 */

import { isCapacitorApp } from "./notifications";
import {
  getGpsCoords, getCity, getCountry, getLocationSource, saveGpsCoords,
  getCalcMethod, calcMethodParam,
} from "./settings";
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

// ── Prayer-time cache (offline fallback) ──────────────────────────────────────
// Stores today+tomorrow timings keyed by date+location so offline launches
// can still schedule alarms from the last successful fetch.

const TIMINGS_CACHE_KEY = "noor-azan-timings-v1";

interface TimingsCache {
  todayDate:   string;         // "DD-MM-YYYY"
  locationKey: string;         // city:city:country  OR  gps:lat,lng
  today:       RawTimings | null;
  tomorrow:    RawTimings | null;
}

function makeCacheKey(): string {
  const src    = getLocationSource();
  const coords = getGpsCoords();
  const method = `m:${getCalcMethod()}`; // cache invalidates when method changes
  if (src === "gps" && coords) {
    return `gps:${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}|${method}`;
  }
  return `city:${getCity()}:${getCountry()}|${method}`;
}

function loadTimingsCache(todayStr: string, locationKey: string): TimingsCache | null {
  try {
    const raw = localStorage.getItem(TIMINGS_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as TimingsCache;
    return (c.todayDate === todayStr && c.locationKey === locationKey) ? c : null;
  } catch {
    return null;
  }
}

function saveTimingsCache(
  todayStr: string,
  locationKey: string,
  today: RawTimings | null,
  tomorrow: RawTimings | null,
): void {
  try {
    localStorage.setItem(TIMINGS_CACHE_KEY, JSON.stringify({ todayDate: todayStr, locationKey, today, tomorrow }));
  } catch { /* storage full — skip */ }
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

    // Same method selection as the Prayer Times screen: "auto" omits the
    // param so Aladhan picks the regional authority; manual override adds it.
    if (src === "gps" && coords) {
      url = `https://api.aladhan.com/v1/timings/${dateStr(date)}?latitude=${coords.lat}&longitude=${coords.lng}${calcMethodParam()}`;
    } else {
      const city    = getCity();
      const country = getCountry();
      if (!city || !country) return null;
      url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&date=${dateStr(date)}${calcMethodParam()}`;
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

/**
 * Battery-efficient, one-shot GPS refresh so prayer times stay accurate as
 * the user travels, with no manual setup required.
 *
 * - If the user has never set a location (fresh install), this silently
 *   attempts to auto-detect it via GPS so Azan works out of the box.
 * - If the user is already on GPS mode, this refreshes the fix (cheap: a
 *   single low-accuracy request, not continuous tracking/watchPosition).
 * - If the user explicitly picked a manual city, we respect that choice and
 *   never override it with GPS.
 * Failures (denied permission, timeout, no GPS) are silently ignored — the
 * scheduler falls back to whatever city/coords are already saved.
 */
function refreshGpsLocation(): Promise<void> {
  return new Promise((resolve) => {
    const src = getLocationSource();
    if (src === "manual") { resolve(); return; } // respect explicit user choice
    if (typeof navigator === "undefined" || !navigator.geolocation) { resolve(); return; }

    const timeout = setTimeout(resolve, 8_000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        saveGpsCoords(pos.coords.latitude, pos.coords.longitude);
        resolve();
      },
      () => {
        clearTimeout(timeout);
        resolve(); // permission denied / unavailable — keep last known location
      },
      {
        enableHighAccuracy: false, // coarse fix is plenty for prayer-time calc, saves battery
        timeout: 8_000,
        maximumAge: 10 * 60 * 1000, // accept a fix up to 10 min old — avoids forcing a fresh GPS read
      },
    );
  });
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
    // Battery-efficient one-shot GPS refresh — keeps prayer times accurate
    // with no manual setup, without any continuous background tracking.
    await refreshGpsLocation();

    const now      = new Date();
    const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr    = dateStr(today);
    const locationKey = makeCacheKey();

    // Fetch fresh timings from the network
    const [netToday, netTomorrow] = await Promise.all([
      fetchTimings(today),
      fetchTimings(tomorrow),
    ]);

    let todayTimings    = netToday;
    let tomorrowTimings = netTomorrow;

    if (netToday || netTomorrow) {
      // Persist for offline use
      saveTimingsCache(todayStr, locationKey, netToday, netTomorrow);
    } else {
      // Network failed — try offline cache (valid for the same date+location)
      const cached = loadTimingsCache(todayStr, locationKey);
      if (cached) {
        todayTimings    = cached.today;
        tomorrowTimings = cached.tomorrow;
      }
    }

    if (!todayTimings && !tomorrowTimings) return; // no internet / no cache / no location

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
