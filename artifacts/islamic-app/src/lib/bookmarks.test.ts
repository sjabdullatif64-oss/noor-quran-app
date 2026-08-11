import assert from "node:assert/strict";
import {
  getBookmarks,
  getSurahBookmarks,
  isBookmarked,
  isSurahBookmarked,
  removeBookmark,
  saveBookmark,
  toggleSurahBookmark,
} from "./bookmarks";

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});

const ayahBookmark = {
  surahNumber: 1,
  surahName: "الفاتحة",
  surahEnglishName: "Al-Fatihah",
  ayahNumber: 1,
  globalNumber: 1,
  textAr: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  textTranslation: "In the name of Allah, the Entirely Merciful.",
};

saveBookmark(ayahBookmark);
assert.equal(isBookmarked(1, 1), true);
assert.equal(isSurahBookmarked(1), false);

const added = toggleSurahBookmark({
  type: "surah",
  surahNumber: 1,
  surahName: "الفاتحة",
  surahEnglishName: "Al-Fatihah",
  surahEnglishNameTranslation: "The Opener",
  numberOfAyahs: 7,
});
assert.equal(added, true);
assert.equal(isSurahBookmarked(1), true);
assert.equal(getSurahBookmarks().length, 1);
assert.equal(getBookmarks().length, 2);
assert.equal(isBookmarked(1, 1), true);

// Tapping the Surah bookmark again removes only the Surah record.
const removed = toggleSurahBookmark({
  type: "surah",
  surahNumber: 1,
  surahName: "الفاتحة",
  surahEnglishName: "Al-Fatihah",
  surahEnglishNameTranslation: "The Opener",
  numberOfAyahs: 7,
});
assert.equal(removed, false);
assert.equal(isSurahBookmarked(1), false);
assert.equal(isBookmarked(1, 1), true);

// Existing Ayah-level removal remains scoped to the Ayah record.
toggleSurahBookmark({
  type: "surah",
  surahNumber: 1,
  surahName: "الفاتحة",
  surahEnglishName: "Al-Fatihah",
  surahEnglishNameTranslation: "The Opener",
  numberOfAyahs: 7,
});
removeBookmark(1, 1);
assert.equal(isBookmarked(1, 1), false);
assert.equal(isSurahBookmarked(1), true);
assert.equal(getBookmarks().length, 1);

console.log("bookmark storage tests passed");