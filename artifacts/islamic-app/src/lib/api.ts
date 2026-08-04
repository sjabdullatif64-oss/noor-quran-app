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
 * The Urdu and Sindhi translations can use localized Arabic-script variants
 * for the name of Allah. Normalize those explicit name variants to the
 * canonical Latin spelling used by the app.
 * Applied at the data layer so all consumers receive corrected text.
 */
export function sanitizeUrduText(text: string): string {
  return text.replace(/خدا|اللہ|الله/g, "Allah");
}

/**
 * Hindi translations can use localized variants for Allah's name.
 */
export function sanitizeHindiText(text: string): string {
  return text.replace(/खुदा|अल्लाह|अल्ला/g, "Allah");
}

/**
 * Central sanitiser — picks the right replacement based on translation language.
 * Safe to call on any language; no-ops for languages that don't need it.
 */
export function sanitizeTranslation(lang: TranslationLanguage, text: string): string {
  if (lang === "urdu" || lang === "sindhi") return sanitizeUrduText(text);
  if (lang === "hindi") return sanitizeHindiText(text);
  if (lang === "persian") return text.replace(/خداوند|خداى|خدا/g, "Allah");
  if (lang === "german") return text.replace(/\bGott(?:es|e)?\b/gi, "Allah");
  if (lang === "portuguese") return text.replace(/\bDeus\b/gi, "Allah");
  if (lang === "french") return text.replace(/\bDieu\b/gi, "Allah");
  if (lang === "spanish") return text.replace(/\bDios\b|\bSeñor\b/gi, "Allah");
  if (lang === "italian") return text.replace(/\bDio\b/gi, "Allah");
  if (lang === "dutch") return text.replace(/\bGod\b|\bHeer\b/gi, "Allah");
  if (lang === "russian") return text.replace(/Алла(?:ха|хом|ху)?|Бог(?:а|ом)?/g, "Allah");
  if (lang === "chinese") return text.replace(/真主|上帝/g, "Allah");
  if (lang === "japanese") return text.replace(/アッラー|神/g, "Allah");
  if (lang === "korean") return text.replace(/하나님/g, "Allah");
  if (lang === "turkish") return text.replace(/\bTanrı\b/gi, "Allah");
  if (lang === "indonesian" || lang === "malay") {
    return text.replace(/\bTuhan\b/gi, "Allah");
  }
  if (lang === "bengali") return text.replace(/আল্লাহ|খোদা/g, "Allah");
  if (lang === "swahili") return text.replace(/Mwenyezi Mungu/g, "Allah");
  if (lang === "tamil") return text.replace(/அல்லாஹ்|இறைவன்/g, "Allah");
  if (lang === "telugu") return text.replace(/అల్లాహ్|దేవుడు/g, "Allah");
  if (lang === "malayalam") return text.replace(/അല്ലാഹു|ദൈവം/g, "Allah");
  if (lang === "punjabi") return text.replace(/ਅੱਲਾਹ|ਰੱਬ/g, "Allah");
  if (lang === "thai") return text.replace(/อัลลอฮ์|พระเจ้า/g, "Allah");
  if (lang === "bosnian") return text.replace(/\bAllaha\b|\bBog(?:a|om)?\b/g, "Allah");
  if (lang === "somali") return text.replace(/\bEebe\b|\bIlaah\b/gi, "Allah");
  if (lang === "uzbek") return text.replace(/Аллоҳ|Аллах/g, "Allah");
  if (lang === "kazakh") return text.replace(/Алла(?:ның|ға|мен|дан|да)?/g, "Allah");
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
  | "arabic"
  | "urdu"
  | "english"
  | "sindhi"
  | "hindi"
  | "turkish"
  | "bengali"
  | "indonesian"
  | "french"
  | "spanish"
  | "malay"
  | "persian"
  | "german"
  | "portuguese"
  | "russian"
  | "chinese"
  | "japanese"
  | "korean"
  | "swahili"
  | "tamil"
  | "telugu"
  | "malayalam"
  | "punjabi"
  | "italian"
  | "dutch"
  | "thai"
  | "vietnamese"
  | "azerbaijani"
  | "bosnian"
  | "somali"
  | "hausa"
  | "uzbek"
  | "kazakh";

/** Original languages, kept in their existing order in the main selectors. */
export const MAIN_LANGUAGES: TranslationLanguage[] = [
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

/** Additional languages shown in the searchable More Languages picker. */
export const ADDITIONAL_LANGUAGES: TranslationLanguage[] = [
  "arabic",
  "persian",
  "german",
  "portuguese",
  "russian",
  "chinese",
  "japanese",
  "korean",
  "swahili",
  "tamil",
  "telugu",
  "malayalam",
  "punjabi",
  "italian",
  "dutch",
  "thai",
  "vietnamese",
  "azerbaijani",
  "bosnian",
  "somali",
  "hausa",
  "uzbek",
  "kazakh",
];

export const ALL_LANGUAGES: TranslationLanguage[] = [
  ...MAIN_LANGUAGES,
  ...ADDITIONAL_LANGUAGES,
];

/** Native-script display label for each language */
export const TRANSLATION_LABELS: Record<TranslationLanguage, string> = {
  arabic:     "العربية",
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
  persian:    "فارسی",
  german:     "Deutsch",
  portuguese: "Português",
  russian:    "Русский",
  chinese:    "中文",
  japanese:   "日本語",
  korean:     "한국어",
  swahili:    "Kiswahili",
  tamil:      "தமிழ்",
  telugu:     "తెలుగు",
  malayalam:  "മലയാളം",
  punjabi:    "ਪੰਜਾਬੀ",
  italian:    "Italiano",
  dutch:      "Nederlands",
  thai:       "ไทย",
  vietnamese: "Tiếng Việt",
  azerbaijani:"Azərbaycan dili",
  bosnian:    "Bosanski",
  somali:     "Soomaali",
  hausa:      "Hausa",
  uzbek:      "O‘zbekcha",
  kazakh:     "Қазақша",
};

/** English name for display in settings */
export const TRANSLATION_ENGLISH_NAMES: Record<TranslationLanguage, string> = {
  arabic:     "Arabic",
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
  persian:    "Persian",
  german:     "German",
  portuguese: "Portuguese",
  russian:    "Russian",
  chinese:    "Chinese",
  japanese:   "Japanese",
  korean:     "Korean",
  swahili:    "Swahili",
  tamil:      "Tamil",
  telugu:     "Telugu",
  malayalam:  "Malayalam",
  punjabi:    "Punjabi",
  italian:    "Italian",
  dutch:      "Dutch",
  thai:       "Thai",
  vietnamese: "Vietnamese",
  azerbaijani:"Azerbaijani",
  bosnian:    "Bosnian",
  somali:     "Somali",
  hausa:      "Hausa",
  uzbek:      "Uzbek",
  kazakh:     "Kazakh",
};

/** AlQuran Cloud edition identifiers */
export const TRANSLATION_EDITIONS: Record<TranslationLanguage, string> = {
  arabic:     "ar.alafasy",
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
  persian:    "fa.ayati",
  german:     "de.aburida",
  portuguese: "pt.elhayek",
  russian:    "ru.kuliev",
  chinese:    "zh.jian",
  japanese:   "ja.japanese",
  korean:     "ko.korean",
  swahili:    "sw.barwani",
  tamil:      "ta.tamil",
  // Additional editions use the source-aware Quran API below.
  telugu:     "tel-abdulraheemmoha",
  malayalam:  "mal-cheriyamundamab",
  punjabi:    "pan-drmuhamadhabibb",
  italian:    "it.piccardo",
  dutch:      "nld-salomokeyzer",
  thai:       "tha-kingfahadquranc",
  vietnamese: "vie-hassanabdulkari",
  azerbaijani:"aze-alikhanmusayev",
  bosnian:    "bos-korkut",
  somali:     "som-mahmudmuhammada",
  hausa:      "hau-abubakarmahmood",
  uzbek:      "uzb-muhammadsodikmu",
  kazakh:     "kaz-khalifahaltai",
};

/** Edition IDs used by the fallback source for languages not in AlQuran Cloud. */
const QURAN_API_EDITIONS: Partial<Record<TranslationLanguage, string>> = {
  telugu:     "tel-abdulraheemmoha",
  malayalam:  "mal-cheriyamundamab",
  punjabi:    "pan-drmuhamadhabibb",
  dutch:      "nld-salomokeyzer",
  thai:       "tha-kingfahadquranc",
  vietnamese: "vie-hassanabdulkari",
  azerbaijani:"aze-alikhanmusayev",
  bosnian:    "bos-korkut",
  somali:     "som-mahmudmuhammada",
  hausa:      "hau-abubakarmahmood",
  uzbek:      "uzb-muhammadsodikmu",
  kazakh:     "kaz-khalifahaltai",
};

export const TRANSLATION_FLAGS: Record<TranslationLanguage, string> = {
  arabic: "🇸🇦", urdu: "🇵🇰", english: "🇬🇧", sindhi: "🇵🇰", hindi: "🇮🇳",
  turkish: "🇹🇷", bengali: "🇧🇩", indonesian: "🇮🇩", french: "🇫🇷",
  spanish: "🇪🇸", malay: "🇲🇾", persian: "🇮🇷", german: "🇩🇪",
  portuguese: "🇵🇹", russian: "🇷🇺", chinese: "🇨🇳", japanese: "🇯🇵",
  korean: "🇰🇷", swahili: "🇰🇪", tamil: "🇮🇳", telugu: "🇮🇳",
  malayalam: "🇮🇳", punjabi: "🇮🇳", italian: "🇮🇹", dutch: "🇳🇱",
  thai: "🇹🇭", vietnamese: "🇻🇳", azerbaijani: "🇦🇿", bosnian: "🇧🇦",
  somali: "🇸🇴", hausa: "🇳🇬", uzbek: "🇺🇿", kazakh: "🇰🇿",
};

/**
 * BCP-47 language tags for Web Speech API TTS.
 * Urdu & English have the best TTS support. Sindhi (sd-PK) has limited
 * device support — the app always shows text regardless.
 */
export const TTS_LANG_CODES: Record<TranslationLanguage, string> = {
  arabic:      "ar-SA",
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
  persian:    "fa-IR",
  german:     "de-DE",
  portuguese: "pt-PT",
  russian:    "ru-RU",
  chinese:    "zh-CN",
  japanese:   "ja-JP",
  korean:     "ko-KR",
  swahili:    "sw-KE",
  tamil:      "ta-IN",
  telugu:     "te-IN",
  malayalam:  "ml-IN",
  punjabi:    "pa-IN",
  italian:    "it-IT",
  dutch:      "nl-NL",
  thai:       "th-TH",
  vietnamese: "vi-VN",
  azerbaijani:"az-AZ",
  bosnian:    "bs-BA",
  somali:     "so-SO",
  hausa:      "ha-NG",
  uzbek:      "uz-UZ",
  kazakh:     "kk-KZ",
};

/** Languages written right-to-left */
export const RTL_LANGUAGES = new Set<TranslationLanguage>(["arabic", "urdu", "sindhi", "persian"]);

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

/**
 * Fetch one surah's translation from the shared source registry.
 * Existing languages keep using their original AlQuran Cloud editions.
 * New languages that are not available there use the public Quran API
 * chapter endpoint instead.
 */
export async function fetchTranslationTexts(
  translation: TranslationLanguage,
  surahNumber: number,
): Promise<string[]> {
  if (translation === "arabic") {
    const data = await safeFetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}`,
    ) as { data?: { ayahs?: { text: string }[] } } | null;
    return data?.data?.ayahs?.map((ayah) => ayah.text) ?? [];
  }

  const quranApiEdition = QURAN_API_EDITIONS[translation];
  if (quranApiEdition) {
    const data = await safeFetch(
      `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/${quranApiEdition}/${surahNumber}.json`,
    ) as { chapter?: { verse: number; text: string }[] } | null;
    return (data?.chapter ?? [])
      .sort((a, b) => a.verse - b.verse)
      .map((ayah) => ayah.text);
  }

  const data = await safeFetch(
    `https://api.alquran.cloud/v1/surah/${surahNumber}/${TRANSLATION_EDITIONS[translation]}`,
  ) as { data?: { ayahs?: { text: string }[] } } | null;
  return data?.data?.ayahs?.map((ayah) => ayah.text) ?? [];
}

/** Resolve one ayah using the current saved translation language. */
export async function getCurrentTranslationText(
  translation: TranslationLanguage,
  surahNumber: number,
  ayahNumber: number,
): Promise<string> {
  const offlineTexts = await getOfflineTranslationTexts(translation, surahNumber);
  const texts = offlineTexts ?? await fetchTranslationTexts(translation, surahNumber);
  return sanitizeTranslation(translation, texts[ayahNumber - 1] ?? "");
}

export const useSurah = (number: number, translation: TranslationLanguage) => {
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
          translationTexts = await fetchTranslationTexts(translation, number);
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
      const [arData, translationTexts, transitData] = await Promise.all([
        safeFetch(`https://api.alquran.cloud/v1/surah/${number}`),
        fetchTranslationTexts(translation, number),
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

      const transitAyahs: { text: string }[] =
        (transitData as { data?: { ayahs?: { text: string }[] } } | null)?.data?.ayahs ?? [];

      const ayahs: AyahData[] = ar.data.ayahs.map((ayah, index) => ({
        numberInSurah:   ayah.numberInSurah,
        globalNumber:    ayah.number,
        textAr:          ayah.text,
        textTranslation: sanitizeTranslation(translation, translationTexts[index] ?? ""),
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

export const useRandomAyah = (translation: TranslationLanguage) =>
  useQuery({
    queryKey: ["randomAyah", translation],
    queryFn: async () => {
      // ── Offline-first: use bundled Arabic + selected translation ───────────
      const arabicData = await getOfflineArabic();

      if (arabicData) {
        const randomSurahNum = Math.floor(Math.random() * 114) + 1;
        const surah          = arabicData[String(randomSurahNum)];
        const randomAyahIdx  = Math.floor(Math.random() * surah.ayahs.length);
        const ayah           = surah.ayahs[randomAyahIdx];

        const selectedTexts = await getOfflineTranslationTexts(translation, randomSurahNum);
        let textTranslation = selectedTexts?.[randomAyahIdx] ?? "";

        // Match the Quran reader: use the selected translation pack when
        // available, otherwise fetch that same selected edition. Never
        // substitute another language.
        if (!selectedTexts) {
          const translationTexts = await fetchTranslationTexts(translation, randomSurahNum);
          textTranslation = translationTexts[randomAyahIdx] ?? "";
        }

        return {
          surah:         surah.englishName,
          surahNumber:   randomSurahNum,
          numberInSurah: ayah.n,
          globalNumber:  ayah.g,
          textAr:        ayah.t,
          textTranslation: sanitizeTranslation(translation, textTranslation),
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

      const [arRes, translationTexts] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah.number}`),
        fetchTranslationTexts(translation, randomSurah),
      ]);
      const arData = await arRes.json();

      return {
        surah:         data.data.englishName,
        surahNumber:   randomSurah,
        numberInSurah: arData.data.numberInSurah as number,
        globalNumber:  randomAyah.number,
        textAr:        arData.data.text,
        textTranslation: sanitizeTranslation(translation, translationTexts[randomAyahIdx] ?? ""),
        audioUrl:      getAudioUrl(randomAyah.number),
      };
    },
    staleTime: Infinity,
  });
