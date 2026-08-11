import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  MapPin, Search, LocateFixed, Loader2, WifiOff,
  ChevronDown, ChevronUp, Navigation, RefreshCw, X, Bell,
} from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePrayerTimes,
  usePrayerTimesByCoords,
  reverseGeocode,
  type PrayerData,
} from "@/lib/api";
import {
  getCity, getCountry, setCity as saveCity,
  getGpsCoords, saveGpsCoords, clearGpsCoords,
  getLocationSource, getCalcMethod,
  CITY_COUNTRY_MAP,
} from "@/lib/settings";
import { useI18n } from "@/lib/i18n-context";
import {
  getLocationPermissionState,
  LocationPermissionDialog,
  type LocationPermissionState,
} from "@/components/location-permission-dialog";
import { openLocationSettings } from "@/lib/capacitor";

type PrayerDef = {
  id: "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
  name: string;
  nameAr: string;
  icon: string;
  desc: string;
};

function getPrayerDefs(t: (key: string) => string): PrayerDef[] {
  return [
    { id: "Fajr", name: t("prayer_name_Fajr"), nameAr: "الفجر", icon: "🌅", desc: t("prayer_name_Fajr") },
    { id: "Sunrise", name: t("prayer_name_Sunrise"), nameAr: "الشروق", icon: "☀️", desc: t("prayer_name_Sunrise") },
    { id: "Dhuhr", name: t("prayer_name_Dhuhr"), nameAr: "الظهر", icon: "🌤️", desc: t("prayer_name_Dhuhr") },
    { id: "Asr", name: t("prayer_name_Asr"), nameAr: "العصر", icon: "⛅", desc: t("prayer_name_Asr") },
    { id: "Maghrib", name: t("prayer_name_Maghrib"), nameAr: "المغرب", icon: "🌇", desc: t("prayer_name_Maghrib") },
    { id: "Isha", name: t("prayer_name_Isha"), nameAr: "العشاء", icon: "🌙", desc: t("prayer_name_Isha") },
  ];
}

// ── Prayer times offline cache ────────────────────────────────────────────────
// Caches the last successful prayer timetable in localStorage so Azan and
// prayer times continue working when the device is offline.
const PRAYER_CACHE_KEY = "noor-prayer-cache";
const PRAYER_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface PrayerCache {
  locKey:  string;
  data:    PrayerData;
  savedAt: number;
}

function savePrayerCache(data: PrayerData, locKey: string): void {
  try {
    const entry: PrayerCache = { locKey, data, savedAt: Date.now() };
    localStorage.setItem(PRAYER_CACHE_KEY, JSON.stringify(entry));
  } catch { /* storage full — ignore */ }
}

function loadPrayerCache(locKey: string): PrayerData | null {
  try {
    const raw = localStorage.getItem(PRAYER_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as PrayerCache;
    if (entry.locKey !== locKey) return null;
    if (Date.now() - entry.savedAt > PRAYER_CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}

function makeCacheKey(
  useGPS: boolean,
  lat: number | null, lng: number | null,
  city: string, country: string,
): string {
  const method = `m:${getCalcMethod()}`; // never serve times from a different method
  if (useGPS && lat !== null && lng !== null) {
    return `gps:${lat.toFixed(2)},${lng.toFixed(2)}|${method}`;
  }
  return `city:${city},${country}|${method}`;
}

// ── Prayer definitions ────────────────────────────────────────────────────────
// ── Location state machine ────────────────────────────────────────────────────
type LocState =
  | "detecting"   // auto-detecting GPS on mount
  | "gps-active"  // GPS granted and coords are valid
  | "gps-denied"  // GPS permission denied by user
  | "gps-error"   // GPS timed out / failed
  | "manual"      // user manually searched a city
  | "no-location"; // nothing saved, prompt needed

// ── Countdown to next prayer ──────────────────────────────────────────────────
function useCountdown(data: PrayerData | undefined, prayers: PrayerDef[]) {
  const [label, setLabel] = useState("");
  const [nextIdx, setNextIdx] = useState(-1);

  useEffect(() => {
    if (!data) { setLabel(""); setNextIdx(-1); return; }

    const tick = () => {
      const now     = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      let found = -1;
      for (let i = 0; i < prayers.length; i++) {
        const raw = data.timings[prayers[i].id];
        if (!raw) continue;
        const clean = raw.replace(/ \(.*\)/, "");
        const [h, m] = clean.split(":").map(Number);
        if (nowMins < h * 60 + m) { found = i; break; }
      }
      if (found === -1) found = 0; // wrap to Fajr next day
      setNextIdx(found);

      const raw   = data.timings[prayers[found].id];
      const clean = raw?.replace(/ \(.*\)/, "") ?? "";
      const [h, m] = clean.split(":").map(Number);
      let diffMins = h * 60 + m - nowMins;
      if (diffMins < 0) diffMins += 24 * 60;
      const hh = String(Math.floor(diffMins / 60)).padStart(2, "0");
      const mm = String(diffMins % 60).padStart(2, "0");
      setLabel(`${hh}:${mm}`);
    };

    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [data]);

  return { countdown: label, nextPrayerIdx: nextIdx };
}

// ── Current prayer index ──────────────────────────────────────────────────────
function getCurrentPrayerIdx(data: PrayerData | undefined, prayers: PrayerDef[]) {
  if (!data) return -1;
  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let cur = -1;
  for (let i = prayers.length - 1; i >= 0; i--) {
    const raw = data.timings[prayers[i].id];
    if (!raw) continue;
    const clean = raw.replace(/ \(.*\)/, "");
    const [h, m] = clean.split(":").map(Number);
    if (nowMins >= h * 60 + m) { cur = i; break; }
  }
  return cur;
}

// ── Format time ───────────────────────────────────────────────────────────────
function fmtTime(raw: string | undefined): string {
  if (!raw) return "--:--";
  const clean = raw.replace(/ \(.*\)/, "");
  const [h, m] = clean.split(":").map(Number);
  const ampm   = h >= 12 ? "PM" : "AM";
  const h12    = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Main component ────────────────────────────────────────────────────────────
export function PrayerTimes() {
  const { t } = useI18n();
  const PRAYERS = getPrayerDefs(t);
  // ── Location state ──────────────────────────────────────────────────────────
  const [locState, setLocState]  = useState<LocState>(() => {
    const src = getLocationSource();
    if (src === "gps" && getGpsCoords()) return "gps-active";
    if (src === "manual" && getCity())    return "manual";
    return "no-location";
  });

  const [coords, setCoords]         = useState<{ lat: number; lng: number } | null>(() => getGpsCoords());
  const [gpsCity, setGpsCity]       = useState(() => getLocationSource() === "gps" ? getCity() : "");
  const [gpsCountry, setGpsCountry] = useState(() => getLocationSource() === "gps" ? getCountry() : "");
  const [manualCity, setManualCity]   = useState(() => getLocationSource() === "manual" ? getCity() : "");
  const [manualCountry, setManualCountry] = useState(() => getLocationSource() === "manual" ? getCountry() : "");

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState("");
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const geoWatchRef = useRef<number | null>(null);
  const [locationPermissionDialog, setLocationPermissionDialog] =
    useState<"request" | "blocked" | null>(null);

  // ── GPS detection ───────────────────────────────────────────────────────────
  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setLocState("gps-error");
      return;
    }
    setGpsLoading(true);
    setLocState("detecting");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        // Reverse geocode to get real city name
        const place = await reverseGeocode(lat, lng);
        const city    = place?.city    ?? "";
        const country = place?.country ?? "";

        saveGpsCoords(lat, lng, city, country);
        setGpsCity(city);
        setGpsCountry(country);
        setLocState("gps-active");
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocState("gps-denied");
          setLocationPermissionDialog("blocked");
        } else {
          setLocState("gps-error");
        }
        // If we have manual location saved, fall back to it
        if (getCity() && getLocationSource() === "manual") {
          setManualCity(getCity());
          setManualCountry(getCountry());
          setLocState("manual");
        }
      },
      { timeout: 12000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false }
    );
  }, []);

  const detectGPS = useCallback(async () => {
    const permission: LocationPermissionState = await getLocationPermissionState();
    if (permission === "granted") {
      requestGPS();
      return;
    }
    setLocationPermissionDialog(permission === "denied" ? "blocked" : "request");
  }, [requestGPS]);

  const continueLocationRequest = useCallback(() => {
    setLocationPermissionDialog(null);
    requestGPS();
  }, [requestGPS]);

  const handleOpenLocationSettings = useCallback(() => {
    setLocationPermissionDialog(null);
    void openLocationSettings();
  }, []);

  // ── Auto-detect GPS on every mount ──────────────────────────────────────────
  // GPS is always the preferred source. If the user had a manual city saved from
  // a previous session, it shows immediately as a fallback while GPS resolves.
  // Only skip auto-detection if GPS coords are already fresh in storage.
  useEffect(() => {
    if (locState !== "gps-active") {
      detectGPS();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching ───────────────────────────────────────────────────────────
  const useGPS = locState === "gps-active" || locState === "detecting";
  const coordsQuery = usePrayerTimesByCoords(
    useGPS ? coords?.lat ?? null : null,
    useGPS ? coords?.lng ?? null : null,
    useGPS && coords !== null
  );
  const manualQuery = usePrayerTimes(
    manualCity,
    manualCountry,
    locState === "manual" && !!manualCity && !!manualCountry
  );

  const activeData     = useGPS ? coordsQuery.data    : manualQuery.data;
  const activeLoading  = useGPS ? coordsQuery.isLoading : manualQuery.isLoading;
  const activeError    = useGPS ? coordsQuery.error    : manualQuery.error;

  const displayCity    = useGPS ? gpsCity    : manualCity;
  const displayCountry = useGPS ? gpsCountry : manualCountry;

  // ── Offline cache ────────────────────────────────────────────────────────────
  // Build a cache key for the current location so we never serve stale data
  // from a different city / coordinate pair.
  const locCacheKey = useMemo(
    () => makeCacheKey(useGPS, coords?.lat ?? null, coords?.lng ?? null, displayCity, displayCountry),
    [useGPS, coords, displayCity, displayCountry],
  );

  // Save to localStorage whenever fresh data arrives.
  useEffect(() => {
    if (activeData && locCacheKey) savePrayerCache(activeData, locCacheKey);
  }, [activeData, locCacheKey]);

  // Fall back to cached data when the network query has not returned data yet.
  const cachedData = useMemo(
    () => (activeData ? null : loadPrayerCache(locCacheKey)),
    // Recompute only when the live data status or key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locCacheKey, !!activeData],
  );

  // The data actually shown — live API result, or cached result offline.
  const displayData = activeData ?? cachedData ?? undefined;
  const isOfflineFallback = !activeData && !!cachedData;

  // ── Auto-refresh when internet reconnects ────────────────────────────────────
  const queryClient = useQueryClient();
  useEffect(() => {
    const onOnline = () => {
      queryClient.invalidateQueries({ queryKey: ["prayerTimes"] });
      queryClient.invalidateQueries({ queryKey: ["prayerTimesByCoords"] });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [queryClient]);

  // ── Current / next prayer ───────────────────────────────────────────────────
  const { countdown, nextPrayerIdx } = useCountdown(displayData, PRAYERS);
  const currentIdx = getCurrentPrayerIdx(displayData, PRAYERS);

  // ── Manual search ───────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parts      = searchInput.trim().split(",");
    const city       = parts[0]?.trim();
    const country    = parts[1]?.trim() ?? CITY_COUNTRY_MAP[city ?? ""] ?? "";
    if (!city) { setSearchError("Please enter a city name."); return; }
    setSearchError("");
    setManualCity(city);
    setManualCountry(country);
    saveCity(city, country);
    clearGpsCoords();
    setLocState("manual");
    setSearchOpen(false);
    setSearchInput("");
  };

  const handleUseLocation = () => {
    setSearchOpen(false);
    detectGPS();
  };

  return (
    <div className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500 bg-background">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">{t("prayer_times_title")}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{t("prayer_times_subtitle")}</p>
        </div>
        {/* GPS / Search toggle */}
        <div className="flex gap-2 mt-1">
          {locState !== "detecting" && (
            <button
              onClick={handleUseLocation}
              disabled={gpsLoading}
              title="Use my GPS location"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-primary hover:text-primary border border-border hover:border-border transition-all active:scale-90 bg-primary/10"
              data-testid="button-use-location"
            >
              {gpsLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <LocateFixed className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setSearchOpen((o) => !o)}
            title="Search a city"
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
               searchOpen
                 ? "text-foreground border-border bg-muted"
                 : "text-primary hover:text-primary border-border hover:border-border"
             }`}
            data-testid="button-toggle-search"
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* ── Search panel (collapsible) ────────────────────────────────── */}
        {searchOpen && (
          <div
            className="rounded-2xl border border-border overflow-hidden animate-in slide-in-from-top-2 duration-200 bg-card"
          >
            {/* Use My Location CTA */}
            <button
              onClick={handleUseLocation}
              disabled={gpsLoading}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-border text-left hover:bg-muted transition-colors active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/15">
                {gpsLoading
                  ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  : <LocateFixed className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <p className="text-primary text-sm font-semibold">{t("prayer_times_use_location")}</p>
                <p className="text-muted-foreground text-xs">{t("prayer_times_use_location_sub")}</p>
              </div>
            </button>

            {/* City search form */}
            <form onSubmit={handleSearch} className="p-3 flex gap-2" data-testid="form-search-location">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setSearchError(""); }}
                  placeholder={t("prayer_times_search_placeholder")}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-border transition-colors"
                  data-testid="input-location"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground transition-all active:scale-95"
                data-testid="button-search-location"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {searchError && (
              <p className="px-4 pb-2 text-destructive text-xs">{searchError}</p>
            )}

          </div>
        )}

        {/* ── Status / location strip ───────────────────────────────────── */}
          <LocationStrip
          locState={locState}
          city={displayCity}
          country={displayCountry}
          gpsLoading={gpsLoading}
          data={displayData}
          onRetry={handleUseLocation}
          nextIdx={nextPrayerIdx}
          countdown={countdown}
          prayers={PRAYERS}
          t={t}
        />

        {/* ── Azan Settings shortcut ───────────────────────────────────── */}
        <Link href="/azan-settings">
          <button
              className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-2xl border border-border hover:border-border active:scale-[0.98] transition-all bg-primary/10"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/15">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-foreground text-sm font-semibold">{t("prayer_times_azan_settings")}</p>
              <p className="text-muted-foreground text-xs">{t("prayer_times_azan_settings_sub")}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 -rotate-90" />
          </button>
        </Link>

        {/* ── Prayer time cards ─────────────────────────────────────────── */}
        {locState === "detecting" && !displayData ? (
          <DetectingPlaceholder prayers={PRAYERS} />
        ) : activeError && !displayData ? (
          <ErrorCard locState={locState} onRetry={locState === "manual" ? undefined : handleUseLocation} t={t} />
        ) : activeLoading && !displayData ? (
          <LoadingCards prayers={PRAYERS} />
        ) : displayData ? (
          <>
            <PrayerCards data={displayData} currentIdx={currentIdx} nextIdx={nextPrayerIdx} t={t} prayers={PRAYERS} />
            {isOfflineFallback && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-700/40 mx-1 bg-amber-500/10">
                <WifiOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0" />
                <p className="text-amber-800 dark:text-amber-200 text-xs">Offline — showing last saved prayer times</p>
              </div>
            )}
          </>
        ) : (
          <NoLocationPrompt onDetect={handleUseLocation} onSearch={() => setSearchOpen(true)} loading={gpsLoading} t={t} />
        )}

        {/* Hijri date footer (when data available) */}
        {displayData && (
          <div className="text-center py-2">
            <p className="text-muted-foreground text-xs">
              {displayData.date.hijri.day} {displayData.date.hijri.month.en} {displayData.date.hijri.year} AH
              {" · "}
              {displayData.date.readable}
            </p>
          </div>
        )}
      </div>
      <LocationPermissionDialog
        open={locationPermissionDialog !== null}
        mode={locationPermissionDialog ?? "request"}
        feature="prayer"
        onOpenChange={(open) => {
          if (!open) setLocationPermissionDialog(null);
        }}
        onContinue={continueLocationRequest}
        onOpenSettings={handleOpenLocationSettings}
      />
    </div>
  );
}

// ── Location strip ────────────────────────────────────────────────────────────
function LocationStrip({ locState, city, country, gpsLoading, data, onRetry, nextIdx, countdown, prayers, t }: {
  locState:   LocState;
  city:       string;
  country:    string;
  gpsLoading: boolean;
  data?:      PrayerData;
  onRetry:    () => void;
  nextIdx:    number;
  countdown:  string;
  prayers:    PrayerDef[];
  t: (key: string) => string;
}) {
  if (locState === "detecting" || gpsLoading) {
    return (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3 border border-border animate-pulse bg-primary/10">
        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
        <p className="text-muted-foreground text-sm">Detecting your location…</p>
      </div>
    );
  }

  if (locState === "gps-denied") {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 border border-amber-700/40 bg-amber-500/10"
      >
        <WifiOff className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
        <p className="text-amber-800 dark:text-amber-200 text-sm flex-1">Location access denied — search a city below.</p>
      </div>
    );
  }

  if (locState === "gps-error") {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 border border-amber-700/40 bg-amber-500/10"
      >
        <WifiOff className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
        <p className="text-amber-800 dark:text-amber-200 text-sm flex-1">GPS unavailable — search a city or retry.</p>
        <button onClick={onRetry} className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!city && !data) return null;

  const nextName = nextIdx >= 0 ? prayers[nextIdx].name : "";

  return (
      <div className="rounded-2xl border border-border overflow-hidden bg-primary/10">
      <div className="px-4 py-3 flex items-center gap-2.5">
        {locState === "gps-active" ? (
          <LocateFixed className="w-4 h-4 text-primary shrink-0" />
        ) : (
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-foreground text-sm font-semibold truncate">
            {city || "—"}
            {country ? <span className="text-muted-foreground font-normal">, {country}</span> : null}
          </p>
          {locState === "gps-active" && (
            <p className="text-muted-foreground text-xs">GPS detected</p>
          )}
        </div>
        {countdown && nextName && (
          <div className="text-right shrink-0">
            <p className="text-muted-foreground text-xs">Next: {nextName}</p>
            <p className="text-primary text-sm font-mono font-bold">{countdown}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Prayer cards ──────────────────────────────────────────────────────────────
function PrayerCards({ data, currentIdx, nextIdx, t, prayers }: {
  data:       PrayerData;
  currentIdx: number;
  nextIdx:    number;
  t: (key: string) => string;
  prayers: PrayerDef[];
}) {
  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      {prayers.map((prayer, idx) => {
        const time      = fmtTime(data.timings[prayer.id]);
        const isCurrent = idx === currentIdx;
        const isNext    = idx === nextIdx && idx !== currentIdx;

        return (
          <div
            key={prayer.id}
            className={`rounded-2xl border transition-all ${isCurrent || isNext ? "border-border bg-primary/10" : "border-border bg-card"}`}
            data-testid={`prayer-row-${prayer.id}`}
          >
            {isCurrent && (
              <div className="h-0.5 w-full rounded-t-2xl bg-primary" />
            )}

            <div className="flex items-center gap-4 px-4 py-4">
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 bg-card"
              >
                {prayer.icon}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-base font-bold ${isCurrent ? "text-foreground" : "text-foreground"}`}>
                    {prayer.name}
                  </p>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-primary-foreground bg-primary">
                      {t("prayer_times_status_now")}
                    </span>
                  )}
                  {isNext && (
                    <span className="text-xs px-2 py-0.5 rounded-full text-muted-foreground bg-muted border border-border">
                      {t("prayer_times_status_next")}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {prayer.nameAr} · {prayer.desc}
                </p>
              </div>

              {/* Time */}
              <p className={`text-xl font-bold font-serif tabular-nums shrink-0 ${
                isCurrent ? "text-primary" : isNext ? "text-primary" : "text-muted-foreground"
              }`}>
                {time}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── States ────────────────────────────────────────────────────────────────────
function DetectingPlaceholder({ prayers }: { prayers: PrayerDef[] }) {
  return (
    <div className="space-y-2">
      {prayers.map((p) => (
        <div key={p.id} className="rounded-2xl border border-border px-4 py-4 flex items-center gap-4 animate-pulse bg-muted">
          <div className="w-11 h-11 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 rounded-full bg-muted w-20" />
          <div className="h-2.5 rounded-full bg-border w-14" />
          </div>
          <div className="h-5 rounded-full bg-muted w-16" />
        </div>
      ))}
    </div>
  );
}

function LoadingCards({ prayers }: { prayers: PrayerDef[] }) {
  return <DetectingPlaceholder prayers={prayers} />;
}

function ErrorCard({ locState, onRetry, t }: { locState: LocState; onRetry?: () => void; t: (key: string) => string }) {
  return (
    <div className="rounded-2xl border border-destructive/40 p-6 text-center space-y-3 bg-destructive/10">
      <WifiOff className="w-10 h-10 text-destructive mx-auto" />
      <p className="text-destructive font-semibold">{t("prayer_times_error_title")}</p>
      <p className="text-destructive/90 text-sm">
        {locState === "manual"
          ? "City not found. Check the spelling or try a different city."
          : "GPS or network error. Try again or search manually."}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="text-primary text-sm flex items-center gap-1.5 mx-auto hover:text-foreground transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

function NoLocationPrompt({ onDetect, onSearch, loading, t }: {
  onDetect: () => void; onSearch: () => void; loading: boolean;
  t: (key: string) => string;
}) {
  return (
    <div
      className="rounded-3xl overflow-hidden border border-border bg-background"
    >
      <div className="h-1 w-full bg-primary" />
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-primary/15">
          <Navigation className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="text-foreground font-bold text-lg">Find Your Prayer Times</p>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
            Allow location access for automatic prayer times, or search your city manually.
          </p>
        </div>
          <button
            onClick={onDetect}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-primary-foreground text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60 bg-primary"
          data-testid="button-detect-location"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
          {loading ? "Detecting…" : "Use My Current Location"}
        </button>
          <button
            onClick={onSearch}
            className="w-full py-3 rounded-2xl font-semibold text-primary text-sm flex items-center justify-center gap-2 border border-border hover:border-border transition-all bg-primary/10"
        >
          <Search className="w-4 h-4" />
          Search City Manually
        </button>
      </div>
    </div>
  );
}
