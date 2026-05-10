import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, Search, LocateFixed, Loader2, WifiOff,
  ChevronDown, ChevronUp, Navigation, RefreshCw, X,
} from "lucide-react";
import {
  usePrayerTimes,
  usePrayerTimesByCoords,
  reverseGeocode,
  type PrayerData,
} from "@/lib/api";
import {
  getCity, getCountry, setCity as saveCity,
  getGpsCoords, saveGpsCoords, clearGpsCoords,
  getLocationSource, hasSavedLocation,
  CITY_COUNTRY_MAP, PRESET_CITIES,
} from "@/lib/settings";

// ── Prayer definitions ────────────────────────────────────────────────────────
const PRAYERS = [
  { id: "Fajr",    name: "Fajr",    nameAr: "الفجر",   icon: "🌅", desc: "Dawn"       },
  { id: "Sunrise", name: "Sunrise", nameAr: "الشروق",  icon: "☀️", desc: "Sunrise"    },
  { id: "Dhuhr",   name: "Dhuhr",   nameAr: "الظهر",   icon: "🌤️", desc: "Midday"    },
  { id: "Asr",     name: "Asr",     nameAr: "العصر",   icon: "⛅", desc: "Afternoon"  },
  { id: "Maghrib", name: "Maghrib", nameAr: "المغرب",  icon: "🌇", desc: "Sunset"     },
  { id: "Isha",    name: "Isha",    nameAr: "العشاء",  icon: "🌙", desc: "Night"      },
];

// ── Location state machine ────────────────────────────────────────────────────
type LocState =
  | "detecting"   // auto-detecting GPS on mount
  | "gps-active"  // GPS granted and coords are valid
  | "gps-denied"  // GPS permission denied by user
  | "gps-error"   // GPS timed out / failed
  | "manual"      // user manually searched a city
  | "no-location"; // nothing saved, prompt needed

// ── Countdown to next prayer ──────────────────────────────────────────────────
function useCountdown(data: PrayerData | undefined) {
  const [label, setLabel] = useState("");
  const [nextIdx, setNextIdx] = useState(-1);

  useEffect(() => {
    if (!data) { setLabel(""); setNextIdx(-1); return; }

    const tick = () => {
      const now     = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      let found = -1;
      for (let i = 0; i < PRAYERS.length; i++) {
        const raw = data.timings[PRAYERS[i].id];
        if (!raw) continue;
        const clean = raw.replace(/ \(.*\)/, "");
        const [h, m] = clean.split(":").map(Number);
        if (nowMins < h * 60 + m) { found = i; break; }
      }
      if (found === -1) found = 0; // wrap to Fajr next day
      setNextIdx(found);

      const raw   = data.timings[PRAYERS[found].id];
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
function getCurrentPrayerIdx(data: PrayerData | undefined) {
  if (!data) return -1;
  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let cur = -1;
  for (let i = PRAYERS.length - 1; i >= 0; i--) {
    const raw = data.timings[PRAYERS[i].id];
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

  // ── GPS detection ───────────────────────────────────────────────────────────
  const detectGPS = useCallback(() => {
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

  // ── Auto-detect on first visit ──────────────────────────────────────────────
  useEffect(() => {
    if (locState === "no-location") {
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

  // ── Current / next prayer ───────────────────────────────────────────────────
  const { countdown, nextPrayerIdx } = useCountdown(activeData);
  const currentIdx = getCurrentPrayerIdx(activeData);

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

  const handlePreset = (city: string) => {
    const country = CITY_COUNTRY_MAP[city] ?? "";
    setManualCity(city);
    setManualCountry(country);
    saveCity(city, country);
    clearGpsCoords();
    setLocState("manual");
    setSearchOpen(false);
    setSearchInput("");
    setSearchError("");
  };

  const handleUseLocation = () => {
    setSearchOpen(false);
    detectGPS();
  };

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 55%, #061610 100%)" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Prayer Times</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Salah times for your location</p>
        </div>
        {/* GPS / Search toggle */}
        <div className="flex gap-2 mt-1">
          {locState !== "detecting" && (
            <button
              onClick={handleUseLocation}
              disabled={gpsLoading}
              title="Use my GPS location"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-500 hover:text-emerald-300 border border-emerald-800/40 hover:border-emerald-600 transition-all active:scale-90"
              style={{ background: "rgba(52,211,153,0.07)" }}
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
                ? "text-white border-emerald-600 bg-emerald-800/40"
                : "text-emerald-500 hover:text-emerald-300 border-emerald-800/40 hover:border-emerald-600"
            }`}
            style={searchOpen ? {} : { background: "rgba(52,211,153,0.07)" }}
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
            className="rounded-2xl border border-emerald-800/40 overflow-hidden animate-in slide-in-from-top-2 duration-200"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            {/* Use My Location CTA */}
            <button
              onClick={handleUseLocation}
              disabled={gpsLoading}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-emerald-900/30 text-left hover:bg-emerald-900/20 transition-colors active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(52,211,153,0.15)" }}>
                {gpsLoading
                  ? <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  : <LocateFixed className="w-4 h-4 text-emerald-400" />}
              </div>
              <div>
                <p className="text-emerald-300 text-sm font-semibold">Use Current Location</p>
                <p className="text-emerald-700 text-xs">Detect via GPS automatically</p>
              </div>
            </button>

            {/* City search form */}
            <form onSubmit={handleSearch} className="p-3 flex gap-2" data-testid="form-search-location">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
                <input
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setSearchError(""); }}
                  placeholder="City, Country  (e.g. London, UK)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-emerald-900/30 border border-emerald-800/40 text-emerald-200 placeholder-emerald-800 focus:outline-none focus:border-emerald-600 transition-colors"
                  data-testid="input-location"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#1a5c38,#16a34a)" }}
                data-testid="button-search-location"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {searchError && (
              <p className="px-4 pb-2 text-red-400 text-xs">{searchError}</p>
            )}

            {/* Preset cities */}
            <div className="px-3 pb-3 flex flex-wrap gap-2">
              {PRESET_CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => handlePreset(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    displayCity === c
                      ? "bg-emerald-700/40 border-emerald-600 text-emerald-200"
                      : "border-emerald-900/40 text-emerald-700 hover:border-emerald-700 hover:text-emerald-400"
                  }`}
                  data-testid={`preset-city-${c.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Status / location strip ───────────────────────────────────── */}
        <LocationStrip
          locState={locState}
          city={displayCity}
          country={displayCountry}
          gpsLoading={gpsLoading}
          data={activeData}
          onRetry={handleUseLocation}
          nextIdx={nextPrayerIdx}
          countdown={countdown}
        />

        {/* ── Prayer time cards ─────────────────────────────────────────── */}
        {locState === "detecting" && !activeData ? (
          <DetectingPlaceholder />
        ) : activeError && !activeData ? (
          <ErrorCard locState={locState} onRetry={locState === "manual" ? undefined : handleUseLocation} />
        ) : activeLoading && !activeData ? (
          <LoadingCards />
        ) : activeData ? (
          <PrayerCards data={activeData} currentIdx={currentIdx} nextIdx={nextPrayerIdx} />
        ) : (
          <NoLocationPrompt onDetect={handleUseLocation} onSearch={() => setSearchOpen(true)} loading={gpsLoading} />
        )}

        {/* Hijri date footer (when data available) */}
        {activeData && (
          <div className="text-center py-2">
            <p className="text-emerald-700 text-xs">
              {activeData.date.hijri.day} {activeData.date.hijri.month.en} {activeData.date.hijri.year} AH
              {" · "}
              {activeData.date.readable}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Location strip ────────────────────────────────────────────────────────────
function LocationStrip({ locState, city, country, gpsLoading, data, onRetry, nextIdx, countdown }: {
  locState:   LocState;
  city:       string;
  country:    string;
  gpsLoading: boolean;
  data?:      PrayerData;
  onRetry:    () => void;
  nextIdx:    number;
  countdown:  string;
}) {
  if (locState === "detecting" || gpsLoading) {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 border border-emerald-800/30 animate-pulse"
        style={{ background: "rgba(52,211,153,0.06)" }}
      >
        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
        <p className="text-emerald-600 text-sm">Detecting your location…</p>
      </div>
    );
  }

  if (locState === "gps-denied") {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 border border-amber-900/40"
        style={{ background: "rgba(217,119,6,0.07)" }}
      >
        <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
        <p className="text-amber-500 text-sm flex-1">Location access denied — search a city below.</p>
      </div>
    );
  }

  if (locState === "gps-error") {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 border border-amber-900/40"
        style={{ background: "rgba(217,119,6,0.07)" }}
      >
        <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
        <p className="text-amber-500 text-sm flex-1">GPS unavailable — search a city or retry.</p>
        <button onClick={onRetry} className="text-amber-400 hover:text-amber-200 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!city && !data) return null;

  const nextName = nextIdx >= 0 ? PRAYERS[nextIdx].name : "";

  return (
    <div
      className="rounded-2xl border border-emerald-800/30 overflow-hidden"
      style={{ background: "rgba(26,92,56,0.25)" }}
    >
      <div className="px-4 py-3 flex items-center gap-2.5">
        {locState === "gps-active" ? (
          <LocateFixed className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-emerald-200 text-sm font-semibold truncate">
            {city || "—"}
            {country ? <span className="text-emerald-600 font-normal">, {country}</span> : null}
          </p>
          {locState === "gps-active" && (
            <p className="text-emerald-700 text-xs">GPS detected</p>
          )}
        </div>
        {countdown && nextName && (
          <div className="text-right shrink-0">
            <p className="text-emerald-800 text-xs">Next: {nextName}</p>
            <p className="text-emerald-400 text-sm font-mono font-bold">{countdown}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Prayer cards ──────────────────────────────────────────────────────────────
function PrayerCards({ data, currentIdx, nextIdx }: {
  data:       PrayerData;
  currentIdx: number;
  nextIdx:    number;
}) {
  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      {PRAYERS.map((prayer, idx) => {
        const time      = fmtTime(data.timings[prayer.id]);
        const isCurrent = idx === currentIdx;
        const isNext    = idx === nextIdx && idx !== currentIdx;

        return (
          <div
            key={prayer.id}
            className={`rounded-2xl border transition-all ${
              isCurrent
                ? "border-emerald-500/50"
                : isNext
                ? "border-emerald-800/60"
                : "border-emerald-900/30"
            }`}
            style={{
              background: isCurrent
                ? "linear-gradient(135deg, rgba(26,92,56,0.55) 0%, rgba(16,62,36,0.5) 100%)"
                : isNext
                ? "rgba(52,211,153,0.07)"
                : "rgba(255,255,255,0.025)",
            }}
            data-testid={`prayer-row-${prayer.id}`}
          >
            {isCurrent && (
              <div className="h-0.5 w-full rounded-t-2xl"
                style={{ background: "linear-gradient(90deg, #1a5c38, #34d399, #059669)" }} />
            )}

            <div className="flex items-center gap-4 px-4 py-4">
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: isCurrent ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.04)" }}
              >
                {prayer.icon}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-base font-bold ${isCurrent ? "text-white" : "text-emerald-200"}`}>
                    {prayer.name}
                  </p>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-emerald-300"
                      style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.3)" }}>
                      Now
                    </span>
                  )}
                  {isNext && (
                    <span className="text-xs px-2 py-0.5 rounded-full text-emerald-600"
                      style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
                      Next
                    </span>
                  )}
                </div>
                <p className="text-emerald-700 text-xs mt-0.5">
                  {prayer.nameAr} · {prayer.desc}
                </p>
              </div>

              {/* Time */}
              <p className={`text-xl font-bold font-serif tabular-nums shrink-0 ${
                isCurrent ? "text-emerald-300" : isNext ? "text-emerald-400" : "text-emerald-600"
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
function DetectingPlaceholder() {
  return (
    <div className="space-y-2">
      {PRAYERS.map((p) => (
        <div key={p.id} className="rounded-2xl border border-emerald-900/20 px-4 py-4 flex items-center gap-4 animate-pulse"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="w-11 h-11 rounded-xl bg-emerald-900/30" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 rounded-full bg-emerald-900/30 w-20" />
            <div className="h-2.5 rounded-full bg-emerald-900/20 w-14" />
          </div>
          <div className="h-5 rounded-full bg-emerald-900/30 w-16" />
        </div>
      ))}
    </div>
  );
}

function LoadingCards() {
  return <DetectingPlaceholder />;
}

function ErrorCard({ locState, onRetry }: { locState: LocState; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-900/40 p-6 text-center space-y-3"
      style={{ background: "rgba(239,68,68,0.06)" }}>
      <WifiOff className="w-10 h-10 text-red-700 mx-auto" />
      <p className="text-red-300 font-semibold">Could not load prayer times</p>
      <p className="text-red-700 text-sm">
        {locState === "manual"
          ? "City not found. Check the spelling or try a different city."
          : "GPS or network error. Try again or search manually."}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="text-emerald-400 text-sm flex items-center gap-1.5 mx-auto hover:text-emerald-200 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

function NoLocationPrompt({ onDetect, onSearch, loading }: {
  onDetect: () => void; onSearch: () => void; loading: boolean;
}) {
  return (
    <div
      className="rounded-3xl overflow-hidden border border-emerald-700/30"
      style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.4) 0%, rgba(10,40,20,0.5) 100%)" }}
    >
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#1a5c38,#34d399,#1a5c38)" }} />
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "rgba(52,211,153,0.12)" }}>
          <Navigation className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <p className="text-emerald-200 font-bold text-lg">Find Your Prayer Times</p>
          <p className="text-emerald-600 text-sm mt-1 max-w-xs mx-auto">
            Allow location access for automatic prayer times, or search your city manually.
          </p>
        </div>
        <button
          onClick={onDetect}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#1a5c38,#16a34a)", boxShadow: "0 4px 20px rgba(52,211,153,0.2)" }}
          data-testid="button-detect-location"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
          {loading ? "Detecting…" : "Use My Current Location"}
        </button>
        <button
          onClick={onSearch}
          className="w-full py-3 rounded-2xl font-semibold text-emerald-400 text-sm flex items-center justify-center gap-2 border border-emerald-800/40 hover:border-emerald-600 transition-all"
          style={{ background: "rgba(52,211,153,0.06)" }}
        >
          <Search className="w-4 h-4" />
          Search City Manually
        </button>
      </div>
    </div>
  );
}
