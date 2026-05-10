import type { TranslationLanguage } from "@/lib/api";

const CITY_KEY    = "noor-city";
const COUNTRY_KEY = "noor-country";
const LANG_KEY    = "noor-lang";

export const CITY_COUNTRY_MAP: Record<string, string> = {
  Jeddah:     "Saudi Arabia",
  Makkah:     "Saudi Arabia",
  Madinah:    "Saudi Arabia",
  Karachi:    "Pakistan",
  Lahore:     "Pakistan",
  Dubai:      "UAE",
  London:     "UK",
  "New York": "US",
};

export const PRESET_CITIES = Object.keys(CITY_COUNTRY_MAP);

export function getCity(): string {
  return localStorage.getItem(CITY_KEY) ?? "Jeddah";
}

export function getCountry(): string {
  const saved = localStorage.getItem(COUNTRY_KEY);
  if (saved) return saved;
  return CITY_COUNTRY_MAP[getCity()] ?? "Saudi Arabia";
}

export function setCity(city: string): void {
  localStorage.setItem(CITY_KEY, city);
  localStorage.setItem(COUNTRY_KEY, CITY_COUNTRY_MAP[city] ?? "Saudi Arabia");
}

const VALID_LANGS: TranslationLanguage[] = [
  "urdu", "english", "hindi", "turkish",
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
