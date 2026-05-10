const SURAH_KEY = "noor-fav-surahs";
const AYAH_KEY = "noor-fav-ayahs";

export interface FavoriteSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  savedAt: number;
}

export interface FavoriteAyah {
  surahNumber: number;
  surahEnglishName: string;
  surahName: string;
  ayahNumber: number;
  globalNumber: number;
  textAr: string;
  textTranslation: string;
  savedAt: number;
}

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function save<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

// ── Surah favorites ──────────────────────────────────────────────────────────
export const getFavSurahs = (): FavoriteSurah[] => load<FavoriteSurah>(SURAH_KEY);

export const isSurahFav = (number: number): boolean =>
  getFavSurahs().some((s) => s.number === number);

export const toggleSurahFav = (surah: Omit<FavoriteSurah, "savedAt">): boolean => {
  const existing = getFavSurahs();
  const idx = existing.findIndex((s) => s.number === surah.number);
  if (idx !== -1) {
    existing.splice(idx, 1);
    save(SURAH_KEY, existing);
    return false;
  }
  existing.push({ ...surah, savedAt: Date.now() });
  save(SURAH_KEY, existing);
  return true;
};

// ── Ayah favorites ───────────────────────────────────────────────────────────
export const getFavAyahs = (): FavoriteAyah[] => load<FavoriteAyah>(AYAH_KEY);

export const isAyahFav = (surahNumber: number, ayahNumber: number): boolean =>
  getFavAyahs().some((a) => a.surahNumber === surahNumber && a.ayahNumber === ayahNumber);

export const toggleAyahFav = (ayah: Omit<FavoriteAyah, "savedAt">): boolean => {
  const existing = getFavAyahs();
  const idx = existing.findIndex(
    (a) => a.surahNumber === ayah.surahNumber && a.ayahNumber === ayah.ayahNumber
  );
  if (idx !== -1) {
    existing.splice(idx, 1);
    save(AYAH_KEY, existing);
    return false;
  }
  existing.push({ ...ayah, savedAt: Date.now() });
  save(AYAH_KEY, existing);
  return true;
};

export const removeFavAyah = (surahNumber: number, ayahNumber: number): void => {
  save(AYAH_KEY, getFavAyahs().filter(
    (a) => !(a.surahNumber === surahNumber && a.ayahNumber === ayahNumber)
  ));
};

export const removeFavSurah = (number: number): void => {
  save(SURAH_KEY, getFavSurahs().filter((s) => s.number !== number));
};
