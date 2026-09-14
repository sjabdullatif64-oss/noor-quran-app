export interface QuranAssistantContext {
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  ayahNumber: number;
  arabic: string;
  translation: string;
  transliteration?: string;
  audioGlobalNumber: number;
}

export function buildQuranAssistantRequestText(context: QuranAssistantContext | null, question: string): string {
  const text = question.trim();
  if (!context) return text;
  return [
    "The user selected this verified Quran Ayah from the Quran Reader:",
    `Surah: ${context.surahEnglishName} (${context.surahNumber})`,
    `Ayah number: ${context.ayahNumber}`,
    `Verified Arabic text: ${context.arabic}`,
    "",
    `User's question: ${text}`,
  ].join("\n");
}

export function buildQuranAssistantRequestPayload(
  context: QuranAssistantContext | null,
  question: string,
): { question: string; ayahContext?: QuranAssistantContext } {
  const payload: { question: string; ayahContext?: QuranAssistantContext } = {
    question: question.trim(),
  };
  if (context) payload.ayahContext = context;
  return payload;
}

export function setQuranAssistantComposerQuestion(
  questionRef: { current: string },
  question: string,
): string {
  const text = question.trim();
  questionRef.current = text;
  return text;
}

const CONTEXT_KEY = "noor-quran-assistant-context";

export function saveQuranAssistantContext(context: QuranAssistantContext): void {
  try {
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Session storage can be unavailable in privacy-restricted WebViews.
  }
}

export function readQuranAssistantContext(): QuranAssistantContext | null {
  try {
    const raw = sessionStorage.getItem(CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuranAssistantContext>;
    if (
      typeof parsed.surahNumber !== "number" ||
      typeof parsed.ayahNumber !== "number" ||
      typeof parsed.surahName !== "string" ||
      typeof parsed.surahEnglishName !== "string" ||
      typeof parsed.arabic !== "string" ||
      typeof parsed.translation !== "string" ||
      typeof parsed.audioGlobalNumber !== "number"
    ) {
      return null;
    }
    return parsed as QuranAssistantContext;
  } catch {
    return null;
  }
}

export function clearQuranAssistantContext(): void {
  try {
    sessionStorage.removeItem(CONTEXT_KEY);
  } catch {
    // Session storage can be unavailable in privacy-restricted WebViews.
  }
}