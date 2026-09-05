import type { TranslationLanguage } from "./api";

/**
 * The Quran translation providers do not consistently render the divine name.
 * Explicit written forms of Allah are always normalized at the display/audio
 * boundary. Generic words are only eligible when the original Arabic ayah
 * contains Allah's proper name; semantic words such as Rabb/Lord remain
 * untouched. Translation data itself is never changed.
 */
const EXPLICIT_DIVINE_NAME_PATTERN =
  /(?<![\p{L}\p{M}])(?:allah|allaah|allāh|الله|اللّٰه|اللَّه|اللَّه|اللہ|अल्लाह|अल्ला|আল্লাহ|আল্লা|Аллах|аллах|Аллоҳ|аллоҳ|Аллаһ|аллаһ|Алла|алла|安拉|阿拉|アッラー|알라|อัลลอฮ์|அல்லாஹ்|అల్లాహ్|അല്ലാഹു|ਅੱਲਾਹ)(?![\p{L}\p{M}])/giu;

const ARABIC_ALLAH_PATTERN = /ل[\p{M}\u0670]*ل[\p{M}\u0670]*ه/u;
const CONTEXTUAL_DIVINE_NAME_PATTERN =
  /(?<![\p{L}\p{M}])(?:God|خدا)(?![\p{L}\p{M}])/giu;

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
  sourceArabic = "",
): string {
  if (!text) return text;

  let localized = text.replace(
    EXPLICIT_DIVINE_NAME_PATTERN,
    LOCALIZED_DIVINE_NAMES[language],
  );

  // Only a clear Allah token in the original Arabic source authorizes a
  // generic provider translation ("God"/"خدا") to become the proper name.
  // Replace at most as many generic tokens as the source has Allah tokens so
  // semantic repetitions are not silently rewritten.
  let properNameSlots =
    sourceArabic.match(new RegExp(ARABIC_ALLAH_PATTERN.source, "gu"))?.length ?? 0;
  if (properNameSlots === 0) return localized;

  return localized.replace(CONTEXTUAL_DIVINE_NAME_PATTERN, (match) => {
    if (properNameSlots <= 0) return match;
    properNameSlots -= 1;
    return LOCALIZED_DIVINE_NAMES[language];
  });
}