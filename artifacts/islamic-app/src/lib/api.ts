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
  numberInSurah: number;
  globalNumber: number;
  textAr: string;
  textTranslation: string;
  audioUrl: string;
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
      month: {
        number: number;
        en: string;
        ar: string;
      };
      year: string;
    };
  };
}

export type TranslationLanguage = "urdu" | "sindhi" | "english";

export const TRANSLATION_LABELS: Record<TranslationLanguage, string> = {
  urdu: "اردو",
  sindhi: "سنڌي",
  english: "English",
};

export const TRANSLATION_EDITIONS: Record<TranslationLanguage, string> = {
  urdu: "ur.sahih",
  sindhi: "sd.muhammadlockhat",
  english: "en.sahih",
};

export const getAudioUrl = (globalAyahNumber: number) =>
  `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber}.mp3`;

export const useSurahList = () => {
  return useQuery({
    queryKey: ["surahs"],
    queryFn: async () => {
      const res = await fetch("https://api.alquran.cloud/v1/surah");
      const data = await res.json();
      return data.data as Surah[];
    },
    staleTime: Infinity,
  });
};

export const useSurah = (number: number, translation: TranslationLanguage) => {
  const edition = TRANSLATION_EDITIONS[translation];
  return useQuery({
    queryKey: ["surah", number, translation],
    queryFn: async () => {
      const [arRes, trRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${number}`),
        fetch(`https://api.alquran.cloud/v1/surah/${number}/${edition}`),
      ]);
      const arData = await arRes.json();
      const trData = await trRes.json();

      const ayahs: AyahData[] = arData.data.ayahs.map(
        (ayah: Ayah, index: number) => ({
          numberInSurah: ayah.numberInSurah,
          globalNumber: ayah.number,
          textAr: ayah.text,
          textTranslation: trData.data.ayahs[index]?.text ?? "",
          audioUrl: getAudioUrl(ayah.number),
        })
      );

      return {
        number: arData.data.number,
        name: arData.data.name,
        englishName: arData.data.englishName,
        englishNameTranslation: arData.data.englishNameTranslation,
        numberOfAyahs: arData.data.numberOfAyahs,
        revelationType: arData.data.revelationType,
        ayahs,
      } as SurahDetail;
    },
    enabled: !!number,
    staleTime: 10 * 60 * 1000,
  });
};

export const usePrayerTimes = (city: string, country: string) => {
  return useQuery({
    queryKey: ["prayerTimes", city, country],
    queryFn: async () => {
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`
      );
      const data = await res.json();
      return data.data as PrayerData;
    },
  });
};

export const useRandomAyah = () => {
  return useQuery({
    queryKey: ["randomAyah"],
    queryFn: async () => {
      const randomSurah = Math.floor(Math.random() * 114) + 1;
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${randomSurah}`);
      const data = await res.json();
      const numAyahs = data.data.numberOfAyahs;
      const randomAyahIdx = Math.floor(Math.random() * numAyahs);
      const randomAyah = data.data.ayahs[randomAyahIdx];

      const [arRes, urRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah.number}`),
        fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah.number}/ur.sahih`),
      ]);

      const arData = await arRes.json();
      const urData = await urRes.json();

      return {
        surah: data.data.englishName,
        numberInSurah: arData.data.numberInSurah,
        globalNumber: randomAyah.number,
        textAr: arData.data.text,
        textUr: urData.data.text,
        audioUrl: getAudioUrl(randomAyah.number),
      };
    },
    staleTime: Infinity,
  });
};
