import {
  getRecentQuranAssistantConversation,
  type QuranAssistantConversationMessage,
} from "./quran-assistant-context";
import type { QuranAssistantMessage } from "./quran-assistant-storage";

function getAssistantContent(message: QuranAssistantMessage): string {
  if (message.role !== "assistant" || !message.answer) return "";
  return [
    message.answer.explanation,
    message.answer.guidance,
  ].filter(Boolean).join("\n\n").trim();
}

/**
 * Converts only completed user/assistant turns from one active chat into the
 * bounded context sent to the AI. The visible chat and local history remain
 * unbounded; only this request context is limited.
 */
export function getQuranAssistantConversationContext(
  messages: QuranAssistantMessage[],
  maxTurns = 5,
): QuranAssistantConversationMessage[] {
  const completedMessages: QuranAssistantConversationMessage[] = [];
  let pendingUser: QuranAssistantConversationMessage | null = null;

  for (const message of messages) {
    if (message.role === "user" && message.text?.trim()) {
      pendingUser = { role: "user", content: message.text.trim() };
      continue;
    }
    const assistantContent = getAssistantContent(message);
    if (!assistantContent || !pendingUser) continue;
    completedMessages.push(pendingUser, { role: "assistant", content: assistantContent });
    pendingUser = null;
  }

  return getRecentQuranAssistantConversation(completedMessages, maxTurns);
}