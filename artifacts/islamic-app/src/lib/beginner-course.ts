/**
 * Noor Quran — separate Arabic Reading Basics course.
 *
 * This catalog is intentionally independent from the Quran Teacher
 * word-progression curriculum. It is bundled so the course remains available
 * offline and can teach a brand-new reader from Alif onward.
 */

export type BeginnerLessonKind =
  | "letter"
  | "shape"
  | "harakah"
  | "tanween"
  | "sukoon"
  | "shaddah"
  | "madd"
  | "blend"
  | "word"
  | "phrase";

export interface BeginnerLesson {
  id: string;
  level: number;
  order: number;
  kind: BeginnerLessonKind;
  title: string;
  arabic: string;
  transliteration: string;
  explanation: string;
  audioText: string;
  choices: string[];
}

export interface BeginnerLevel {
  level: number;
  title: string;
  subtitle: string;
  lessonIds: string[];
}

const LETTERS: Array<[string, string, string]> = [
  ["ا", "Alif", "a long open sound"],
  ["ب", "Ba", "a light b sound"],
  ["ت", "Ta", "a light t sound"],
  ["ث", "Tha", "the th in think"],
  ["ج", "Jeem", "a j sound"],
  ["ح", "Ha", "a breathy h sound"],
  ["خ", "Kha", "a soft throat sound"],
  ["د", "Dal", "a d sound"],
  ["ذ", "Dhal", "the th in this"],
  ["ر", "Ra", "a lightly rolled r"],
  ["ز", "Zay", "a z sound"],
  ["س", "Seen", "an s sound"],
  ["ش", "Sheen", "the sh in ship"],
  ["ص", "Sad", "a heavy s sound"],
  ["ض", "Dad", "a heavy d sound"],
  ["ط", "Ta", "a heavy t sound"],
  ["ظ", "Dha", "a heavy dh sound"],
  ["ع", "Ayn", "a deep throat sound"],
  ["غ", "Ghayn", "a gentle gh sound"],
  ["ف", "Fa", "an f sound"],
  ["ق", "Qaf", "a deep q sound"],
  ["ك", "Kaf", "a k sound"],
  ["ل", "Lam", "an l sound"],
  ["م", "Meem", "an m sound"],
  ["ن", "Noon", "an n sound"],
  ["و", "Waw", "a w sound"],
  ["ه", "Ha", "a soft h sound"],
  ["ي", "Ya", "a y sound"],
];

const LEVEL_DEFINITIONS = [
  { level: 1, title: "Arabic Letters", subtitle: "Start with Alif, Ba, Ta" },
  { level: 2, title: "Letter Shapes", subtitle: "See letters connect in simple forms" },
  { level: 3, title: "Harakat", subtitle: "Learn the short vowel marks" },
  { level: 4, title: "Tanween", subtitle: "Practice the three ending sounds" },
  { level: 5, title: "Sukoon", subtitle: "Read a letter with no vowel" },
  { level: 6, title: "Shaddah", subtitle: "Feel the doubled sound" },
  { level: 7, title: "Madd", subtitle: "Hear short and long vowels" },
  { level: 8, title: "Simple Reading", subtitle: "Blend sounds into small units" },
  { level: 9, title: "Quranic Words", subtitle: "Read short words from the Quran" },
  { level: 10, title: "Quran Reading", subtitle: "Move gently into short phrases" },
] as const;

function letterLessons(): BeginnerLesson[] {
  return LETTERS.map(([arabic, name, sound], index) => {
    const previous = LETTERS[(index + LETTERS.length - 1) % LETTERS.length][0];
    const next = LETTERS[(index + 1) % LETTERS.length][0];
    return {
      id: `letters-${String(index + 1).padStart(2, "0")}`,
      level: 1,
      order: index + 1,
      kind: "letter",
      title: name,
      arabic,
      transliteration: name,
      explanation: `${name} makes ${sound}. Listen, then repeat the letter slowly.`,
      audioText: arabic,
      choices: [arabic, previous, next],
    };
  });
}

const FOUNDATION_LESSONS: Array<
  [number, BeginnerLessonKind, string, string, string, string, string[]]
> = [
  [2, "shape", "بـ ـبـ ـب ب", "Ba in four forms", "Ba can change shape when it connects.", "بـ ـبـ ـب ب", ["بـ ـبـ ـب ب", "تـ ـتـ ـت ت", "نـ ـنـ ـن ن"]],
  [2, "shape", "مـ ـمـ ـم م", "Meem in four forms", "Meem keeps its sound while its shape follows its position.", "مـ ـمـ ـم م", ["مـ ـمـ ـم م", "لـ ـلـ ـل ل", "هـ ـهـ ـه ه"]],
  [2, "shape", "عـ ـعـ ـع ع", "Ayn in four forms", "Some letters connect on both sides and some do not.", "عـ ـعـ ـع ع", ["عـ ـعـ ـع ع", "غـ ـغـ ـغ غ", "حـ ـحـ ـح ح"]],
  [2, "shape", "ا د ذ ر ز و", "Letters that do not join after themselves", "These letters connect from the right but not to the next letter.", "ا د ذ ر ز و", ["ا د ذ ر ز و", "ب ت ث ج ح خ", "س ش ص ض ط ظ"]],
  [3, "harakah", "بَ", "Fatha", "Fatha gives a short a sound.", "بَ", ["بَ", "بِ", "بُ"]],
  [3, "harakah", "بِ", "Kasra", "Kasra gives a short i sound.", "بِ", ["بِ", "بَ", "بُ"]],
  [3, "harakah", "بُ", "Damma", "Damma gives a short u sound.", "بُ", ["بُ", "بَ", "بِ"]],
  [3, "harakah", "تَ تُ بِ", "Mixing short vowels", "The mark changes the sound of the letter.", "تَ تُ بِ", ["تَ تُ بِ", "تِ تَ بُ", "بَ بِ تُ"]],
  [4, "tanween", "بً", "Fathatayn", "The double fatha adds an an sound at the end.", "بً", ["بً", "بٍ", "بٌ"]],
  [4, "tanween", "بٍ", "Kasratayn", "The double kasra adds an in sound at the end.", "بٍ", ["بٍ", "بً", "بٌ"]],
  [4, "tanween", "بٌ", "Dammatayn", "The double damma adds an un sound at the end.", "بٌ", ["بٌ", "بً", "بٍ"]],
  [5, "sukoon", "أَبْ", "Sukoon", "Sukoon means the letter has no short vowel after it.", "أَبْ", ["أَبْ", "أَبَ", "أَبِ"]],
  [5, "sukoon", "مِنْ", "Sukoon in a word", "Hold the first sound, then stop gently on Noon.", "مِنْ", ["مِنْ", "مَنَ", "مُنِ"]],
  [5, "sukoon", "قُلْ", "A Quranic sukoon example", "Qul ends with Lam carrying sukoon.", "قُلْ", ["قُلْ", "قُلَ", "قِلُ"]],
  [6, "shaddah", "بَّ", "Shaddah", "Shaddah doubles the consonant sound.", "بَّ", ["بَّ", "بَ", "بْ"]],
  [6, "shaddah", "رَبِّ", "Shaddah in a word", "Press the doubled Ba in Rabbi.", "رَبِّ", ["رَبِّ", "رَبِ", "رُبْ"]],
  [6, "shaddah", "إِنَّ", "Another shaddah example", "Read the Noon with a clear doubled sound.", "إِنَّ", ["إِنَّ", "إِنَ", "أَنْ"]],
  [7, "madd", "بَا", "Madd with Alif", "Alif can stretch the a sound.", "بَا", ["بَا", "بَ", "بُ"]],
  [7, "madd", "بُو", "Madd with Waw", "Waw can stretch the u sound.", "بُو", ["بُو", "بُ", "بِي"]],
  [7, "madd", "بِي", "Madd with Ya", "Ya can stretch the i sound.", "بِي", ["بِي", "بِ", "بُو"]],
  [8, "blend", "بَتَ", "Blend two sounds", "Read each short sound, then join them smoothly.", "بَتَ", ["بَتَ", "بِتِ", "بُتُ"]],
  [8, "blend", "مَنَ", "Blend three sounds", "Keep the rhythm even as the sounds join.", "مَنَ", ["مَنَ", "مِنْ", "مُنَ"]],
  [8, "blend", "كَتَبَ", "Read a simple word", "Move from sound to sound without stopping between every letter.", "كَتَبَ", ["كَتَبَ", "كُتِبَ", "قَتَلَ"]],
  [8, "blend", "سَمِعَ", "Read with changing vowels", "Notice how each harakah changes the next sound.", "سَمِعَ", ["سَمِعَ", "سُمِعَ", "سَمَعَ"]],
  [9, "word", "كِتَابٌ", "Kitaabun", "Read this short Quranic Arabic word with tanween.", "كِتَابٌ", ["كِتَابٌ", "كِتَابَ", "كُتُبٌ"]],
  [9, "word", "نُورٌ", "Noorun", "Read Noor with a long vowel and tanween.", "نُورٌ", ["نُورٌ", "نَرٌ", "نَوْرَ"]],
  [9, "word", "رَبِّي", "Rabbi", "Read the doubled Ba and long Ya together.", "رَبِّي", ["رَبِّي", "رَبِي", "رُبُو"]],
  [9, "word", "الْحَمْدُ", "Alhamdu", "Read this familiar Quranic word carefully.", "الْحَمْدُ", ["الْحَمْدُ", "الْحَمَدَ", "الْهِمْدُ"]],
  [9, "word", "الصَّلَاةُ", "As-salaatu", "Notice the connected letters and shaddah.", "الصَّلَاةُ", ["الصَّلَاةُ", "السَّلَامُ", "الصِّلَةُ"]],
  [10, "phrase", "بِسْمِ اللَّهِ", "Bismillah", "Read the phrase in two gentle parts.", "بِسْمِ اللَّهِ", ["بِسْمِ اللَّهِ", "رَبِّيَ اللَّهُ", "نُورُ الْقَلْبِ"]],
  [10, "phrase", "رَبِّيَ اللَّهُ", "Rabbi Allah", "Join the words without rushing.", "رَبِّيَ اللَّهُ", ["رَبِّيَ اللَّهُ", "بِسْمِ اللَّهِ", "نُورُ الْقَلْبِ"]],
  [10, "phrase", "الْحَمْدُ لِلَّهِ", "Alhamdu lillah", "Read this short Quranic phrase with calm rhythm.", "الْحَمْدُ لِلَّهِ", ["الْحَمْدُ لِلَّهِ", "الْحَمْدُ رَبِّي", "لِلَّهِ نُورٌ"]],
];

function foundationLessons(): BeginnerLesson[] {
  return FOUNDATION_LESSONS.map(
    ([level, kind, arabic, title, explanation, audioText, choices], index) => ({
      id: `foundation-${String(index + 1).padStart(2, "0")}`,
      level,
      order: index + 1,
      kind,
      title,
      arabic,
      transliteration: title,
      explanation,
      audioText,
      choices,
    }),
  );
}

export const BEGINNER_LESSONS: BeginnerLesson[] = [
  ...letterLessons(),
  ...foundationLessons(),
];

export const BEGINNER_LEVELS: BeginnerLevel[] = LEVEL_DEFINITIONS.map((level) => ({
  ...level,
  lessonIds: BEGINNER_LESSONS.filter((lesson) => lesson.level === level.level).map(
    (lesson) => lesson.id,
  ),
}));

export function getBeginnerLesson(id: string): BeginnerLesson | undefined {
  return BEGINNER_LESSONS.find((lesson) => lesson.id === id);
}

export function getBeginnerLevel(level: number): BeginnerLevel | undefined {
  return BEGINNER_LEVELS.find((item) => item.level === level);
}

export function getBeginnerLevelLessons(level: number): BeginnerLesson[] {
  return BEGINNER_LESSONS.filter((lesson) => lesson.level === level);
}

export function beginnerLessonCount(): number {
  return BEGINNER_LESSONS.length;
}