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

export type QuranAssistantConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export function buildQuranAssistantQuestion(
  question: string,
  context?: QuranAssistantAyahContext,
  conversation: QuranAssistantConversationMessage[] = [],
): string {
  const text = question.trim();
  const conversationText = conversation.length
    ? [
        "Previous conversation messages (use only to understand the current question):",
        ...conversation.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content.trim()}`),
      ].join("\n")
    : "";
  if (!context && !conversationText) return text;
  return [
    context ? "The user selected this verified Quran Ayah from the Quran Reader:" : "",
    context ? `Surah: ${context.surahEnglishName} (${context.surahNumber})` : "",
    context ? `Surah name: ${context.surahName}` : "",
    context ? `Ayah number: ${context.ayahNumber}` : "",
    context ? `Verified Arabic text: ${context.arabic}` : "",
    context?.translation ? `Displayed translation: ${context.translation}` : "",
    context?.transliteration ? `Displayed transliteration: ${context.transliteration}` : "",
    conversationText,
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