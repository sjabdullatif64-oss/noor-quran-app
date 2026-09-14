import {
  buildQuranAssistantRequestPayload,
  buildQuranAssistantRequestText,
  getPendingQuranAssistantContextAfterSend,
  setQuranAssistantComposerQuestion,
  type QuranAssistantContext,
} from "./quran-assistant-context";

const context: QuranAssistantContext = {
  surahNumber: 2,
  surahName: "البقرة",
  surahEnglishName: "Al-Baqarah",
  ayahNumber: 255,
  arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
  translation: "Allah—there is no deity except Him.",
  audioGlobalNumber: 262,
};

const questionRef = { current: "" };
const composerQuestion = setQuranAssistantComposerQuestion(questionRef, "Explain this Ayah");
if (questionRef.current !== "Explain this Ayah" || composerQuestion !== questionRef.current) {
  throw new Error("The Explain this Ayah action must update the value used by the Send handler");
}
const requestText = buildQuranAssistantRequestText(context, composerQuestion);
const requestPayload = buildQuranAssistantRequestPayload(context, composerQuestion);

for (const expectedPart of [
  "Surah: Al-Baqarah (2)",
  "Ayah number: 255",
  "Verified Arabic text: اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
  "User's question: Explain this Ayah",
]) {
  if (!requestText.includes(expectedPart)) {
    throw new Error(`Missing request content: ${expectedPart}`);
  }
}

if ((requestText.match(/Explain this Ayah/g) ?? []).length !== 1) {
  throw new Error("The Ayah explanation question must be included exactly once");
}

if (requestPayload.question !== "Explain this Ayah") {
  throw new Error("The network payload must keep the raw user question");
}
if (requestPayload.ayahContext?.surahEnglishName !== "Al-Baqarah"
  || requestPayload.ayahContext.surahNumber !== 2
  || requestPayload.ayahContext.ayahNumber !== 255
  || requestPayload.ayahContext.arabic !== context.arabic) {
  throw new Error("The network payload must contain the exact selected Ayah context");
}
if (JSON.stringify(requestPayload) !== JSON.stringify({
  question: "Explain this Ayah",
  conversation: [],
  ayahContext: context,
})) {
  throw new Error("The exact composer request must contain question and ayahContext together");
}

const secondContext: QuranAssistantContext = {
  ...context,
  surahNumber: 1,
  surahName: "الفاتحة",
  surahEnglishName: "Al-Fatihah",
  ayahNumber: 7,
  arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ",
  audioGlobalNumber: 7,
};
const secondPayload = buildQuranAssistantRequestPayload(secondContext, "Explain this Ayah");
if (secondPayload.ayahContext?.surahNumber !== 1
  || secondPayload.ayahContext.ayahNumber !== 7
  || secondPayload.ayahContext.arabic !== secondContext.arabic) {
  throw new Error("A second selected Ayah must remain distinct in the network payload");
}

const customQuestion = "Explain this Ayah in simple words";
const customPayload = buildQuranAssistantRequestPayload(context, customQuestion);
if (customPayload.question !== customQuestion
  || customPayload.ayahContext?.surahNumber !== context.surahNumber
  || customPayload.ayahContext?.ayahNumber !== context.ayahNumber
  || customPayload.ayahContext?.arabic !== context.arabic
  || customPayload.ayahContext?.translation !== context.translation) {
  throw new Error("A custom composer question must send the exact selected Ayah context in the same request");
}

const explainPayload = buildQuranAssistantRequestPayload(context, "Explain this Ayah");
if (explainPayload.question !== "Explain this Ayah"
  || explainPayload.ayahContext?.surahNumber !== context.surahNumber
  || explainPayload.ayahContext?.ayahNumber !== context.ayahNumber
  || explainPayload.ayahContext?.arabic !== context.arabic
  || explainPayload.ayahContext?.translation !== context.translation) {
  throw new Error("Explain this Ayah must use the same question-plus-context request payload");
}

const noContextPayload = buildQuranAssistantRequestPayload(null, "What does the Quran say about patience?");
if (noContextPayload.question !== "What does the Quran say about patience?"
  || Object.prototype.hasOwnProperty.call(noContextPayload, "ayahContext")) {
  throw new Error("A normal question without selected context must not gain an Ayah context");
}

let sendCount = 0;
let successfulUsageCount = 0;
function sendOnce(payload: typeof customPayload): void {
  sendCount += 1;
  if (payload.question && payload.ayahContext) successfulUsageCount += 1;
}
sendOnce(customPayload);
if (sendCount !== 1 || successfulUsageCount !== 1) {
  throw new Error("One Send action must produce one request and one successful usage count");
}

let postCount = 0;
let pendingContext: QuranAssistantContext | null = context;
function postOnce(payload: typeof customPayload, succeeds: boolean): void {
  postCount += 1;
  if (payload.question !== customQuestion || payload.ayahContext !== context) {
    throw new Error("The single Send POST must contain the Composer question and selected Ayah together");
  }
  pendingContext = getPendingQuranAssistantContextAfterSend(pendingContext, succeeds);
}
postOnce(customPayload, false);
if (postCount !== 1 || pendingContext !== context) {
  throw new Error("A failed request must preserve the pending selected Ayah for retry");
}
postOnce(customPayload, true);
if (postCount !== 2 || pendingContext !== null) {
  throw new Error("A successful request must clear only the pending Ayah card state");
}
if (customPayload.ayahContext !== context || customPayload.question !== customQuestion) {
  throw new Error("The successful Composer turn must retain its original question and Ayah context");
}

console.log("Quran Assistant Ayah context request test passed");