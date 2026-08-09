import type { TranslationLanguage } from "./api";

/**
 * The Quran translation providers do not consistently render the divine name.
 * Keep this as a display-only normalization: replace explicit written forms of
 * Allah's name, but never translate semantic words such as "God" or "Lord".
 */
const DIVINE_NAME_PATTERNS: Partial<Record<TranslationLanguage, RegExp>> = {
  arabic: /(?:allah|allaah|allāh|الله|اللّٰه|اللہ)/giu,
  urdu: /(?:allah|allaah|allāh|الله|اللّٰه|اللہ)/giu,
  english: /(?:allah|allaah|allāh)/giu,
  sindhi: /(?:allah|allaah|allāh|الله|اللّٰه|اللہ)/giu,
  hindi: /(?:allah|allaah|allāh|अल्लाह|अल्ला)/giu,
  turkish: /(?:allah|allaah|allāh)/giu,
  bengali: /(?:allah|allaah|allāh|আল্লাহ|আল্লা)/giu,
  indonesian: /(?:allah|allaah|allāh)/giu,
  french: /(?:allah|allaah|allāh)/giu,
  spanish: /(?:allah|allaah|allāh)/giu,
  malay: /(?:allah|allaah|allāh)/giu,
  persian: /(?:allah|allaah|allāh|الله|اللّٰه|اللہ)/giu,
  german: /(?:allah|allaah|allāh)/giu,
  portuguese: /(?:allah|allaah|allāh)/giu,
  russian: /(?:allah|allaah|allāh|аллах)/giu,
  chinese: /(?:allah|allaah|allāh|安拉|阿拉)/giu,
  japanese: /(?:allah|allaah|allāh|アッラー)/giu,
  korean: /(?:allah|allaah|allāh|알라)/giu,
  swahili: /(?:allah|allaah|allāh)/giu,
  tamil: /(?:allah|allaah|allāh|அல்லாஹ்)/giu,
  telugu: /(?:allah|allaah|allāh|అల్లాహ్)/giu,
  malayalam: /(?:allah|allaah|allāh|അല്ലാഹു)/giu,
  punjabi: /(?:allah|allaah|allāh|ਅੱਲਾਹ)/giu,
  italian: /(?:allah|allaah|allāh)/giu,
  dutch: /(?:allah|allaah|allāh)/giu,
  thai: /(?:allah|allaah|allāh|อัลลอฮ์)/giu,
  vietnamese: /(?:allah|allaah|allāh)/giu,
  azerbaijani: /(?:allah|allaah|allāh)/giu,
  bosnian: /(?:allah|allaah|allāh)/giu,
  somali: /(?:allah|allaah|allāh)/giu,
  hausa: /(?:allah|allaah|allāh)/giu,
  uzbek: /(?:allah|allaah|allāh|аллах|Аллоҳ)/giu,
  kazakh: /(?:allah|allaah|allāh|аллах|Аллаһ|Алла)/giu,
};

const LOCALIZED_DIVINE_NAMES: Record<TranslationLanguage, string> = {
  arabic: "الله",
  urdu: "اللہ",
  english: "Allah",
  sindhi: "الله",
  hindi: "अल्लाह",
  turkish: "Allah",
  bengali: "আল্লাহ",
  indonesian: "Allah",
  french: "Allah",
  spanish: "Allah",
  malay: "Allah",
  persian: "الله",
  german: "Allah",
  portuguese: "Allah",
  russian: "Аллах",
  chinese: "安拉",
  japanese: "アッラー",
  korean: "알라",
  swahili: "Allah",
  tamil: "அல்லாஹ்",
  telugu: "అల్లాహ్",
  malayalam: "അല്ലാഹു",
  punjabi: "ਅੱਲਾਹ",
  italian: "Allah",
  dutch: "Allah",
  thai: "อัลลอฮ์",
  vietnamese: "Allah",
  azerbaijani: "Allah",
  bosnian: "Allah",
  somali: "Allah",
  hausa: "Allah",
  uzbek: "Аллоҳ",
  kazakh: "Аллаһ",
};

export function localizeDivineName(
  language: TranslationLanguage,
  text: string,
): string {
  const pattern = DIVINE_NAME_PATTERNS[language];
  if (!pattern || !text) return text;
  return text.replace(pattern, LOCALIZED_DIVINE_NAMES[language]);
}