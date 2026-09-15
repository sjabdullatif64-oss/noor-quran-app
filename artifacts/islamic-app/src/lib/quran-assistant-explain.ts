import type { QuranAssistantContext } from "./quran-assistant-context";
import type { QuranAssistantMessage } from "./quran-assistant-storage";
import type { TranslationLanguage } from "./api";

export const EXPLAIN_THIS_AYAH_QUESTION = "Explain this Ayah";

/**
 * The Explain action always submits the stable English instruction above.
 * These are presentation labels only, following the Quran Reader's selected
 * translation language.
 */
export const EXPLAIN_THIS_AYAH_LABELS: Record<TranslationLanguage, string> = {
  arabic: "اشرح هذه الآية",
  urdu: "اس آیت کی وضاحت کریں",
  english: "Explain this Ayah",
  sindhi: "هن آيت جي وضاحت ڪريو",
  hindi: "इस आयत की व्याख्या करें",
  turkish: "Bu ayeti açıklayın",
  bengali: "এই আয়াতের ব্যাখ্যা করুন",
  indonesian: "Jelaskan Ayat Ini",
  french: "Expliquer cette ayah",
  spanish: "Explicar esta aleya",
  malay: "Jelaskan Ayat Ini",
  persian: "این آیه را توضیح دهید",
  german: "Diesen Vers erklären",
  portuguese: "Explicar esta Ayah",
  russian: "Объяснить этот аят",
  chinese: "解释这节经文",
  japanese: "このアーヤを説明する",
  korean: "이 아야를 설명하기",
  swahili: "Eleza Aya Hii",
  tamil: "இந்த வசனத்தை விளக்கவும்",
  telugu: "ఈ ఆయత్‌ను వివరించండి",
  malayalam: "ഈ ആയത്ത് വിശദീകരിക്കുക",
  punjabi: "ਇਸ ਆਇਤ ਦੀ ਵਿਆਖਿਆ ਕਰੋ",
  italian: "Spiega questo versetto",
  dutch: "Leg deze ayah uit",
  thai: "อธิบายอายะฮ์นี้",
  vietnamese: "Giải thích Ayah này",
  azerbaijani: "Bu ayəni izah edin",
  bosnian: "Objasnite ovaj ajet",
  somali: "Sharax Aayaddan",
  hausa: "Bayyana Wannan Aya",
  uzbek: "Bu oyatni tushuntiring",
  kazakh: "Осы аятты түсіндіріңіз",
};

export function getExplainThisAyahLabel(language: TranslationLanguage): string {
  return EXPLAIN_THIS_AYAH_LABELS[language] ?? EXPLAIN_THIS_AYAH_LABELS.english;
}

export type ExplainAyahRequestState = {
  inFlight: boolean;
  completedContextKey: string | null;
  successfulUsageCount: number;
};

export function createExplainAyahRequestState(): ExplainAyahRequestState {
  return {
    inFlight: false,
    completedContextKey: null,
    successfulUsageCount: 0,
  };
}

function getContextKey(context: QuranAssistantContext): string {
  return `${context.surahNumber}:${context.ayahNumber}`;
}

export function beginExplainAyahRequest(
  state: ExplainAyahRequestState,
  context: QuranAssistantContext,
): { state: ExplainAyahRequestState; shouldSend: boolean } {
  const contextKey = getContextKey(context);
  if (state.inFlight || state.completedContextKey === contextKey) {
    return { state, shouldSend: false };
  }
  return {
    state: {
      ...state,
      inFlight: true,
    },
    shouldSend: true,
  };
}

export function finishExplainAyahRequest(
  state: ExplainAyahRequestState,
  context: QuranAssistantContext,
  succeeded: boolean,
): ExplainAyahRequestState {
  return {
    inFlight: false,
    completedContextKey: succeeded ? getContextKey(context) : state.completedContextKey,
    successfulUsageCount: succeeded ? state.successfulUsageCount + 1 : state.successfulUsageCount,
  };
}

export function hasCompletedExplainAyahResponse(
  messages: QuranAssistantMessage[],
  context: QuranAssistantContext,
): boolean {
  const contextKey = getContextKey(context);
  return messages.some((message, index) => (
    message.role === "assistant"
    && messages.slice(0, index).some((previous) => (
      previous.role === "user"
      && previous.text?.trim() === EXPLAIN_THIS_AYAH_QUESTION
      && previous.ayahContext
      && getContextKey(previous.ayahContext) === contextKey
    ))
  ));
}