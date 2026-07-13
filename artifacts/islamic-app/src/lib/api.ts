import { useQuery } from "@tanstack/react-query";
import {
  getOfflineArabic,
  getOfflineUrdu,
  getOfflineTranslit,
  getOfflineSurahList,
  getOfflineTranslationTexts,
} from "./offline-quran";
import { getCalcMethod, calcMethodParam } from "./settings";

/**
 * The Jalandhry Urdu translation (ur.jalandhry) uses "خدا" wherever the
 * Arabic says "اللہ". The Amroti Sindhi translation (sd.amroti) has the same
 * issue — both use Arabic script, so the same replacement applies.
 * Replace every occurrence so the app always displays the correct name.
 * Applied at the data layer so all consumers receive corrected text.
 */
export function sanitizeUrduText(text: string): string {
  return text.replace(/خدا/g, "اللہ");
}

/**
 * The Hindi translation (hi.hindi) sometimes uses "खुदा" instead of "अल्लाह".
 * Replace every occurrence with the correct Islamic name.
 */
export function sanitizeHindiText(text: string): string {
  return text.replace(/खुदा/g, "अल्लाह");
}

/**
 * Central sanitiser — picks the right replacement based on translation language.
 * Safe to call on any language; no-ops for languages that don't need it.
 */
export function sanitizeTranslation(lang: TranslationLanguage, text: string): string {
  if (lang === "urdu" || lang === "sindhi") return sanitizeUrduText(text);
  if (lang === "hindi") return sanitizeHindiText(text);
  return text;
}

export interface Ayah {
  numberInSurah: number;
  number: number;
  text: string;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface AyahData {
  numberInSurah:   number;
  globalNumber:    number;
  textAr:          string;
  textTranslation: string;
  textTranslit:    string;
  audioUrl:        string;
}

export interface SurahDetail {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: AyahData[];
}

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  [key: string]: string;
}

export interface PrayerData {
  timings: PrayerTimings;
  date: {
    readable: string;
    hijri: {
      date: string;
      format: string;
      day: string;
      month: { number: number; en: string; ar: string };
      year: string;
    };
  };
}

// ── Translation language system ───────────────────────────────────────────────

export type TranslationLanguage =
  | "urdu"
  | "english"
  | "sindhi"
  | "hindi"
  | "turkish"
  | "bengali"
  | "indonesian"
  | "french"
  | "spanish"
  | "malay";

export const ALL_LANGUAGES: TranslationLanguage[] = [
  "urdu",
  "english",
  "sindhi",
  "hindi",
  "turkish",
  "bengali",
  "indonesian",
  "french",
  "spanish",
  "malay",
];

/** Native-script display label for each language */
export const TRANSLATION_LABELS: Record<TranslationLanguage, string> = {
  urdu:       "اردو",
  english:    "English",
  sindhi:     "سنڌي",
  hindi:      "हिन्दी",
  turkish:    "Türkçe",
  bengali:    "বাংলা",
  indonesian: "Bahasa",
  french:     "Français",
  spanish:    "Español",
  malay:      "Melayu",
};

/** English name for display in settings */
export const TRANSLATION_ENGLISH_NAMES: Record<TranslationLanguage, string> = {
  urdu:       "Urdu",
  english:    "English",
  sindhi:     "Sindhi",
  hindi:      "Hindi",
  turkish:    "Turkish",
  bengali:    "Bengali",
  indonesian: "Indonesian",
  french:     "French",
  spanish:    "Spanish",
  malay:      "Malay",
};

/** AlQuran Cloud edition identifiers */
export const TRANSLATION_EDITIONS: Record<TranslationLanguage, string> = {
  urdu:       "ur.jalandhry",
  english:    "en.sahih",
  sindhi:     "sd.amroti",
  hindi:      "hi.hindi",
  turkish:    "tr.ates",
  bengali:    "bn.bengali",
  indonesian: "id.indonesian",
  french:     "fr.hamidullah",
  spanish:    "es.asad",
  malay:      "ms.basmeih",
};

/**
 * BCP-47 language tags for Web Speech API TTS.
 * Urdu & English have the best TTS support. Sindhi (sd-PK) has limited
 * device support — the app always shows text regardless.
 */
export const TTS_LANG_CODES: Record<TranslationLanguage, string> = {
  urdu:       "ur-PK",
  english:    "en-US",
  sindhi:     "sd-PK",
  hindi:      "hi-IN",
  turkish:    "tr-TR",
  bengali:    "bn-IN",
  indonesian: "id-ID",
  french:     "fr-FR",
  spanish:    "es-ES",
  malay:      "ms-MY",
};

/** Languages written right-to-left */
export const RTL_LANGUAGES = new Set<TranslationLanguage>(["urdu", "sindhi"]);

export const getAudioUrl = (globalAyahNumber: number) =>
  `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber}.mp3`;

// ── Hooks ─────────────────────────────────────────────────────────────────────

export const useSurahList = () =>
  useQuery({
    queryKey: ["surahs"],
    queryFn: async () => {
      // Try bundled offline data first — always works even without internet
      const offline = await getOfflineSurahList();
      if (offline) return offline as Surah[];
      // Online fallback
      const res  = await fetch("https://api.alquran.cloud/v1/surah");
      const data = await res.json();
      return data.data as Surah[];
    },
    staleTime: Infinity,
  });

/** Safely fetch a URL and parse JSON.
 *  Returns null on any error, non-OK response, or if the request takes > 15 s.
 *  The 15-second timeout prevents Android WebView from hanging indefinitely on
 *  slow or unreachable API endpoints and lets the caller fall back gracefully. */
async function safeFetch(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export const useSurah = (number: number, translation: TranslationLanguage) => {
  const edition = TRANSLATION_EDITIONS[translation];
  return useQuery({
    queryKey: ["surah", number, translation],
    queryFn: async () => {
      // ── Offline-first path ────────────────────────────────────────────────
      // Load bundled Arabic + transliteration (always available offline)
      const [arabicData, translitData] = await Promise.all([
        getOfflineArabic(),
        getOfflineTranslit(),
      ]);

      const offlineSurah    = arabicData?.[String(number)];
      const translitAyahs   = translitData?.[String(number)] ?? [];

      if (offlineSurah) {
        // Get translation: bundled Urdu OR downloaded pack OR API
        let translationTexts: string[];
        const offlineTexts = await getOfflineTranslationTexts(translation, number);
        if (offlineTexts) {
          translationTexts = offlineTexts;
        } else {
          // Try online for non-bundled translation
          const trData = await safeFetch(
            `https://api.alquran.cloud/v1/surah/${number}/${edition}`
          );
          translationTexts =
            (trData as { data?: { ayahs?: { text: string }[] } } | null)
              ?.data?.ayahs?.map((a) => a.text) ?? [];
        }

        const ayahs: AyahData[] = offlineSurah.ayahs.map((ayah, index) => ({
          numberInSurah:   ayah.n,
          globalNumber:    ayah.g,
          textAr:          ayah.t,
          textTranslation: sanitizeTranslation(translation, translationTexts[index] ?? ""),
          textTranslit:    translitAyahs[index] ?? "",
          audioUrl:        getAudioUrl(ayah.g),
        }));

        return {
          number,
          name:                   offlineSurah.name,
          englishName:            offlineSurah.englishName,
          englishNameTranslation: offlineSurah.englishNameTranslation,
          numberOfAyahs:          offlineSurah.ayahs.length,
          revelationType:         offlineSurah.revelationType,
          ayahs,
        } as SurahDetail;
      }

      // ── Full API fallback (bundle unavailable) ────────────────────────────
      const [arData, trData, transitData] = await Promise.all([
        safeFetch(`https://api.alquran.cloud/v1/surah/${number}`),
        safeFetch(`https://api.alquran.cloud/v1/surah/${number}/${edition}`),
        safeFetch(`https://api.alquran.cloud/v1/surah/${number}/en.transliteration`),
      ]);

      // Arabic is required — throw so TanStack Query retries
      const ar = arData as {
        data: {
          number: number;
          name: string;
          englishName: string;
          englishNameTranslation: string;
          numberOfAyahs: number;
          revelationType: string;
          ayahs: Ayah[];
        };
      } | null;
      if (!ar?.data?.ayahs) throw new Error("Arabic surah fetch failed");

      const trAyahs:      { text: string }[] =
        (trData     as { data?: { ayahs?: { text: string }[] } } | null)?.data?.ayahs ?? [];
      const transitAyahs: { text: string }[] =
        (transitData as { data?: { ayahs?: { text: string }[] } } | null)?.data?.ayahs ?? [];

      const ayahs: AyahData[] = ar.data.ayahs.map((ayah, index) => ({
        numberInSurah:   ayah.numberInSurah,
        globalNumber:    ayah.number,
        textAr:          ayah.text,
        textTranslation: sanitizeTranslation(translation, trAyahs[index]?.text ?? ""),
        textTranslit:    transitAyahs[index]?.text ?? "",
        audioUrl:        getAudioUrl(ayah.number),
      }));

      return {
        number:                 ar.data.number,
        name:                   ar.data.name,
        englishName:            ar.data.englishName,
        englishNameTranslation: ar.data.englishNameTranslation,
        numberOfAyahs:          ar.data.numberOfAyahs,
        revelationType:         ar.data.revelationType,
        ayahs,
      } as SurahDetail;
    },
    enabled: !!number,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const usePrayerTimes = (city: string, country: string, enabled = true) => {
  const method = getCalcMethod(); // "auto" → Aladhan picks the regional authority
  return useQuery({
    queryKey: ["prayerTimes", city, country, method],
    queryFn: async () => {
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}${calcMethodParam()}`
      );
      if (!res.ok) throw new Error("City not found");
      const data = await res.json();
      if (data.code !== 200) throw new Error(data.data ?? "City not found");
      return data.data as PrayerData;
    },
    enabled: enabled && !!city && !!country,
    retry: 1,
  });
};

/** Fetch prayer times by GPS coordinates using Aladhan's coordinates endpoint. */
export const usePrayerTimesByCoords = (lat: number | null, lng: number | null, enabled = true) => {
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;
  const method = getCalcMethod(); // "auto" → Aladhan picks the regional authority
  return useQuery({
    queryKey: ["prayerTimesByCoords", lat, lng, dateStr, method],
    queryFn: async () => {
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}${calcMethodParam()}`
      );
      if (!res.ok) throw new Error("Prayer times fetch failed");
      const data = await res.json();
      if (data.code !== 200) throw new Error(data.data ?? "Fetch failed");
      return data.data as PrayerData;
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Reverse geocode GPS coordinates → { city, country } using free Nominatim API.
 * Returns null on failure.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; country: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      { headers: { "User-Agent": "NoorQuranApp/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state_district ||
      addr.state ||
      "";
    const country = addr.country || "";
    if (!city && !country) return null;
    return { city, country };
  } catch {
    return null;
  }
}

// ── Hijri calendar data via Aladhan ──────────────────────────────────────────

export interface HijriCalendarDay {
  gDay:   number; // 1-based Gregorian day of the month
  hDay:   number; // 1-based Hijri day
  hMonth: number; // 1–12
  hYear:  number;
}

/**
 * Fetch the full Gregorian-month → Hijri mapping from Aladhan's calendar API.
 * One call per (gMonth, gYear) pair, cached forever (Hijri dates never change).
 * gMonth is 1-based (Jan = 1).
 */
export const useHijriMonthCalendar = (gMonth: number, gYear: number) =>
  useQuery({
    queryKey: ["hijriCalendar", gMonth, gYear],
    queryFn: async () => {
      const res = await fetch(
        `https://api.aladhan.com/v1/gToHCalendar/${gMonth}/${gYear}`
      );
      if (!res.ok) throw new Error("Hijri calendar fetch failed");
      const data = await res.json();
      if (data.code !== 200) throw new Error("Hijri calendar API error");
      return (
        data.data as Array<{
          gregorian: { day: string };
          hijri: { day: string; month: { number: number }; year: string };
        }>
      ).map(
        (item): HijriCalendarDay => ({
          gDay:   parseInt(item.gregorian.day, 10),
          hDay:   parseInt(item.hijri.day, 10),
          hMonth: item.hijri.month.number,
          hYear:  parseInt(item.hijri.year, 10),
        })
      );
    },
    staleTime: Infinity, // Hijri dates are immutable
    retry: 2,
  });

export const useRandomAyah = () =>
  useQuery({
    queryKey: ["randomAyah"],
    queryFn: async () => {
      // ── Offline-first: use bundled Arabic + Urdu data ─────────────────────
      const [arabicData, urduData] = await Promise.all([
        getOfflineArabic(),
        getOfflineUrdu(),
      ]);

      if (arabicData && urduData) {
        const randomSurahNum  = Math.floor(Math.random() * 114) + 1;
        const surah           = arabicData[String(randomSurahNum)];
        const urSurah         = urduData[String(randomSurahNum)];
        const randomAyahIdx   = Math.floor(Math.random() * surah.ayahs.length);
        const ayah            = surah.ayahs[randomAyahIdx];

        return {
          surah:         surah.englishName,
          surahNumber:   randomSurahNum,
          numberInSurah: ayah.n,
          globalNumber:  ayah.g,
          textAr:        ayah.t,
          textUr:        sanitizeUrduText(urSurah?.[randomAyahIdx] ?? ""),
          audioUrl:      getAudioUrl(ayah.g),
        };
      }

      // ── API fallback ───────────────────────────────────────────────────────
      const randomSurah   = Math.floor(Math.random() * 114) + 1;
      const res           = await fetch(`https://api.alquran.cloud/v1/surah/${randomSurah}`);
      const data          = await res.json();
      const numAyahs      = data.data.numberOfAyahs;
      const randomAyahIdx = Math.floor(Math.random() * numAyahs);
      const randomAyah    = data.data.ayahs[randomAyahIdx];

      const [arRes, urRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah.number}`),
        fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah.number}/ur.jalandhry`),
      ]);
      const arData = await arRes.json();
      const urData = await urRes.json();

      return {
        surah:         data.data.englishName,
        surahNumber:   randomSurah,
        numberInSurah: arData.data.numberInSurah as number,
        globalNumber:  randomAyah.number,
        textAr:        arData.data.text,
        textUr:        sanitizeUrduText(urData.data.text),
        audioUrl:      getAudioUrl(randomAyah.number),
      };
    },
    staleTime: Infinity,
  });
