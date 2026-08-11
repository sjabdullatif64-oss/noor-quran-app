import type { TranslationLanguage } from "./api";

/**
 * The Quran translation providers do not consistently render the divine name.
 * Keep this as a display-only normalization: replace explicit written forms of
 * Allah's name, but never translate semantic words such as "God" or "Lord".
 */
/**
 * Providers sometimes return the Divine Name in a script that does not match
 * the selected translation (for example, "Allah" in an Urdu translation).
 * Match only explicit written forms of the name here. In particular, do not
 * match semantic translations such as "God", "Lord", or "خدا".
 */
const DIVINE_NAME_PATTERN =
  /(?<![\p{L}\p{M}])(?:allah|allaah|allāh|الله|اللّٰه|اللَّه|اللَّه|اللہ|अल्लाह|अल्ला|আল্লাহ|আল্লা|Аллах|аллах|Аллоҳ|аллоҳ|Аллаһ|аллаһ|Алла|алла|安拉|阿拉|アッラー|알라|อัลลอฮ์|அல்லாஹ்|అల్లాహ్|അല്ലാഹു|ਅੱਲਾਹ)(?![\p{L}\p{M}])/giu;

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
  return text.replace(DIVINE_NAME_PATTERN, LOCALIZED_DIVINE_NAMES[language]);
}
