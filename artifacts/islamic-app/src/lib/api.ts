import { useQuery } from "@tanstack/react-query";

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
      const res = await fetch("https://api.alquran.cloud/v1/surah");
      const data = await res.json();
      return data.data as Surah[];
    },
    staleTime: Infinity,
  });

/** Safely fetch a URL and parse JSON.  Returns null on any error. */
async function safeFetch(url: string): Promise<unknown> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const useSurah = (number: number, translation: TranslationLanguage) => {
  const edition = TRANSLATION_EDITIONS[translation];
  return useQuery({
    queryKey: ["surah", number, translation],
    queryFn: async () => {
      // Fetch Arabic text, selected translation, and transliteration in parallel.
      // Translation/transliteration failures are isolated — Arabic always loads.
      const [arData, trData, transitData] = await Promise.all([
        safeFetch(`https://api.alquran.cloud/v1/surah/${number}`),
        safeFetch(`https://api.alquran.cloud/v1/surah/${number}/${edition}`),
        safeFetch(`https://api.alquran.cloud/v1/surah/${number}/en.transliteration`),
      ]);

      // Arabic is required — throw so TanStack Query retries
      const ar = arData as { data: { number: number; name: string; englishName: string; englishNameTranslation: string; numberOfAyahs: number; revelationType: string; ayahs: Ayah[] } } | null;
      if (!ar?.data?.ayahs) throw new Error("Arabic surah fetch failed");

      const trAyahs: { text: string }[]     = (trData     as { data?: { ayahs?: { text: string }[] } } | null)?.data?.ayahs ?? [];
      const transitAyahs: { text: string }[] = (transitData as { data?: { ayahs?: { text: string }[] } } | null)?.data?.ayahs ?? [];

      const ayahs: AyahData[] = ar.data.ayahs.map((ayah, index) => ({
        numberInSurah:   ayah.numberInSurah,
        globalNumber:    ayah.number,
        textAr:          ayah.text,
        textTranslation: trAyahs[index]?.text     ?? "",
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

export const usePrayerTimes = (city: string, country: string, enabled = true) =>
  useQuery({
    queryKey: ["prayerTimes", city, country],
    queryFn: async () => {
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2`
      );
      if (!res.ok) throw new Error("City not found");
      const data = await res.json();
      if (data.code !== 200) throw new Error(data.data ?? "City not found");
      return data.data as PrayerData;
    },
    enabled: enabled && !!city && !!country,
    retry: 1,
  });

/** Fetch prayer times by GPS coordinates using Aladhan's coordinates endpoint. */
export const usePrayerTimesByCoords = (lat: number | null, lng: number | null, enabled = true) => {
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;
  return useQuery({
    queryKey: ["prayerTimesByCoords", lat, lng, dateStr],
    queryFn: async () => {
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=2`
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

export const useRandomAyah = () =>
  useQuery({
    queryKey: ["randomAyah"],
    queryFn: async () => {
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
        numberInSurah: arData.data.numberInSurah,
        globalNumber:  randomAyah.number,
        textAr:        arData.data.text,
        textUr:        urData.data.text,
        audioUrl:      getAudioUrl(randomAyah.number),
      };
    },
    staleTime: Infinity,
  });
