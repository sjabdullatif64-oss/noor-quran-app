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