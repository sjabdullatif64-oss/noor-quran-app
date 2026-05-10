const CITY_KEY = "noor-city";
const COUNTRY_KEY = "noor-country";
const LANG_KEY = "noor-lang";

export const CITY_COUNTRY_MAP: Record<string, string> = {
  Jeddah: "Saudi Arabia",
  Makkah: "Saudi Arabia",
  Madinah: "Saudi Arabia",
  Karachi: "Pakistan",
  Lahore: "Pakistan",
  Dubai: "UAE",
  London: "UK",
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
  const country = CITY_COUNTRY_MAP[city] ?? "Saudi Arabia";
  localStorage.setItem(COUNTRY_KEY, country);
}

export function getLang(): "urdu" | "english" {
  const v = localStorage.getItem(LANG_KEY);
  return v === "english" ? "english" : "urdu";
}

export function setLang(lang: "urdu" | "english"): void {
  localStorage.setItem(LANG_KEY, lang);
}
