import { useQuery } from "@tanstack/react-query";

export interface Ayah {
  numberInSurah: number;
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

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
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

export const useSurahList = () => {
  return useQuery({
    queryKey: ["surahs"],
    queryFn: async () => {
      const res = await fetch("https://api.alquran.cloud/v1/surah");
      const data = await res.json();
      return data.data as Surah[];
    }
  });
};

export const useSurah = (number: number) => {
  return useQuery({
    queryKey: ["surah", number],
    queryFn: async () => {
      const [arRes, urRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${number}`),
        fetch(`https://api.alquran.cloud/v1/surah/${number}/ur.sahih`)
      ]);
      const arData = await arRes.json();
      const urData = await urRes.json();

      const ayahs = arData.data.ayahs.map((ayah: Ayah, index: number) => ({
        numberInSurah: ayah.numberInSurah,
        textAr: ayah.text,
        textUr: urData.data.ayahs[index].text
      }));

      return {
        ...arData.data,
        ayahs
      };
    },
    enabled: !!number
  });
};

export const usePrayerTimes = (city: string, country: string) => {
  return useQuery({
    queryKey: ["prayerTimes", city, country],
    queryFn: async () => {
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(
          city
        )}&country=${encodeURIComponent(country)}`
      );
      const data = await res.json();
      return data.data as PrayerData;
    }
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
      const randomAyahNum = data.data.ayahs[randomAyahIdx].number;

      const [arRes, urRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/ayah/${randomAyahNum}`),
        fetch(`https://api.alquran.cloud/v1/ayah/${randomAyahNum}/ur.sahih`)
      ]);

      const arData = await arRes.json();
      const urData = await urRes.json();

      return {
        surah: data.data.englishName,
        numberInSurah: arData.data.numberInSurah,
        textAr: arData.data.text,
        textUr: urData.data.text
      };
    },
    staleTime: Infinity,
  });
};
