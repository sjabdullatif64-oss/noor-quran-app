import type { QuranAssistantContext } from "./quran-assistant-context";
import type { QuranAssistantMessage } from "./quran-assistant-storage";

export const EXPLAIN_THIS_AYAH_QUESTION = "Explain this Ayah";

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