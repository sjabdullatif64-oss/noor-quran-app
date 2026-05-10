import type { TranslationLanguage } from "@/lib/api";

// ── Storage keys ──────────────────────────────────────────────────────────────
const CITY_KEY    = "noor-city";
const COUNTRY_KEY = "noor-country";
const LANG_KEY    = "noor-lang";
const GPS_LAT_KEY = "noor-gps-lat";
const GPS_LNG_KEY = "noor-gps-lng";
const LOC_SRC_KEY = "noor-loc-src"; // "gps" | "manual"

// ── City / country (manual search) ───────────────────────────────────────────

/** Returns saved city name, or "" if nothing saved yet (no hardcoded default). */
export function getCity(): string {
  return localStorage.getItem(CITY_KEY) ?? "";
}

/** Returns saved country, or "" if nothing saved yet. */
export function getCountry(): string {
  return localStorage.getItem(COUNTRY_KEY) ?? "";
}

/**
 * Save a manually-searched city+country pair.
 * Always call with both city AND country so we don't store mismatched data.
 */
export function setCity(city: string, country = ""): void {
  localStorage.setItem(CITY_KEY, city);
  localStorage.setItem(COUNTRY_KEY, country || (CITY_COUNTRY_MAP[city] ?? ""));
  localStorage.setItem(LOC_SRC_KEY, "manual");
}

// ── GPS coordinates ───────────────────────────────────────────────────────────

export interface GpsCoords {
  lat: number;
  lng: number;
}

export function getGpsCoords(): GpsCoords | null {
  const lat = localStorage.getItem(GPS_LAT_KEY);
  const lng = localStorage.getItem(GPS_LNG_KEY);
  if (!lat || !lng) return null;
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  if (isNaN(latN) || isNaN(lngN)) return null;
  return { lat: latN, lng: lngN };
}

export function saveGpsCoords(lat: number, lng: number, city = "", country = ""): void {
  localStorage.setItem(GPS_LAT_KEY, String(lat));
  localStorage.setItem(GPS_LNG_KEY, String(lng));
  localStorage.setItem(LOC_SRC_KEY, "gps");
  if (city)    localStorage.setItem(CITY_KEY,    city);
  if (country) localStorage.setItem(COUNTRY_KEY, country);
}

export function clearGpsCoords(): void {
  localStorage.removeItem(GPS_LAT_KEY);
  localStorage.removeItem(GPS_LNG_KEY);
}

// ── Location source / state ───────────────────────────────────────────────────

export type LocationSource = "gps" | "manual" | "none";

export function getLocationSource(): LocationSource {
  const v = localStorage.getItem(LOC_SRC_KEY) as LocationSource | null;
  if (v === "gps" || v === "manual") return v;
  // Legacy: if city was saved without source key, treat as manual
  if (localStorage.getItem(CITY_KEY)) return "manual";
  return "none";
}

/** True if any location is saved (either GPS or manual). */
export function hasSavedLocation(): boolean {
  return getLocationSource() !== "none";
}

// ── Preset cities (global selection, no hardcoded Saudi default) ──────────────
export const CITY_COUNTRY_MAP: Record<string, string> = {
  Makkah:     "Saudi Arabia",
  Madinah:    "Saudi Arabia",
  Karachi:    "Pakistan",
  Lahore:     "Pakistan",
  Islamabad:  "Pakistan",
  Dubai:      "UAE",
  Istanbul:   "Turkey",
  Cairo:      "Egypt",
  London:     "UK",
  "New York": "US",
  Jakarta:    "Indonesia",
  Dhaka:      "Bangladesh",
  "Kuala Lumpur": "Malaysia",
  Tehran:     "Iran",
};

export const PRESET_CITIES = Object.keys(CITY_COUNTRY_MAP);

// ── Translation language ──────────────────────────────────────────────────────

const VALID_LANGS: TranslationLanguage[] = [
  "urdu", "english", "sindhi", "hindi", "turkish",
  "bengali", "indonesian", "french", "spanish", "malay",
];

export function getLang(): TranslationLanguage {
  const v = localStorage.getItem(LANG_KEY) as TranslationLanguage | null;
  if (v && (VALID_LANGS as string[]).includes(v)) return v;
  return "urdu";
}

export function setLang(lang: TranslationLanguage): void {
  localStorage.setItem(LANG_KEY, lang);
}

// ── One-time defaults initialiser ─────────────────────────────────────────────
// Called once on app start to guarantee clean first-launch state.
const INIT_KEY = "noor-defaults-v1";

export function initDefaults(): void {
  if (localStorage.getItem(INIT_KEY)) return; // already initialized
  // Guarantee Urdu is default language on first launch
  if (!localStorage.getItem(LANG_KEY)) {
    localStorage.setItem(LANG_KEY, "urdu");
  }
  localStorage.setItem(INIT_KEY, "1");
}
