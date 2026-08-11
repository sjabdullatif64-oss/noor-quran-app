import type { TranslationLanguage } from "./api";

/**
 * The Quran translation providers do not consistently render the divine name.
 * Keep this as a display-only normalization of written forms and translated
 * aliases for Allah's proper name. Translation data remains untouched; only
 * text crossing the Quran display boundary is normalized.
 */
const DIVINE_NAME_PATTERN =
  /(?<![\p{L}\p{M}])(?:allah|allaah|allāh|الله|اللّٰه|اللَّه|اللَّه|اللہ|अल्लाह|अल्ला|भगवान|ईश्वर|আল্লাহ|আল্লা|ভগবান|ঈশ্বর|Аллах|аллах|Аллоҳ|аллоҳ|Аллаһ|аллаһ|Алла|алла|Бог|бог|Господь|господь|安拉|阿拉|上帝|アッラー|알라|하나님|อัลลอฮ์|พระเจ้า|அல்லாஹ்|கடவுள்|இறைவன்|అల్లాహ్|దేవుడు|ప్రభువు|അല്ലാഹു|ദൈവം|കർത്താവ്|ਅੱਲਾਹ|ਰੱਬ|ਪਰਮਾਤਮਾ|God|Lord|Tanrı|Rab|Tuhan|Dieu|Seigneur|Dios|Señor|Gott|Herr|Deus|Senhor|Dio|Signore|Heer|Mungu|Bwana|Ilaah|Eebbe|خداوند|خدائے|خدا|پروردگار|رب|Худо|Құдай|Bog|Gospod)(?![\p{L}\p{M}])/giu;

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
