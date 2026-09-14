import { z } from "zod";

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

export const quranAssistantRequestSchema = z.object({
  question: z.string().trim().min(2).max(1200),
  language: z.string().trim().min(2).max(40).optional(),
  deviceId: z.string().min(1).max(200),
  ayahContext: z.object({
    surahNumber: z.number().int().min(1).max(114),
    surahName: z.string().min(1).max(200),
    surahEnglishName: z.string().min(1).max(200),
    ayahNumber: z.number().int().min(1).max(286),
    arabic: z.string().min(1).max(12000),
    translation: z.string().max(12000),
    transliteration: z.string().max(12000).optional(),
    audioGlobalNumber: z.number().int().min(1).max(7000),
  }).optional(),
  conversation: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2400),
  })).max(10).optional(),
});

export function buildQuranAssistantQuestion(
  question: string,
  context?: QuranAssistantAyahContext,
  conversation: QuranAssistantConversationMessage[] = [],
): string {
  const text = question.trim();
  const conversationText = conversation.length
    ? [
        "CONVERSATION CONTEXT (latest completed user/assistant pairs from the current chat only):",
        ...conversation.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content.trim()}`),
      ].join("\n")
    : "";
  if (!context && !conversationText) return text;
  return [
    context ? "SELECTED AYAH CONTEXT (server-validated handoff from the Quran Reader):" : "",
    context ? `Surah: ${context.surahEnglishName} (${context.surahNumber})` : "",
    context ? `Surah name: ${context.surahName}` : "",
    context ? `Ayah number: ${context.ayahNumber}` : "",
    context ? `Verified Arabic text: ${context.arabic}` : "",
    context?.translation ? `Displayed translation: ${context.translation}` : "",
    context?.transliteration ? `Displayed transliteration: ${context.transliteration}` : "",
    conversationText,
    "",
    `CURRENT USER QUESTION: ${text}`,
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