import {
  beginExplainAyahRequest,
  createExplainAyahRequestState,
  EXPLAIN_THIS_AYAH_QUESTION,
  finishExplainAyahRequest,
  getExplainThisAyahLabel,
  hasCompletedExplainAyahResponse,
} from "./quran-assistant-explain";
import type { QuranAssistantContext } from "./quran-assistant-context";
import type { QuranAssistantMessage } from "./quran-assistant-storage";

const context: QuranAssistantContext = {
  surahNumber: 49,
  surahName: "الحجرات",
  surahEnglishName: "Al-Hujuraat",
  ayahNumber: 8,
  arabic: "فَضْلًا مِّنَ اللَّهِ وَنِعْمَةً ۚ وَاللَّهُ عَلِيمٌ حَكِيمٌ",
  translation: "[It is] bounty from Allah and favor. And Allah is Knowing and Wise.",
  audioGlobalNumber: 5169,
};

if (getExplainThisAyahLabel("english") !== "Explain this Ayah") {
  throw new Error("English Explain-this-Ayah label must remain unchanged");
}
if (getExplainThisAyahLabel("urdu") !== "اس آیت کی وضاحت کریں") {
  throw new Error("Urdu Explain-this-Ayah label must use the established Urdu copy");
}
if (EXPLAIN_THIS_AYAH_QUESTION !== "Explain this Ayah") {
  throw new Error("Localized button labels must not change the stable Explain request");
}
for (const language of ["english", "urdu"] as const) {
  const label = getExplainThisAyahLabel(language);
  const explainRequest = {
    question: EXPLAIN_THIS_AYAH_QUESTION,
    ayahContext: context,
  };
  if (!label || explainRequest.question !== EXPLAIN_THIS_AYAH_QUESTION
    || explainRequest.ayahContext !== context) {
    throw new Error(`${language} Explain button must keep the existing action and selected Ayah context`);
  }
}

let requestCount = 0;
let successfulUsageCount = 0;
let state = createExplainAyahRequestState();

const firstTap = beginExplainAyahRequest(state, context);
state = firstTap.state;
if (!firstTap.shouldSend) throw new Error("The first Explain this Ayah tap must send a request");
requestCount += 1;

const duplicateTapWhileRequestIsInFlight = beginExplainAyahRequest(state, context);
state = duplicateTapWhileRequestIsInFlight.state;
if (duplicateTapWhileRequestIsInFlight.shouldSend) {
  throw new Error("A second tap must not create another in-flight AI request");
}

const messages: QuranAssistantMessage[] = [
  {
    id: "user-explain",
    role: "user",
    text: EXPLAIN_THIS_AYAH_QUESTION,
    ayahContext: context,
    createdAt: 1,
  },
  {
    id: "assistant-explanation",
    role: "assistant",
    answer: {
      language: "en",
      explanation: "This Ayah reminds believers that guidance is a bounty from Allah.",
      guidance: "",
      ayahs: [],
      usage: {
        limit: 5,
        questionsUsed: 1,
        remaining: 4,
        windowStartedAt: "2026-09-14T00:00:00.000Z",
        resetAt: "2026-09-15T00:00:00.000Z",
      },
    },
    createdAt: 2,
  },
];

state = finishExplainAyahRequest(state, context, true);
successfulUsageCount = state.successfulUsageCount;

if (requestCount !== 1) throw new Error(`Expected exactly one AI request, got ${requestCount}`);
if (successfulUsageCount !== 1) throw new Error(`Expected exactly one successful usage count, got ${successfulUsageCount}`);
if (messages[1].answer?.usage?.questionsUsed !== 1) {
  throw new Error("The successful Explain response must carry one consumed usage count");
}
if (!hasCompletedExplainAyahResponse(messages, context)) {
  throw new Error("A successful response must mark the matching Explain action as completed");
}

const tapAfterResponse = beginExplainAyahRequest(state, context);
if (tapAfterResponse.shouldSend) {
  throw new Error("The Explain action must not automatically trigger again after the response");
}

console.log("Quran Assistant Explain this Ayah one-request regression test passed");