export type QuranAssistantAyahContext = {
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  ayahNumber: number;
  arabic: string;
  translation: string;
  transliteration?: string;
  audioGlobalNumber: number;
};

export function buildQuranAssistantQuestion(
  question: string,
  context?: QuranAssistantAyahContext,
): string {
  const text = question.trim();
  if (!context) return text;
  return [
    "The user selected this verified Quran Ayah from the Quran Reader:",
    `Surah: ${context.surahEnglishName} (${context.surahNumber})`,
    `Surah name: ${context.surahName}`,
    `Ayah number: ${context.ayahNumber}`,
    `Verified Arabic text: ${context.arabic}`,
    context.translation ? `Displayed translation: ${context.translation}` : "",
    context.transliteration ? `Displayed transliteration: ${context.transliteration}` : "",
    "",
    `User's question: ${text}`,
  ].filter(Boolean).join("\n");
}

export function getSelectedAyahReference(context?: QuranAssistantAyahContext): {
  surahNumber: number;
  ayahNumber: number;
}[] {
  return context
    ? [{ surahNumber: context.surahNumber, ayahNumber: context.ayahNumber }]
    : [];
}