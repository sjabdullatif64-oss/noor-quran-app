const STORAGE_KEY = "noor-bookmarks";

export interface Bookmark {
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  ayahNumber: number;
  globalNumber: number;
  textAr: string;
  textTranslation: string;
  savedAt: number;
}

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
    (b) =>
      !(b.surahNumber === bookmark.surahNumber && b.ayahNumber === bookmark.ayahNumber)
  );
  filtered.push({ ...bookmark, savedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function removeBookmark(surahNumber: number, ayahNumber: number): void {
  const existing = getBookmarks();
  const filtered = existing.filter(
    (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function isBookmarked(surahNumber: number, ayahNumber: number): boolean {
  return getBookmarks().some(
    (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
  );
}
