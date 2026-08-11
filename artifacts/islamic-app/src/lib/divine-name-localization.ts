import type { TranslationLanguage } from "./api";

/**
 * The Quran translation providers do not consistently render the divine name.
 * Keep this as a display-only normalization: replace explicit written forms of
 * Allah's name, plus only language-specific established aliases. Semantic
 * translations such as English "God" and "Lord" remain unchanged.
 */
const DIVINE_NAME_PATTERN =
  /(?<![\p{L}\p{M}])(?:allah|allaah|allāh|الله|اللّٰه|اللَّه|اللَّه|اللہ|अल्लाह|अल्ला|আল্লাহ|আল্লা|Аллах|аллах|Аллоҳ|аллоҳ|Аллаһ|аллаһ|Алла|алла|安拉|阿拉|アッラー|알라|อัลลอฮ์|அல்லாஹ்|అల్లాహ్|അല്ലാഹു|ਅੱਲਾਹ)(?![\p{L}\p{M}])/giu;

/**
 * Urdu editions also commonly render the Divine Name as the standalone word
 * "خدا". This alias is intentionally scoped to Urdu and uses letter
 * boundaries so words such as "خداوند" are not changed.
 */
const LANGUAGE_SPECIFIC_DIVINE_NAME_PATTERNS: Partial<
  Record<TranslationLanguage, RegExp>
> = {
  urdu: /(?<![\p{L}\p{M}])خدا(?![\p{L}\p{M}])/gu,
};

export const LOCALIZED_DIVINE_NAMES: Record<TranslationLanguage, string> = {
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
  if (!text) return text;
  const localized = text.replace(DIVINE_NAME_PATTERN, LOCALIZED_DIVINE_NAMES[language]);
  const languageSpecificPattern = LANGUAGE_SPECIFIC_DIVINE_NAME_PATTERNS[language];
  return languageSpecificPattern
    ? localized.replace(languageSpecificPattern, LOCALIZED_DIVINE_NAMES[language])
    : localized;
}
