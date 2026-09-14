import {
  buildQuranAssistantRequestPayload,
  buildQuranAssistantRequestText,
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

console.log("Quran Assistant Ayah context request test passed");