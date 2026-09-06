import type { TranslationLanguage } from "@/lib/api";
import { Device } from "@capacitor/device";

// ── Storage keys ──────────────────────────────────────────────────────────────
const CITY_KEY    = "noor-city";
const COUNTRY_KEY = "noor-country";
const LANG_KEY    = "noor-lang";
const TEACHER_LANGUAGE_MODE_KEY = "noor-teacher-language-mode";
const GPS_LAT_KEY = "noor-gps-lat";
const GPS_LNG_KEY = "noor-gps-lng";
const LOC_SRC_KEY = "noor-loc-src"; // "gps" | "manual"
export const TRANSLATION_LANGUAGE_CHANGED_EVENT = "noor-translation-language-changed";
export const TRANSLITERATION_LANGUAGE_CHANGED_EVENT = "noor-transliteration-language-changed";
export const TEACHER_LANGUAGE_MODE_CHANGED_EVENT = "noor-teacher-language-mode-changed";
export const TEACHER_TRANSLATION_LANGUAGE_CHANGED_EVENT = "noor-teacher-translation-language-changed";

export type TeacherLanguageMode = "selected" | "english";

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

// ── Prayer calculation method ─────────────────────────────────────────────────
// "auto" (default) omits the `method` param so the Aladhan API automatically
// selects the official regional authority for the location (e.g. Umm al-Qura
// for Saudi Arabia, University of Islamic Sciences for Pakistan, Diyanet for
// Turkey, ISNA for North America). A numeric value is a manual user override
// and is always respected.

const CALC_METHOD_KEY = "noor-calc-method";

export interface CalcMethod {
  id:   number;
  name: string;
}

/** Aladhan API calculation methods available for manual override. */
export const CALC_METHODS: CalcMethod[] = [
  { id: 4,  name: "Umm Al-Qura University, Makkah" },
  { id: 1,  name: "University of Islamic Sciences, Karachi" },
  { id: 2,  name: "Islamic Society of North America (ISNA)" },
  { id: 3,  name: "Muslim World League" },
  { id: 5,  name: "Egyptian General Authority of Survey" },
  { id: 7,  name: "Institute of Geophysics, University of Tehran" },
  { id: 8,  name: "Gulf Region" },
  { id: 9,  name: "Kuwait" },
  { id: 10, name: "Qatar" },
  { id: 11, name: "Majlis Ugama Islam Singapura, Singapore" },
  { id: 12, name: "Union des Organisations Islamiques de France" },
  { id: 13, name: "Diyanet İşleri Başkanlığı, Turkey" },
  { id: 14, name: "Spiritual Administration of Muslims of Russia" },
  { id: 15, name: "Moonsighting Committee Worldwide" },
  { id: 16, name: "Dubai (UAE)" },
  { id: 17, name: "Jabatan Kemajuan Islam Malaysia (JAKIM)" },
  { id: 20, name: "Kementerian Agama, Indonesia" },
];

export type CalcMethodSetting = "auto" | number;

/** Returns the user's calculation-method preference. Default: "auto". */
export function getCalcMethod(): CalcMethodSetting {
  const v = localStorage.getItem(CALC_METHOD_KEY);
  if (!v || v === "auto") return "auto";
  const n = parseInt(v, 10);
  return Number.isFinite(n) && CALC_METHODS.some((m) => m.id === n) ? n : "auto";
}

export function setCalcMethod(method: CalcMethodSetting): void {
  localStorage.setItem(CALC_METHOD_KEY, String(method));
}

/**
 * Query-string fragment appended to Aladhan API URLs.
 * Empty string when "auto" — Aladhan then auto-selects the closest regional
 * authority based on the location. `&method=N` when manually overridden.
 */
export function calcMethodParam(): string {
  const m = getCalcMethod();
  return m === "auto" ? "" : `&method=${m}`;
}

// ── Translation language ──────────────────────────────────────────────────────

const VALID_LANGS: TranslationLanguage[] = [
  "arabic", "urdu", "english", "sindhi", "hindi", "turkish",
  "bengali", "indonesian", "french", "spanish", "malay",
  "persian", "german", "portuguese", "russian", "chinese",
  "japanese", "korean", "swahili", "tamil", "telugu", "malayalam",
  "punjabi", "italian", "dutch", "thai", "vietnamese", "azerbaijani",
  "bosnian", "somali", "hausa", "uzbek", "kazakh",
];

const COUNTRY_TO_TRANSLATION: Record<string, TranslationLanguage> = {
  PK: "urdu",
  IN: "hindi",
  BD: "bengali",
  ID: "indonesian",
  MY: "malay",
  TR: "turkish",
  IR: "persian",
  AF: "persian",
  SA: "arabic",
  AE: "arabic",
  QA: "arabic",
  KW: "arabic",
  BH: "arabic",
  OM: "arabic",
  YE: "arabic",
  JO: "arabic",
  IQ: "arabic",
  SY: "arabic",
  LB: "arabic",
  PS: "arabic",
  EG: "arabic",
  SD: "arabic",
  LY: "arabic",
  TN: "arabic",
  DZ: "arabic",
  MA: "arabic",
  MR: "arabic",
  FR: "french",
  DE: "german",
  ES: "spanish",
  RU: "russian",
  CN: "chinese",
  TW: "chinese",
  HK: "chinese",
  JP: "japanese",
  KR: "korean",
  IT: "italian",
  PT: "portuguese",
  BR: "portuguese",
  MZ: "portuguese",
  AO: "portuguese",
  US: "english",
  GB: "english",
  IE: "english",
  CA: "english",
  AU: "english",
  NZ: "english",
  NL: "dutch",
  TH: "thai",
  VN: "vietnamese",
  AZ: "azerbaijani",
  BA: "bosnian",
  SO: "somali",
  KE: "swahili",
  TZ: "swahili",
  UG: "swahili",
  NG: "hausa",
  UZ: "uzbek",
  KZ: "kazakh",
};

const LANGUAGE_TO_TRANSLATION: Record<string, TranslationLanguage> = {
  ar: "arabic",
  ur: "urdu",
  en: "english",
  hi: "hindi",
  bn: "bengali",
  id: "indonesian",
  ms: "malay",
  tr: "turkish",
  fa: "persian",
  de: "german",
  fr: "french",
  es: "spanish",
  ru: "russian",
  zh: "chinese",
  ja: "japanese",
  ko: "korean",
  it: "italian",
  pt: "portuguese",
  nl: "dutch",
  th: "thai",
  vi: "vietnamese",
  az: "azerbaijani",
  bs: "bosnian",
  so: "somali",
  sw: "swahili",
  ha: "hausa",
  uz: "uzbek",
  kk: "kazakh",
  ta: "tamil",
  te: "telugu",
  ml: "malayalam",
  pa: "punjabi",
};

function localeRegion(locale: string): string | null {
  try {
    const region = new Intl.Locale(locale).region;
    if (region) return region.toUpperCase();
  } catch {
    // Fall through for older WebViews without Intl.Locale.
  }
  return locale.match(/[-_]([A-Z]{2}|\d{3})$/i)?.[1]?.toUpperCase() ?? null;
}

function deviceLocales(): string[] {
  if (typeof navigator === "undefined") return [];
  const locales = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter((locale): locale is string => Boolean(locale));
  try {
    locales.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // Locale is optional; navigator.language is enough when unavailable.
  }
  return [...new Set(locales)];
}

function isValidTranslationLanguage(value: string | null): value is TranslationLanguage {
  return Boolean(value && (VALID_LANGS as string[]).includes(value));
}

function timezoneTranslation(): TranslationLanguage | null {
  if (typeof Intl === "undefined") return null;
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (/Karachi|Lahore|Islamabad/i.test(timezone)) return "urdu";
    if (/Kolkata|Calcutta|Delhi/i.test(timezone)) return "hindi";
    if (/Dhaka/i.test(timezone)) return "bengali";
    if (/Jakarta|Makassar|Jayapura/i.test(timezone)) return "indonesian";
    if (/Istanbul/i.test(timezone)) return "turkish";
    if (/Tehran/i.test(timezone)) return "persian";
    if (/Riyadh|Dubai|Doha|Kuwait|Bahrain|Muscat|Amman|Baghdad|Cairo/i.test(timezone)) return "arabic";
    if (/Paris/i.test(timezone)) return "french";
    if (/Berlin/i.test(timezone)) return "german";
    if (/Madrid/i.test(timezone)) return "spanish";
    if (/Moscow/i.test(timezone)) return "russian";
    if (/Shanghai|Beijing|Chongqing|Hong_Kong|Taipei/i.test(timezone)) return "chinese";
    if (/Tokyo/i.test(timezone)) return "japanese";
    if (/Seoul/i.test(timezone)) return "korean";
    if (/Rome/i.test(timezone)) return "italian";
    if (/Lisbon|Sao_Paulo/i.test(timezone)) return "portuguese";
    if (/Amsterdam/i.test(timezone)) return "dutch";
    if (/Bangkok/i.test(timezone)) return "thai";
    if (/Ho_Chi_Minh|Hanoi/i.test(timezone)) return "vietnamese";
  } catch {
    // Timezone is only a fallback signal.
  }
  return null;
}

/** Resolve a supported translation from locale tags using the existing country mapping. */
export function detectTranslationLanguageFromLocales(locales: readonly string[]): TranslationLanguage {
  for (const locale of locales) {
    const region = localeRegion(locale);
    if (region && COUNTRY_TO_TRANSLATION[region]) {
      return COUNTRY_TO_TRANSLATION[region];
    }
  }

  for (const locale of locales) {
    const language = locale.split(/[-_]/)[0].toLowerCase();
    if (LANGUAGE_TO_TRANSLATION[language]) {
      return LANGUAGE_TO_TRANSLATION[language];
    }
  }

  return timezoneTranslation() ?? "urdu";
}

/** Detect a supported translation without requesting location permission. */
export function detectInitialTranslationLanguage(): TranslationLanguage {
  return detectTranslationLanguageFromLocales(deviceLocales());
}

async function nativeDeviceLanguageTag(): Promise<string | null> {
  try {
    const result = await Promise.race([
      Device.getLanguageTag().catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
    ]);
    return result?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Android's WebView locale can differ from the native device locale. Prefer the
 * native BCP-47 tag, then retain the existing browser locale/timezone fallbacks.
 */
export async function detectInitialTranslationLanguageAsync(): Promise<TranslationLanguage> {
  const nativeLocale = await nativeDeviceLanguageTag();
  const locales = nativeLocale
    ? [nativeLocale, ...deviceLocales()]
    : deviceLocales();
  return detectTranslationLanguageFromLocales(locales);
}

export function getLang(): TranslationLanguage {
  const v = localStorage.getItem(LANG_KEY) as TranslationLanguage | null;
  if (isValidTranslationLanguage(v)) return v;
  return "urdu";
}

export function setLang(lang: TranslationLanguage): void {
  localStorage.setItem(LANG_KEY, lang);
  window.dispatchEvent(new Event(TRANSLATION_LANGUAGE_CHANGED_EVENT));
}

const TRANSLITERATION_LANG_KEY = "noor-transliteration-language";

export function getTransliterationLanguage(): TranslationLanguage {
  const value = localStorage.getItem(TRANSLITERATION_LANG_KEY) as TranslationLanguage | null;
  return value && VALID_LANGS.includes(value) ? value : "english";
}

export function setTransliterationLanguage(language: TranslationLanguage): void {
  localStorage.setItem(TRANSLITERATION_LANG_KEY, language);
  window.dispatchEvent(new Event(TRANSLITERATION_LANGUAGE_CHANGED_EVENT));
}

export function getTeacherLanguageMode(): TeacherLanguageMode {
  return localStorage.getItem(TEACHER_LANGUAGE_MODE_KEY) === "english"
    ? "english"
    : "selected";
}

export function setTeacherLanguageMode(mode: TeacherLanguageMode): void {
  localStorage.setItem(TEACHER_LANGUAGE_MODE_KEY, mode);
  window.dispatchEvent(new Event(TEACHER_LANGUAGE_MODE_CHANGED_EVENT));
}

/**
 * AI Teacher's translation language is intentionally independent from the
 * Quran reader/settings language. New Teacher sessions default to English.
 */
export function getTeacherTranslationLanguage(): TranslationLanguage {
  const value = localStorage.getItem("noor-teacher-translation-language") as TranslationLanguage | null;
  return value && VALID_LANGS.includes(value) ? value : "english";
}

export function setTeacherTranslationLanguage(language: TranslationLanguage): void {
  localStorage.setItem("noor-teacher-translation-language", language);
  window.dispatchEvent(new Event(TEACHER_TRANSLATION_LANGUAGE_CHANGED_EVENT));
}

// ── UI Language (app interface language) ──────────────────────────────────────
// Separate from the Quran translation language above.
// Managed by src/lib/i18n-context.tsx — stored under "noor-ui-lang".
// Default: "english".  This file only provides the storage key constant.
export const UI_LANG_KEY = "noor-ui-lang";

// ── One-time defaults initialiser ─────────────────────────────────────────────
// Called once on app start to guarantee clean first-launch state.
const INIT_KEY = "noor-defaults-v1";

export async function initDefaults(): Promise<void> {
  // A saved language is the user's choice. Never auto-detect over it.
  const savedLanguage = localStorage.getItem(LANG_KEY);
  if (!isValidTranslationLanguage(savedLanguage)) {
    const detectedLanguage = await detectInitialTranslationLanguageAsync();
    // Re-check after the async native lookup so a manual selection always wins.
    const currentLanguage = localStorage.getItem(LANG_KEY);
    if (!isValidTranslationLanguage(currentLanguage)) {
      setLang(detectedLanguage);
    }
  }

  if (localStorage.getItem(INIT_KEY)) return; // other defaults already initialized

  // Guarantee English is default UI language on first launch
  if (!localStorage.getItem(UI_LANG_KEY)) {
    localStorage.setItem(UI_LANG_KEY, "english");
  }
  localStorage.setItem(INIT_KEY, "1");
}
