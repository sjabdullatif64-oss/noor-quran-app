import { TTS_LANG_CODES } from "./translation-language-metadata";
import type { TranslationLanguage } from "./api";

const scriptRules: Array<{ language: TranslationLanguage; pattern: RegExp }> = [
  { language: "urdu", pattern: /[\u0679\u0686\u0688\u0691\u0692\u0693\u0696\u0698\u06a9\u06af\u06be\u06c1\u06d2]/ },
  { language: "arabic", pattern: /[\u0600-\u06ff]/ },
  { language: "hindi", pattern: /[\u0900-\u097f]/ },
  { language: "bengali", pattern: /[\u0980-\u09ff]/ },
  { language: "punjabi", pattern: /[\u0a00-\u0a7f]/ },
  { language: "tamil", pattern: /[\u0b80-\u0bff]/ },
  { language: "telugu", pattern: /[\u0c00-\u0c7f]/ },
  { language: "malayalam", pattern: /[\u0d00-\u0d7f]/ },
  { language: "thai", pattern: /[\u0e00-\u0e7f]/ },
  { language: "korean", pattern: /[\uac00-\ud7af]/ },
  { language: "japanese", pattern: /[\u3040-\u30ff]/ },
  { language: "chinese", pattern: /[\u3400-\u9fff]/ },
  { language: "russian", pattern: /[\u0400-\u04ff]/ },
];

const wordSignals: Array<{ language: TranslationLanguage; words: string[] }> = [
  { language: "english", words: [" the ", " and ", " is ", " are ", " this ", " that ", " with ", " for ", " guidance ", " quran "] },
  { language: "french", words: [" le ", " la ", " les ", " des ", " une ", " que ", " pour ", " est "] },
  { language: "spanish", words: [" el ", " la ", " los ", " las ", " una ", " que ", " para ", " está "] },
  { language: "german", words: [" der ", " die ", " das ", " den ", " und ", " ist ", " für ", " nicht "] },
  { language: "italian", words: [" il ", " gli ", " una ", " che ", " per ", " della ", " non ", " è "] },
  { language: "portuguese", words: [" o ", " os ", " uma ", " que ", " para ", " não ", " dos ", " está "] },
  { language: "indonesian", words: [" yang ", " dan ", " ini ", " untuk ", " dengan ", " tidak ", " adalah "] },
  { language: "malay", words: [" yang ", " dan ", " ini ", " untuk ", " dengan ", " tidak ", " ialah "] },
  { language: "turkish", words: [" ve ", " bir ", " için ", " olan ", " değil ", " ile ", " bu "] },
  { language: "dutch", words: [" de ", " het ", " een ", " van ", " voor ", " niet ", " zijn "] },
  { language: "vietnamese", words: [" và ", " một ", " của ", " trong ", " không ", " cho ", " là "] },
  { language: "swahili", words: [" na ", " ya ", " kwa ", " katika ", " ni ", " hii ", " kutoka "] },
  { language: "somali", words: [" iyo ", " waa ", " in ", " ku ", " ee ", " aan ", " sida "] },
  { language: "hausa", words: [" da ", " shi ", " wannan ", " cikin ", " ne ", " don ", " ana "] },
  { language: "uzbek", words: [" va ", " uchun ", " bu ", " bilan ", " emas ", " ham ", " bir "] },
  { language: "kazakh", words: [" және ", " үшін ", " бұл ", " бір ", " емес ", " мен ", " да "] },
];

function normalizeLanguage(value?: string): TranslationLanguage | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  const match = (Object.keys(TTS_LANG_CODES) as TranslationLanguage[]).find((language) =>
    normalized === language || normalized.startsWith(`${language}-`) || normalized === TTS_LANG_CODES[language].toLowerCase(),
  );
  return match ?? null;
}

/**
 * Detects the language of the text that will actually be spoken.
 * The response metadata is only a fallback for Latin-script languages where
 * script detection alone cannot distinguish languages reliably.
 */
export function detectQuranAssistantResponseLanguage(text: string, fallback?: string): TranslationLanguage {
  const sample = ` ${text.toLocaleLowerCase()} `;
  const scripted = scriptRules.find(({ pattern }) => pattern.test(text));
  if (scripted) return scripted.language;

  let best: { language: TranslationLanguage; score: number } | null = null;
  for (const signal of wordSignals) {
    const score = signal.words.reduce((total, word) => total + (sample.split(word).length - 1), 0);
    if (score > (best?.score ?? 0)) best = { language: signal.language, score };
  }
  if (best && best.score > 0) return best.language;
  return normalizeLanguage(fallback) ?? "english";
}

export function getQuranAssistantSpeechLanguage(text: string, fallback?: string): string {
  return TTS_LANG_CODES[detectQuranAssistantResponseLanguage(text, fallback)];
}