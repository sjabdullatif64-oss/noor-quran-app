import type { TranslationLanguage } from "./api";

/**
 * BCP-47 tags used by Teacher feedback TTS.
 *
 * Kept in a browser-independent module so recognition/copy tests can validate
 * every supported translation without evaluating Vite-only import.meta.env code.
 */
export const TTS_LANG_CODES: Record<TranslationLanguage, string> = {
  arabic:      "ar-SA",
  urdu:       "ur-PK",
  english:    "en-US",
  sindhi:     "sd-PK",
  hindi:      "hi-IN",
  turkish:    "tr-TR",
  bengali:    "bn-IN",
  indonesian: "id-ID",
  french:     "fr-FR",
  spanish:    "es-ES",
  malay:      "ms-MY",
  persian:    "fa-IR",
  german:     "de-DE",
  portuguese: "pt-PT",
  russian:    "ru-RU",
  chinese:    "zh-CN",
  japanese:   "ja-JP",
  korean:     "ko-KR",
  swahili:    "sw-KE",
  tamil:      "ta-IN",
  telugu:     "te-IN",
  malayalam:  "ml-IN",
  punjabi:    "pa-IN",
  italian:    "it-IT",
  dutch:      "nl-NL",
  thai:       "th-TH",
  vietnamese: "vi-VN",
  azerbaijani:"az-AZ",
  bosnian:    "bs-BA",
  somali:     "so-SO",
  hausa:      "ha-NG",
  uzbek:      "uz-UZ",
  kazakh:     "kk-KZ",
};