import type { QuranAssistantResponse } from "@/lib/noor-api";
import type { QuranAssistantContext } from "@/lib/quran-assistant-context";

export type QuranAssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  content?: string;
  answer?: QuranAssistantResponse;
  ayahContext?: QuranAssistantContext;
  createdAt: number;
};

export type QuranAssistantChat = {
  id: string;
  title: string;
  messages: QuranAssistantMessage[];
  draft: string;
  ayahContext: QuranAssistantContext | null;
  createdAt: number;
  updatedAt: number;
};

export type QuranAssistantStorage = {
  version: 1;
  activeChatId: string;
  chats: QuranAssistantChat[];
};

const STORAGE_KEY = "noor-quran-assistant-chats-v1";

export function createQuranAssistantId(prefix: "chat" | "message"): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // Fall through to the WebView-safe identifier.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createQuranAssistantUserMessage(
  text: string,
  ayahContext: QuranAssistantContext | null,
  createdAt = Date.now(),
): QuranAssistantMessage {
  const content = text.trim();
  return {
    id: createQuranAssistantId("message"),
    role: "user",
    text: content,
    content,
    ...(ayahContext ? { ayahContext } : {}),
    createdAt,
  };
}

export function createQuranAssistantUserTurnSubmission(
  content: string,
  ayahContext: QuranAssistantContext | null,
  createdAt = Date.now(),
): {
  userMessage: QuranAssistantMessage;
  question: string;
  ayahContext: QuranAssistantContext | null;
} {
  const userMessage = createQuranAssistantUserMessage(content, ayahContext, createdAt);
  return {
    userMessage,
    question: userMessage.content ?? userMessage.text ?? "",
    ayahContext: userMessage.ayahContext ?? null,
  };
}

export function createQuranAssistantChat(now = Date.now()): QuranAssistantChat {
  return {
    id: createQuranAssistantId("chat"),
    title: "New Quran Chat",
    messages: [],
    draft: "",
    ayahContext: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function getQuranAssistantChatTitle(chat: QuranAssistantChat): string {
  const firstQuestion = chat.messages.find(
    (message) => message.role === "user" && Boolean(message.text?.trim()),
  )?.text?.trim();
  if (!firstQuestion) return chat.title || "New Quran Chat";
  return firstQuestion.length > 64 ? `${firstQuestion.slice(0, 61).trimEnd()}…` : firstQuestion;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAnswer(value: unknown): QuranAssistantResponse | undefined {
  if (!isRecord(value)) return undefined;
  const ayahs = Array.isArray(value.ayahs)
    ? value.ayahs.filter((ayah): ayah is QuranAssistantResponse["ayahs"][number] => (
        isRecord(ayah) &&
        typeof ayah.surahNumber === "number" &&
        typeof ayah.surahName === "string" &&
        typeof ayah.ayahNumber === "number" &&
        typeof ayah.arabic === "string" &&
        typeof ayah.translation === "string" &&
        typeof ayah.audioGlobalNumber === "number"
      ))
    : [];
  if (typeof value.language !== "string" || typeof value.explanation !== "string" || typeof value.guidance !== "string") {
    return undefined;
  }
  return {
    responseId: typeof value.responseId === "string" && value.responseId
      ? value.responseId
      : undefined,
    language: value.language,
    explanation: value.explanation,
    guidance: value.guidance,
    ayahs,
    scopeRejected: value.scopeRejected === true,
  };
}

function normalizeMessage(value: unknown, index: number): QuranAssistantMessage | null {
  if (!isRecord(value) || (value.role !== "user" && value.role !== "assistant")) return null;
  const createdAt = typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
    ? value.createdAt
    : Date.now();
  const id = typeof value.id === "string" && value.id ? value.id : `message-restored-${createdAt}-${index}`;
  if (value.role === "user") {
    const ayahContext = normalizeContext(value.ayahContext);
    const legacyText = typeof value.text === "string" ? value.text : null;
    const content = typeof value.content === "string" ? value.content : legacyText;
    return legacyText !== null
      ? { id, role: "user", text: legacyText, content: content ?? legacyText, ...(ayahContext ? { ayahContext } : {}), createdAt }
      : null;
  }
  const answer = normalizeAnswer(value.answer);
  const ayahContext = normalizeContext(value.ayahContext);
  return answer
    ? { id, role: "assistant", answer, ...(ayahContext ? { ayahContext } : {}), createdAt }
    : null;
}

function normalizeContext(value: unknown): QuranAssistantContext | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.surahNumber !== "number" ||
    typeof value.surahName !== "string" ||
    typeof value.surahEnglishName !== "string" ||
    typeof value.ayahNumber !== "number" ||
    typeof value.arabic !== "string" ||
    typeof value.translation !== "string" ||
    typeof value.audioGlobalNumber !== "number"
  ) {
    return null;
  }
  return {
    surahNumber: value.surahNumber,
    surahName: value.surahName,
    surahEnglishName: value.surahEnglishName,
    ayahNumber: value.ayahNumber,
    arabic: value.arabic,
    translation: value.translation,
    transliteration: typeof value.transliteration === "string" ? value.transliteration : undefined,
    audioGlobalNumber: value.audioGlobalNumber,
  };
}

function normalizeChat(value: unknown, index: number): QuranAssistantChat | null {
  if (!isRecord(value)) return null;
  const messages = Array.isArray(value.messages)
    ? value.messages.map(normalizeMessage).filter((message): message is QuranAssistantMessage => message !== null)
    : [];
  const createdAt = typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
    ? value.createdAt
    : Date.now();
  const updatedAt = typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
    ? value.updatedAt
    : createdAt;
  const id = typeof value.id === "string" && value.id ? value.id : `chat-restored-${createdAt}-${index}`;
  return {
    id,
    title: typeof value.title === "string" ? value.title : "New Quran Chat",
    messages,
    draft: typeof value.draft === "string" ? value.draft : "",
    ayahContext: normalizeContext(value.ayahContext),
    createdAt,
    updatedAt,
  };
}

function createInitialStorage(): QuranAssistantStorage {
  const chat = createQuranAssistantChat();
  return { version: 1, activeChatId: chat.id, chats: [chat] };
}

export function loadQuranAssistantStorage(): QuranAssistantStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialStorage();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const chats = Array.isArray(parsed.chats)
      ? parsed.chats.map(normalizeChat).filter((chat): chat is QuranAssistantChat => chat !== null)
      : [];
    if (chats.length === 0) return createInitialStorage();
    const requestedActiveId = typeof parsed.activeChatId === "string" ? parsed.activeChatId : "";
    const activeChatId = chats.some((chat) => chat.id === requestedActiveId)
      ? requestedActiveId
      : chats[0].id;
    return { version: 1, activeChatId, chats };
  } catch {
    return createInitialStorage();
  }
}

export function saveQuranAssistantStorage(storage: QuranAssistantStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // A full or restricted local store should not interrupt Quran Assistant.
  }
}