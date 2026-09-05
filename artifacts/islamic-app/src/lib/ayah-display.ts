import { useSyncExternalStore } from "react";
import { localizeDivineName } from "./divine-name-localization";
import type { TranslationLanguage } from "./api";

// ── Storage keys ──────────────────────────────────────────────────────────────
const EXPLANATORY_KEY = "noor-show-explanatory";
const TRANSLITERATION_KEY = "noor-show-transliteration";
const TRANSLATION_KEY = "noor-show-translation";

// ── Tiny pub/sub so both readers + the menu re-render instantly on change ─────
type Listener = () => void;
let listeners: Listener[] = [];

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeAyahDisplay(fn: Listener): () => void {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

// ── Show / Hide explanatory (bracketed) words in translation ──────────────────
// Default = show, to keep the original translation style unchanged out of the box.
export function getShowExplanatory(): boolean {
  const raw = localStorage.getItem(EXPLANATORY_KEY);
  return raw === null ? true : raw === "1";
}

export function setShowExplanatory(show: boolean): void {
  localStorage.setItem(EXPLANATORY_KEY, show ? "1" : "0");
  emit();
}

function getBooleanSetting(key: string, fallback = true): boolean {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : raw === "1";
}

export function getShowTransliteration(): boolean {
  return getBooleanSetting(TRANSLITERATION_KEY);
}

export function setShowTransliteration(show: boolean): void {
  localStorage.setItem(TRANSLITERATION_KEY, show ? "1" : "0");
  emit();
}

export function getShowTranslation(): boolean {
  return getBooleanSetting(TRANSLATION_KEY);
}

export function setShowTranslation(show: boolean): void {
  localStorage.setItem(TRANSLATION_KEY, show ? "1" : "0");
  emit();
}

/**
 * Strip parenthetical explanatory insertions (e.g. Urdu jalandhry-style
 * "(اپنے مقدمات)" asides) from translation text. Display-layer only —
 * never call this against stored/source data, only at render time, so
 * audio (TTS) playback and saved bookmarks/favorites keep the original text.
 */
export function stripExplanatory(text: string): string {
  if (!text) return text;
  return text.replace(/\s*\([^()]*\)/g, "").replace(/\s{2,}/g, " ").trim();
}

/** Apply the current show/hide-explanatory-words setting to translation text
 *  for display purposes (WYSIWYG — use this output for Share/Copy too). */
export function applyExplanatorySetting(text: string): string {
  return getShowExplanatory() ? text : stripExplanatory(text);
}

/**
 * The single display boundary for Quran translation text.
 *
 * Translation data remains untouched in API responses, offline packs, query
 * caches, and saved bookmarks/favorites. Display and translation-audio text
 * are normalized only at their respective output boundaries.
 */
export function applyTranslationDisplay(
  language: TranslationLanguage,
  text: string,
  sourceArabic = "",
): string {
  return applyExplanatorySetting(localizeDivineName(language, text, sourceArabic));
}

/** Use the same proper-name normalization for translation TTS input. */
export function applyTranslationAudio(
  language: TranslationLanguage,
  text: string,
  sourceArabic = "",
): string {
  return localizeDivineName(language, text, sourceArabic);
}

type TransliterationMap = Record<string, string>;

/**
 * The bundled transliteration is intentionally stored once in Latin script.
 * This display-only map lets the same phonetic reading be shown in the
 * selected language's established writing system without changing the Arabic
 * Quran text, translation data, cache records, or audio/TTS input.
 */
const TRANSLITERATION_WORDS: Partial<Record<TranslationLanguage, TransliterationMap>> = {
  arabic: {
    qul: "قل",
    huwa: "هو",
    allahu: "الله",
    ahad: "أحد",
    bismillaahir: "بسم الله",
    bismillahir: "بسم الله",
    rahmaanir: "الرحمن",
    raheem: "الرحيم",
    alhamdu: "الحمد",
    lillaahi: "لله",
    rabbil: "رب",
    aalameen: "العالمين",
    "ar-rahmaanir-raheem": "الرحمن الرحيم",
  },
  urdu: {
    qul: "قل",
    huwa: "ہو",
    allahu: "اللہ",
    ahad: "احد",
    bismillaahir: "بسم اللہ",
    bismillahir: "بسم اللہ",
    rahmaanir: "الرحمن",
    raheem: "الرحیم",
    alhamdu: "الحمد",
    lillaahi: "للہ",
    rabbil: "رب",
    aalameen: "العالمین",
    "ar-rahmaanir-raheem": "الرحمن الرحیم",
  },
  sindhi: {
    qul: "قل",
    huwa: "هو",
    allahu: "الله",
    ahad: "احد",
    bismillaahir: "بسم الله",
    bismillahir: "بسم الله",
    rahmaanir: "الرحمن",
    raheem: "الرحيم",
    alhamdu: "الحمد",
    lillaahi: "لله",
    rabbil: "رب",
    aalameen: "العالمين",
    "ar-rahmaanir-raheem": "الرحمن الرحيم",
  },
  persian: {
    qul: "قل",
    huwa: "او",
    allahu: "الله",
    ahad: "احد",
    bismillaahir: "بسم الله",
    bismillahir: "بسم الله",
    rahmaanir: "الرحمن",
    raheem: "الرحیم",
    alhamdu: "الحمد",
    lillaahi: "لله",
    rabbil: "رب",
    aalameen: "العالمین",
    "ar-rahmaanir-raheem": "الرحمن الرحیم",
  },
  hindi: {
    qul: "कुल",
    huwa: "हुवा",
    allahu: "अल्लाहु",
    ahad: "अहद",
    bismillaahir: "बिस्मिल्लाह",
    bismillahir: "बिस्मिल्लाह",
    rahmaanir: "रहमानिर",
    raheem: "रहीम",
    alhamdu: "अल्हम्दु",
    lillaahi: "लिल्लाही",
    rabbil: "रब्बिल",
    aalameen: "आलमीन",
    "ar-rahmaanir-raheem": "अर-रहमानिर-रहीम",
  },
  bengali: {
    qul: "কুল",
    huwa: "হুয়া",
    allahu: "আল্লাহু",
    ahad: "আহাদ",
    bismillaahir: "বিসমিল্লাহ",
    bismillahir: "বিসমিল্লাহ",
    rahmaanir: "রহমানির",
    raheem: "রহিম",
    alhamdu: "আলহামদু",
    lillaahi: "লিল্লাহি",
    rabbil: "রব্বিল",
    aalameen: "আলামীন",
    "ar-rahmaanir-raheem": "আর-রহমানির-রহিম",
  },
  punjabi: {
    qul: "ਕੁਲ",
    huwa: "ਹੁਵਾ",
    allahu: "ਅੱਲਾਹੁ",
    ahad: "ਅਹਦ",
    bismillaahir: "ਬਿਸਮਿੱਲਾਹ",
    bismillahir: "ਬਿਸਮਿੱਲਾਹ",
    rahmaanir: "ਰਹਮਾਨਿਰ",
    raheem: "ਰਹੀਮ",
    alhamdu: "ਅਲਹਮਦੁ",
    lillaahi: "ਲਿੱਲਾਹੀ",
    rabbil: "ਰੱਬਿਲ",
    aalameen: "ਆਲਮੀਨ",
    "ar-rahmaanir-raheem": "ਅਰ-ਰਹਮਾਨਿਰ-ਰਹੀਮ",
  },
};

const SCRIPT_LANGUAGES = new Set<TranslationLanguage>([
  "arabic",
  "urdu",
  "sindhi",
  "persian",
  "hindi",
  "bengali",
  "punjabi",
]);

const ARABIC_SCRIPT_PHONEMES: Array<[string, string]> = [
  ["ṭ", "ط"], ["ḍ", "ض"], ["ẓ", "ظ"], ["ṣ", "ص"],
  ["th", "ث"], ["dh", "ذ"], ["kh", "خ"], ["gh", "غ"],
  ["sh", "ش"], ["ch", "چ"], ["aa", "ا"], ["ee", "ی"],
  ["ii", "ی"], ["oo", "و"], ["uu", "و"],
  ["b", "ب"], ["p", "پ"], ["t", "ت"], ["j", "ج"], ["d", "د"],
  ["r", "ر"], ["z", "ز"], ["s", "س"], ["f", "ف"], ["q", "ق"],
  ["k", "ک"], ["g", "گ"], ["l", "ل"], ["m", "م"], ["n", "ن"],
  ["h", "ہ"], ["w", "و"], ["y", "ی"], ["a", ""], ["i", ""],
  ["u", ""], ["o", ""], ["e", ""], ["'", ""], ["-", ""],
];

const INDIC_PHONEMES: Record<
  "hindi" | "bengali" | "punjabi",
  Array<[string, string]>
> = {
  hindi: [
    ["ṭ", "ट"], ["ḍ", "ड़"], ["ẓ", "ज़"], ["ṣ", "स"],
    ["th", "थ"], ["dh", "ध"], ["kh", "ख़"], ["gh", "ग़"],
    ["sh", "श"], ["ch", "च"], ["aa", "ा"], ["ee", "ी"],
    ["ii", "ी"], ["oo", "ू"], ["uu", "ू"], ["a", "अ"],
    ["i", "इ"], ["u", "उ"], ["o", "ओ"], ["e", "ए"],
    ["b", "ब"], ["p", "प"], ["t", "त"], ["j", "ज"], ["d", "द"],
    ["r", "र"], ["z", "ज़"], ["s", "स"], ["f", "फ़"], ["q", "क़"],
    ["k", "क"], ["g", "ग"], ["l", "ल"], ["m", "म"], ["n", "न"],
    ["h", "ह"], ["w", "व"], ["y", "य"], ["'", ""], ["-", "‑"],
  ],
  bengali: [
    ["ṭ", "ট"], ["ḍ", "ড়"], ["ẓ", "জ়"], ["ṣ", "স"],
    ["th", "থ"], ["dh", "ধ"], ["kh", "খ"], ["gh", "ঘ"],
    ["sh", "শ"], ["ch", "চ"], ["aa", "া"], ["ee", "ী"],
    ["ii", "ী"], ["oo", "ূ"], ["uu", "ূ"], ["a", "অ"],
    ["i", "ই"], ["u", "উ"], ["o", "ও"], ["e", "এ"],
    ["b", "ব"], ["p", "প"], ["t", "ত"], ["j", "জ"], ["d", "দ"],
    ["r", "র"], ["z", "জ়"], ["s", "স"], ["f", "ফ"], ["q", "ক"],
    ["k", "ক"], ["g", "গ"], ["l", "ল"], ["m", "ম"], ["n", "ন"],
    ["h", "হ"], ["w", "ও"], ["y", "য়"], ["'", ""], ["-", "‑"],
  ],
  punjabi: [
    ["ṭ", "ਟ"], ["ḍ", "ਡ"], ["ẓ", "ਜ਼"], ["ṣ", "ਸ"],
    ["th", "ਥ"], ["dh", "ਧ"], ["kh", "ਖ"], ["gh", "ਘ"],
    ["sh", "ਸ਼"], ["ch", "ਚ"], ["aa", "ਾ"], ["ee", "ੀ"],
    ["ii", "ੀ"], ["oo", "ੂ"], ["uu", "ੂ"], ["a", "ਅ"],
    ["i", "ਇ"], ["u", "ਉ"], ["o", "ਓ"], ["e", "ਏ"],
    ["b", "ਬ"], ["p", "ਪ"], ["t", "ਤ"], ["j", "ਜ"], ["d", "ਦ"],
    ["r", "ਰ"], ["z", "ਜ਼"], ["s", "ਸ"], ["f", "ਫ"], ["q", "ਕ"],
    ["k", "ਕ"], ["g", "ਗ"], ["l", "ਲ"], ["m", "ਮ"], ["n", "ਨ"],
    ["h", "ਹ"], ["w", "ਵ"], ["y", "ਯ"], ["'", ""], ["-", "‑"],
  ],
};

function replacePhonemes(
  value: string,
  phonemes: Array<[string, string]>,
): string {
  let result = value;
  for (const [source, target] of phonemes) {
    result = result.replaceAll(source, target);
  }
  return result;
}

function fallbackTransliteration(
  language: TranslationLanguage,
  word: string,
): string {
  const normalized = transliterationKey(word);
  if (language === "hindi" || language === "bengali" || language === "punjabi") {
    return replacePhonemes(normalized, INDIC_PHONEMES[language]);
  }
  return replacePhonemes(normalized, ARABIC_SCRIPT_PHONEMES);
}

function transliterationKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/^'+/u, "")
    .trim();
}

function displayTransliterationWord(
  language: TranslationLanguage,
  word: string,
): string {
  const match = word.match(/^([^A-Za-zĀ-žāīūḍḥṣṭẓṅñ]*)([A-Za-zĀ-žāīūḍḥṣṭẓṅñ][A-Za-zĀ-žāīūḍḥṣṭẓṅ'’-]*)([^A-Za-zĀ-žāīūḍḥṣṭẓṅñ]*)$/u);
  if (!match) return word;

  const [, prefix, core, suffix] = match;
  const mapped = TRANSLITERATION_WORDS[language]?.[transliterationKey(core)];
  const displayWord = mapped ?? fallbackTransliteration(language, core);
  // A leading apostrophe marks an Arabic pronunciation convention (for
  // example, "'aalameen"), not punctuation that belongs in the target script.
  const displayPrefix = mapped ? prefix.replace(/^'+/u, "") : prefix;
  return `${displayPrefix}${displayWord}${suffix}`;
}

/**
 * Display the existing Arabic-pronunciation transliteration in the selected
 * language's script. Latin-script languages intentionally keep the source
 * transliteration unchanged because their established script is Latin.
 */
export function applyTransliterationDisplay(
  language: TranslationLanguage,
  text: string,
): string {
  if (!text || !SCRIPT_LANGUAGES.has(language)) return text;

  const phrase = TRANSLITERATION_WORDS[language]?.[transliterationKey(text)];
  if (phrase) return phrase;

  return text
    .split(/(\s+)/u)
    .map((part) => displayTransliterationWord(language, part))
    .join("");
}

// ── React hook — live-updates both readers when the menu changes a setting ────
// Note: text zoom is intentionally NOT part of this shared/persisted store —
// see `useAyahPinchZoom` (src/hooks/use-pinch-zoom.ts), which is local,
// in-memory-only state per reader page so it never persists and always
// resets to default when the reader/app is reopened.
export function useAyahDisplaySettings(): {
  showExplanatory: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
} {
  const showExplanatory = useSyncExternalStore(subscribeAyahDisplay, getShowExplanatory, getShowExplanatory);
  const showTransliteration = useSyncExternalStore(
    subscribeAyahDisplay,
    getShowTransliteration,
    getShowTransliteration,
  );
  const showTranslation = useSyncExternalStore(
    subscribeAyahDisplay,
    getShowTranslation,
    getShowTranslation,
  );
  return { showExplanatory, showTransliteration, showTranslation };
}
