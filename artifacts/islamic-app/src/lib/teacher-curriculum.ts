/**
 * Noor Quran — AI Quran Teacher: bundled curriculum (Levels 1–5)
 *
 * Every lesson references REAL verified Quranic recitation audio — never TTS.
 * - "wbw" audio: word-by-word MP3s from Quran.com CDN (surah/ayah/word position)
 * - Letter & harakat lessons map to a real Quranic word CONTAINING the target
 *   sound; the UI highlights the target letter inside the word.
 *
 * Level 5 is generated from the bundled verified Quran text. Its passages are
 * stable and ordered, while their length follows the completed-lesson
 * progression defined below, capped at five words.
 */

import {
  PRACTICE_MAX_WORDS,
  PRACTICE_MIN_WORDS,
  PRACTICE_WORD_STEP,
  wbwAudioUrl,
} from "./teacher-config";
import quranArabicData from "../../public/quran-data/quran-arabic.json";

type QuranAyahData = {
  n: number;
  g: number;
  t: string;
};

type QuranSurahData = {
  name: string;
  englishName: string;
  ayahs: QuranAyahData[];
};

type QuranArabicData = Record<string, QuranSurahData>;

export interface TeacherLesson {
  /** Stable unique id, e.g. "l1-ba", "l4-w07". Used as the progress key. */
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  /** Order within the level (1-based). */
  order: number;
  /** What is being learned — a letter, a harakah symbol, or a word. */
  arabic: string;
  /** The full Quranic word played as audio (equals `arabic` for word lessons). */
  word: string;
  /** Letter/symbol to visually highlight inside `word` (empty for word lessons). */
  highlight: string;
  transliteration: string;
  meaning: string;
  /** Friendly pronunciation tip. */
  tip: string;
  /** Verified audio reference. */
  audio: {
    surah: number;
    ayah: number;
    word: number;
    /** Full word-by-word sequence for generated multi-word passages. */
    sequence?: Array<{ surah: number; ayah: number; word: number }>;
  };
  /** What the learner is expected to SAY (the full word — recognizers work on words). */
  expected: string;
}

export interface TeacherLevel {
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
}

export const LEVELS: TeacherLevel[] = [
  { level: 1, title: "Arabic Letters", subtitle: "The 28 letters, heard inside real Quran words" },
  { level: 2, title: "Harakat (Vowel Marks)", subtitle: "Fatha, Kasra, Damma, Sukoon, Shadda" },
  { level: 3, title: "Small Words", subtitle: "Short Quranic words you already heard" },
  { level: 4, title: "Surah Al-Fatihah", subtitle: "Word by word — the opening of the Quran" },
  { level: 5, title: "Full Quran Reading", subtitle: "Progressive passages from Al-Baqarah to An-Naas" },
];

// ── Level 1 — the 28 Arabic letters ──────────────────────────────────────────
// Each letter is taught through a real Quranic word containing it.
// [letter, letterName, word, highlightIndexNote, translit, meaning, surah, ayah, wordPos, tip]
const L1: Array<[string, string, string, string, string, number, number, number, string]> = [
  ["ا", "Alif",  "أَحَدٌ",        "ahad",       "One",              112, 1, 4, "Alif is an open 'aa' sound from deep in the throat, mouth relaxed."],
  ["ب", "Ba",    "بِسْمِ",        "bismi",      "In the name",      1,   1, 1, "Ba is a soft 'b' made by pressing the lips together lightly."],
  ["ت", "Ta",    "أَنْعَمْتَ",     "an'amta",    "You have favored", 1,   7, 3, "Ta is a light 't' — tongue tip touches behind the upper teeth."],
  ["ث", "Tha",   "النَّفَّاثَاتِ", "an-naffathat","the blowers",     113, 4, 3, "Tha is like 'th' in 'think' — tongue tip between the teeth."],
  ["ج", "Jeem",  "الْجِنَّةِ",     "al-jinnati", "the jinn",         114, 6, 2, "Jeem is like the 'j' in 'jam', from the middle of the tongue."],
  ["ح", "Ha",    "الْحَمْدُ",      "al-hamdu",   "All praise",       1,   2, 1, "Ha is a breathy 'h' from the middle of the throat — no voice, just air."],
  ["خ", "Kha",   "الْخَنَّاسِ",    "al-khannas", "the withdrawer",   114, 4, 4, "Kha is a rough 'kh' from the top of the throat, like clearing it softly."],
  ["د", "Dal",   "الدِّينِ",       "ad-deen",    "the Judgment",     1,   4, 3, "Dal is a firm 'd' — tongue tip presses behind the upper teeth."],
  ["ذ", "Dhal",  "الَّذِينَ",      "alladheena", "those who",        1,   7, 2, "Dhal is like 'th' in 'this' — soft and voiced, tongue between teeth."],
  ["ر", "Ra",    "رَبِّ",          "rabbi",      "Lord",             1,   2, 3, "Ra is a lightly rolled 'r' made with the tip of the tongue."],
  ["ز", "Zay",   "زُلْزِلَتِ",     "zulzilat",   "is shaken",        99,  1, 2, "Zay is a clear buzzing 'z', like in 'zoom'."],
  ["س", "Seen",  "نَسْتَعِينُ",    "nasta'een",  "we ask for help",  1,   5, 4, "Seen is a soft hissing 's', air flowing over the tongue."],
  ["ش", "Sheen", "شَرِّ",          "sharri",     "the evil",         113, 2, 2, "Sheen is 'sh' as in 'ship', spread across the tongue."],
  ["ص", "Sad",   "الصِّرَاطَ",     "as-sirat",   "the path",         1,   6, 2, "Sad is a heavy 's' — raise the back of the tongue, round the sound."],
  ["ض", "Dad",   "الضَّالِّينَ",   "ad-dalleen", "those astray",     1,   7, 9, "Dad is a heavy 'd' unique to Arabic — sides of the tongue press the molars."],
  ["ط", "Ta (heavy)", "صِرَاطَ",   "sirata",     "the path of",      1,   7, 1, "Ta (heavy) is a deep, full 't' — tongue pressed flat and strong."],
  ["ظ", "Dha (heavy)", "ظَهْرَكَ", "dhahraka",   "your back",        94,  3, 3, "Dha (heavy) is a deep 'th' of 'this' with a full, heavy mouth."],
  ["ع", "Ayn",   "الْعَالَمِينَ",  "al-'alameen","the worlds",       1,   2, 4, "Ayn comes from squeezing the middle of the throat — no English equivalent."],
  ["غ", "Ghayn", "غَيْرِ",         "ghayri",     "not (of)",         1,   7, 5, "Ghayn is a soft gargled 'gh', like a light French 'r'."],
  ["ف", "Fa",    "فَصَلِّ",        "fasalli",    "so pray",          108, 2, 1, "Fa is 'f' — upper teeth touch the lower lip gently."],
  ["ق", "Qaf",   "قُلْ",           "qul",        "Say",              112, 1, 1, "Qaf is a deep 'k' from the very back of the tongue and throat."],
  ["ك", "Kaf",   "الْكَوْثَرَ",    "al-kawthar", "abundance",        108, 1, 3, "Kaf is a light 'k' as in 'kite'."],
  ["ل", "Lam",   "لِلَّهِ",        "lillahi",    "to Allah",         1,   2, 2, "Lam is 'l' — tongue tip touches the roof of the mouth."],
  ["م", "Meem",  "مَالِكِ",        "maliki",     "Master",           1,   4, 1, "Meem is 'm' — lips close fully and the sound hums through the nose."],
  ["ن", "Noon",  "نَعْبُدُ",       "na'budu",    "we worship",       1,   5, 2, "Noon is 'n' — tongue tip up, sound flows through the nose."],
  ["ه", "Ha (soft)", "هُوَ",       "huwa",       "He (is)",          112, 1, 2, "Ha (soft) is a gentle 'h' as in 'home', from deep in the throat."],
  ["و", "Waw",   "وَإِيَّاكَ",     "wa iyyaka",  "and You alone",    1,   5, 3, "Waw is 'w' — round the lips as in 'we'."],
  ["ي", "Ya",    "يَوْمِ",         "yawmi",      "the Day of",       1,   4, 2, "Ya is 'y' as in 'yes', from the middle of the tongue."],
];

// ── Level 2 — Harakat (vowel marks) ──────────────────────────────────────────
const L2: Array<[string, string, string, string, string, string, number, number, number, string]> = [
  // [symbol, name, word, highlight, translit, meaning, surah, ayah, word, tip]
  ["ـَ", "Fatha",  "أَحَدٌ",  "أَ", "ahad",  "One",         112, 1, 4, "Fatha is the small line ABOVE a letter — it adds a short 'a': ba, ta, sa."],
  ["ـِ", "Kasra",  "بِسْمِ",  "بِ", "bismi", "In the name", 1,   1, 1, "Kasra is the small line BELOW a letter — it adds a short 'i': bi, ti, si."],
  ["ـُ", "Damma",  "هُوَ",    "هُ", "huwa",  "He (is)",     112, 1, 2, "Damma is the tiny 'waw' above a letter — it adds a short 'u': bu, tu, su."],
  ["ـْ", "Sukoon", "قُلْ",    "لْ", "qul",   "Say",         112, 1, 1, "Sukoon is the small circle above a letter — the letter STOPS with no vowel."],
  ["ـّ", "Shadda", "رَبِّ",   "بِّ", "rabbi", "Lord",       1,   2, 3, "Shadda doubles the letter — press it twice as long: rab-bi."],
];

// ── Level 3 — Small words ────────────────────────────────────────────────────
const L3: Array<[string, string, string, number, number, number, string]> = [
  // [word, translit, meaning, surah, ayah, wordPos, tip]
  ["بِسْمِ",   "bismi",   "In the name",  1,   1, 1, "Two beats: 'bis-mi'. Keep the 's' soft and light."],
  ["قُلْ",     "qul",     "Say",          112, 1, 1, "One strong beat. The Qaf comes from deep in the throat, then stop on the Lam."],
  ["هُوَ",     "huwa",    "He (is)",      112, 1, 2, "Soft and quick: 'hu-wa'. Round your lips on the 'wa'."],
  ["رَبِّ",    "rabbi",   "Lord",         1,   2, 3, "Roll the Ra lightly, then press the doubled Ba: 'rab-bi'."],
  ["يَوْمِ",   "yawmi",   "the Day of",   1,   4, 2, "'Yaw' then 'mi'. The Waw has sukoon — glide, don't add a vowel."],
  ["شَرِّ",    "sharri",  "the evil of",  113, 2, 2, "'Shar-ri' — the doubled Ra is pressed and rolled."],
  ["غَيْرِ",   "ghayri",  "not (of)",     1,   7, 5, "Start with the soft gargled Ghayn: 'ghay-ri'."],
  ["أَحَدٌ",   "ahad",    "One",          112, 1, 4, "'A-had' with the breathy Ha in the middle. End with the light 'un' tanween."],
];

// ── Level 4 — Surah Al-Fatihah, word by word (29 words) ──────────────────────
const L4: Array<[string, string, string, number, number, string?]> = [
  // [word, translit, meaning, ayah, wordPos, tip?]
  ["بِسْمِ",        "bismi",        "In the name",           1, 1, "Begin gently: 'bis-mi'."],
  ["اللَّهِ",       "Allahi",       "of Allah",              1, 2, "Make the Lam full and heavy after the 'i' sound before it is light: 'llaa-hi'."],
  ["الرَّحْمَٰنِ",  "ar-Rahmani",   "the Most Gracious",     1, 3, "The Ra is doubled and rolled: 'ar-rah-maa-ni'."],
  ["الرَّحِيمِ",    "ar-Raheemi",   "the Most Merciful",     1, 4, "Stretch the 'ee' in the middle: 'ra-hee-m'."],
  ["الْحَمْدُ",     "al-hamdu",     "All praise",            2, 1, "The Ha is breathy from the throat: 'al-ham-du'."],
  ["لِلَّهِ",       "lillahi",      "is for Allah",          2, 2, "Two Lams flow together: 'lil-laa-hi'."],
  ["رَبِّ",         "rabbi",        "Lord",                  2, 3, "Press the doubled Ba: 'rab-bi'."],
  ["الْعَالَمِينَ", "al-'alameen",  "of all the worlds",     2, 4, "Open with the deep Ayn: ''aa-la-meen'."],
  ["الرَّحْمَٰنِ",  "ar-Rahmani",   "the Most Gracious",     3, 1, "Same as before — doubled Ra, long 'maa'."],
  ["الرَّحِيمِ",    "ar-Raheemi",   "the Most Merciful",     3, 2, "Long 'ee' in the middle, gentle ending."],
  ["مَالِكِ",       "maliki",       "Master",                4, 1, "Long 'maa' at the start: 'maa-li-ki'."],
  ["يَوْمِ",        "yawmi",        "of the Day",            4, 2, "Glide through the Waw: 'yaw-mi'."],
  ["الدِّينِ",      "ad-deeni",     "of Judgment",           4, 3, "The Dal is doubled: 'ad-dee-n', with a long 'ee'."],
  ["إِيَّاكَ",      "iyyaka",       "You alone",             5, 1, "Press the doubled Ya: 'iy-yaa-ka'."],
  ["نَعْبُدُ",      "na'budu",      "we worship",            5, 2, "The Ayn sits in the middle: 'na'-bu-du'."],
  ["وَإِيَّاكَ",    "wa iyyaka",    "and You alone",         5, 3, "Add the Waw first: 'wa iy-yaa-ka'."],
  ["نَسْتَعِينُ",   "nasta'eenu",   "we ask for help",       5, 4, "Four beats: 'nas-ta-'ee-nu' with the deep Ayn before the long 'ee'."],
  ["اهْدِنَا",      "ihdina",       "Guide us",              6, 1, "Start soft: 'ih-di-naa', ending with a long 'aa'."],
  ["الصِّرَاطَ",    "as-sirata",    "to the path",           6, 2, "Heavy Sad: 'as-si-raa-ta' with a full mouth."],
  ["الْمُسْتَقِيمَ","al-mustaqeema","the straight (path)",   6, 3, "Deep Qaf near the end: 'mus-ta-qee-m'."],
  ["صِرَاطَ",       "sirata",       "the path of",           7, 1, "Heavy Sad and Ta: 'si-raa-ta'."],
  ["الَّذِينَ",     "alladheena",   "those whom",            7, 2, "Soft 'th' of 'this': 'al-la-dhee-na'."],
  ["أَنْعَمْتَ",    "an'amta",      "You have favored",      7, 3, "The Ayn after the Noon: 'an-'am-ta'."],
  ["عَلَيْهِمْ",    "'alayhim",     "upon them",             7, 4, "Open with the Ayn: ''a-lay-him'."],
  ["غَيْرِ",        "ghayri",       "not (of)",              7, 5, "The gargled Ghayn: 'ghay-ri'."],
  ["الْمَغْضُوبِ",  "al-maghdubi",  "those who earned anger",7, 6, "Ghayn then heavy Dad: 'magh-doo-bi'."],
  ["عَلَيْهِمْ",    "'alayhim",     "upon them",             7, 7, "Same as before: ''a-lay-him'."],
  ["وَلَا",         "wa la",        "and not",               7, 8, "Two light beats: 'wa-laa'."],
  ["الضَّالِّينَ",  "ad-dalleen",   "those who went astray", 7, 9, "Heavy doubled Dad and a long stretched 'aal-leen' — take your time."],
];

// ── Build the flat lesson list ────────────────────────────────────────────────

function buildLessons(): TeacherLesson[] {
  const lessons: TeacherLesson[] = [];

  L1.forEach(([letter, name, word, translit, meaning, s, a, w, tip], i) => {
    lessons.push({
      id: `l1-${String(i + 1).padStart(2, "0")}`,
      level: 1, order: i + 1,
      arabic: letter, word, highlight: letter,
      transliteration: `${name} — in "${translit}"`,
      meaning, tip,
      audio: { surah: s, ayah: a, word: w },
      expected: word,
    });
  });

  L2.forEach(([symbol, name, word, highlight, translit, meaning, s, a, w, tip], i) => {
    lessons.push({
      id: `l2-${String(i + 1).padStart(2, "0")}`,
      level: 2, order: i + 1,
      arabic: symbol, word, highlight,
      transliteration: `${name} — in "${translit}"`,
      meaning, tip,
      audio: { surah: s, ayah: a, word: w },
      expected: word,
    });
  });

  L3.forEach(([word, translit, meaning, s, a, w, tip], i) => {
    lessons.push({
      id: `l3-${String(i + 1).padStart(2, "0")}`,
      level: 3, order: i + 1,
      arabic: word, word, highlight: "",
      transliteration: translit, meaning, tip,
      audio: { surah: s, ayah: a, word: w },
      expected: word,
    });
  });

  L4.forEach(([word, translit, meaning, ayah, wordPos, tip], i) => {
    lessons.push({
      id: `l4-${String(i + 1).padStart(2, "0")}`,
      level: 4, order: i + 1,
      arabic: word, word, highlight: "",
      transliteration: translit, meaning,
      tip: tip ?? "Listen first, then repeat slowly.",
      audio: { surah: 1, ayah, word: wordPos },
      expected: word,
    });
  });

  lessons.push(...buildFullQuranLessons());
  return lessons;
}

export const CURRICULUM: TeacherLesson[] = buildLessons();

/**
 * Number of words in a new practice passage after a given number of lessons
 * have already been completed. The first 30 lessons are single-word
 * exercises; the target increases every 30 completed lessons and stops at 5.
 */
export function practiceWordCount(completedLessons: number): number {
  const completed = Number.isFinite(completedLessons)
    ? Math.max(0, Math.floor(completedLessons))
    : 0;
  return Math.min(
    PRACTICE_MAX_WORDS,
    PRACTICE_MIN_WORDS + Math.floor(completed / PRACTICE_WORD_STEP),
  );
}

export function getLesson(id: string): TeacherLesson | undefined {
  return CURRICULUM.find((l) => l.id === id);
}

export function getLevelLessons(level: number): TeacherLesson[] {
  return CURRICULUM.filter((l) => l.level === level);
}

/** The lesson after `id` in curriculum order, or undefined at the end. */
export function getNextLesson(id: string): TeacherLesson | undefined {
  const idx = CURRICULUM.findIndex((l) => l.id === id);
  if (idx < 0 || idx + 1 >= CURRICULUM.length) return undefined;
  return CURRICULUM[idx + 1];
}

export function lessonAudioUrl(lesson: TeacherLesson): string {
  return wbwAudioUrl(lesson.audio.surah, lesson.audio.ayah, lesson.audio.word);
}

/** Verified word-by-word audio for the complete expected passage. */
export function lessonAudioUrls(lesson: TeacherLesson): string[] {
  const sequence = lesson.audio.sequence ?? [lesson.audio];
  return sequence.map((word) => wbwAudioUrl(word.surah, word.ayah, word.word));
}

type FullQuranWord = {
  text: string;
  surah: number;
  ayah: number;
  word: number;
  surahName: string;
  englishName: string;
};

/**
 * The bundled Quran file is also used by the main Quran reader. Importing it
 * here keeps the Teacher catalog synchronous and deterministic, so lesson
 * routes do not need a new async loading state and existing progress IDs stay
 * compatible.
 */
function cleanQuranWords(text: string): Array<{ text: string; position: number }> {
  const tokens = text
    .replace(/[\u200A\u200B\u200C\u200D\u2060]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const words: Array<{ text: string; position: number }> = [];
  for (const token of tokens) {
    // Some bundled Quran marks are separated from their carrier letter by a
    // whitespace introduced during data generation (for example, a maddah
    // before ط). They are still one recited word and one WBW audio position.
    if (/^\p{M}/u.test(token) && words.length > 0) {
      words[words.length - 1].text += token;
    } else {
      words.push({ text: token, position: words.length + 1 });
    }
  }
  return words;
}

function getFullQuranWords(): FullQuranWord[] {
  const data = quranArabicData as QuranArabicData;
  return Object.entries(data)
    .filter(([surah]) => Number(surah) >= 2)
    .flatMap(([surah, value]) => {
      const surahNumber = Number(surah);
      return value.ayahs.flatMap((ayah) =>
        cleanQuranWords(ayah.t).map(({ text, position }) => ({
          text,
          surah: surahNumber,
          ayah: ayah.n,
          word: position,
          surahName: value.name,
          englishName: value.englishName,
        })),
      );
    });
}

function passageReference(words: FullQuranWord[]): string {
  const first = words[0];
  const last = words[words.length - 1];
  const end = first.ayah === last.ayah
    ? `${first.ayah}:${first.word}-${last.word}`
    : `${first.ayah}:${first.word}–${last.ayah}:${last.word}`;
  return `${first.englishName} ${end}`;
}

function buildFullQuranLessons(): TeacherLesson[] {
  const words = getFullQuranWords();
  const lessons: TeacherLesson[] = [];
  let cursor = 0;
  let order = 1;
  const legacyLessonCount = L1.length + L2.length + L3.length + L4.length;

  while (cursor < words.length) {
    const targetWords = practiceWordCount(legacyLessonCount + order - 1);
    const passage = words.slice(cursor, cursor + targetWords);
    const first = passage[0];
    if (!first) break;
    const expected = passage.map((word) => word.text).join(" ");

    lessons.push({
      id: `quran-${String(order).padStart(4, "0")}`,
      level: 5,
      order,
      arabic: expected,
      word: expected,
      highlight: "",
      transliteration: `Quran passage · ${passageReference(passage)}`,
      meaning: `Read ${passage.length} word${passage.length === 1 ? "" : "s"} from the Quran`,
      tip: `Listen to the complete ${passage.length}-word passage, then recite it naturally.`,
      audio: {
        surah: first.surah,
        ayah: first.ayah,
        word: first.word,
        sequence: passage.map((word) => ({
          surah: word.surah,
          ayah: word.ayah,
          word: word.word,
        })),
      },
      expected,
    });
    cursor += passage.length;
    order += 1;
  }

  return lessons;
}
