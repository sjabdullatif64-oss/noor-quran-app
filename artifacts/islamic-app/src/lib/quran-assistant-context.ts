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

export interface QuranAssistantConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface QuranAssistantRequest {
  question: string;
  deviceId: string;
  language?: string;
  ayahContext?: QuranAssistantContext | null;
  conversation?: QuranAssistantConversationMessage[];
}

export const QURAN_ASSISTANT_RECENT_TURN_LIMIT = 5;

/**
 * Builds the bounded AI context from completed user/assistant turns.
 * The visible chat can be longer; this is intentionally limited to the
 * newest complete turns before the current question.
 */
export function getRecentQuranAssistantConversation(
  messages: QuranAssistantConversationMessage[],
  maxTurns = QURAN_ASSISTANT_RECENT_TURN_LIMIT,
): QuranAssistantConversationMessage[] {
  const turns: QuranAssistantConversationMessage[][] = [];
  let pendingUser: QuranAssistantConversationMessage | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      if (pendingUser) {
        pendingUser = message;
      } else {
        pendingUser = message;
      }
      continue;
    }
    if (!pendingUser) continue;
    turns.push([pendingUser, message]);
    pendingUser = null;
  }

  return turns
    .slice(-Math.max(0, maxTurns))
    .flat();
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
  conversation: QuranAssistantConversationMessage[] = [],
): {
  question: string;
  ayahContext?: QuranAssistantContext;
  conversation?: QuranAssistantConversationMessage[];
} {
  const payload: {
    question: string;
    ayahContext?: QuranAssistantContext;
    conversation?: QuranAssistantConversationMessage[];
  } = {
    question: question.trim(),
  };
  if (context) payload.ayahContext = context;
  if (conversation.length) payload.conversation = conversation;
  return payload;
}

export function buildQuranAssistantRequestBody(
  request: QuranAssistantRequest,
): {
  question: string;
  deviceId: string;
  language?: string;
  ayahContext?: QuranAssistantContext;
  conversation?: QuranAssistantConversationMessage[];
} {
  return {
    ...buildQuranAssistantRequestPayload(
      request.ayahContext ?? null,
      request.question,
      request.conversation,
    ),
    language: request.language,
    deviceId: request.deviceId,
  };
}

export function setQuranAssistantComposerQuestion(
  questionRef: { current: string },
  question: string,
): string {
  const text = question.trim();
  questionRef.current = text;
  return text;
}

export function getPendingQuranAssistantContextAfterSend(
  context: QuranAssistantContext | null,
  succeeded: boolean,
): QuranAssistantContext | null {
  return succeeded ? null : context;
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