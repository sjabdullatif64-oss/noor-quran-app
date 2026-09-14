import {
  buildQuranAssistantQuestion,
  getSelectedAyahReference,
  type QuranAssistantAyahContext,
} from "./quran-assistant-request";

const context: QuranAssistantAyahContext = {
  surahNumber: 2,
  surahName: "البقرة",
  surahEnglishName: "Al-Baqarah",
  ayahNumber: 255,
  arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
  translation: "Allah—there is no deity except Him.",
  audioGlobalNumber: 262,
};

const question = buildQuranAssistantQuestion("Explain this Ayah", context);
for (const expectedPart of [
  "Surah: Al-Baqarah (2)",
  "Surah name: البقرة",
  "Ayah number: 255",
  "Verified Arabic text: اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
  "Displayed translation: Allah—there is no deity except Him.",
  "User's question: Explain this Ayah",
]) {
  if (!question.includes(expectedPart)) {
    throw new Error(`Server prompt omitted selected Ayah context: ${expectedPart}`);
  }
}

const reference = getSelectedAyahReference(context);
if (reference.length !== 1 || reference[0].surahNumber !== 2 || reference[0].ayahNumber !== 255) {
  throw new Error(`Server did not preserve the selected Ayah reference: ${JSON.stringify(reference)}`);
}

const followUp = buildQuranAssistantQuestion(
  "اس کے بارے میں مزید بتاؤ",
  context,
  [
    { role: "user", content: "مجھے اس آیت کا مطلب سمجھائیں" },
    { role: "assistant", content: "یہ آیت اللہ کی توحید بیان کرتی ہے۔" },
  ],
);
for (const expectedPart of [
  "Previous conversation messages",
  "User: مجھے اس آیت کا مطلب سمجھائیں",
  "Assistant: یہ آیت اللہ کی توحید بیان کرتی ہے۔",
  "User's question: اس کے بارے میں مزید بتاؤ",
]) {
  if (!followUp.includes(expectedPart)) {
    throw new Error(`Server prompt omitted conversation context: ${expectedPart}`);
  }
}

console.log("Quran Assistant server context-use test passed");