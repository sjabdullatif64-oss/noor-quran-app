const STORAGE_KEY = "noor-bookmarks";

export interface AyahBookmark {
  type?: "ayah";
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  ayahNumber: number;
  globalNumber: number;
  textAr: string;
  textTranslation: string;
  savedAt: number;
  juzNumber?: number;
}

export interface SurahBookmark {
  type: "surah";
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  surahEnglishNameTranslation: string;
  numberOfAyahs: number;
  savedAt: number;
}

export type Bookmark = AyahBookmark | SurahBookmark;

export function getBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Bookmark[];
  } catch {
    return [];
  }
}

export function saveBookmark(bookmark: Bookmark): void {
  const existing = getBookmarks();
  const filtered = existing.filter(
    (b) => {
      if (bookmark.type === "surah") {
        return !(b.type === "surah" && b.surahNumber === bookmark.surahNumber);
      }
      return !(
        b.type !== "surah" &&
        b.surahNumber === bookmark.surahNumber &&
        b.ayahNumber === bookmark.ayahNumber
      );
    },
  );
  filtered.push({ ...bookmark, savedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function removeBookmark(surahNumber: number, ayahNumber: number): void {
  const existing = getBookmarks();
  const filtered = existing.filter(
    (b) =>
      !(
        b.type !== "surah" &&
        b.surahNumber === surahNumber &&
        b.ayahNumber === ayahNumber
      )
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function isBookmarked(surahNumber: number, ayahNumber: number): boolean {
  return getBookmarks().some(
    (b) =>
      b.type !== "surah" &&
      b.surahNumber === surahNumber &&
      b.ayahNumber === ayahNumber
  );
}

export function getSurahBookmarks(): SurahBookmark[] {
  return getBookmarks().filter(
    (bookmark): bookmark is SurahBookmark => bookmark.type === "surah",
  );
}

export function isSurahBookmarked(surahNumber: number): boolean {
  return getSurahBookmarks().some(
    (bookmark) => bookmark.surahNumber === surahNumber,
  );
}

export function toggleSurahBookmark(
  bookmark: Omit<SurahBookmark, "savedAt">,
): boolean {
  const existing = getBookmarks();
  const index = existing.findIndex(
    (item) =>
      item.type === "surah" && item.surahNumber === bookmark.surahNumber,
  );

  if (index !== -1) {
    existing.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return false;
  }

  existing.push({ ...bookmark, savedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return true;
}

export function removeSurahBookmark(surahNumber: number): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      getBookmarks().filter(
        (bookmark) =>
          !(bookmark.type === "surah" && bookmark.surahNumber === surahNumber),
      ),
    ),
  );
}
