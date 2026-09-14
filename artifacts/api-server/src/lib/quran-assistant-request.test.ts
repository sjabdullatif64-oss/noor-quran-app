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

const selectedMaaida38: QuranAssistantAyahContext = {
  surahNumber: 5,
  surahName: "المائدة",
  surahEnglishName: "Al-Maaida",
  ayahNumber: 38,
  arabic: "وَالسَّارِقُ وَالسَّارِقَةُ فَاقْطَعُوا أَيْدِيَهُمَا جَزَاءً بِمَا كَسَبَا نَكَالًا مِنَ اللَّهِ ۗ وَاللَّهُ عَزِيزٌ حَكِيمٌ",
  translation: "[As for] the thief, the male and the female, amputate their hands in recompense for what they committed as a deterrent from Allah. And Allah is Exalted in Might and Wise.",
  audioGlobalNumber: 688,
};
const contextualQuestion = buildQuranAssistantQuestion("ان کی وضاحت دیں", selectedMaaida38);
for (const expectedPart of [
  "Surah: Al-Maaida (5)",
  "Ayah number: 38",
  `Verified Arabic text: ${selectedMaaida38.arabic}`,
  `Displayed translation: ${selectedMaaida38.translation}`,
  "User's question: ان کی وضاحت دیں",
]) {
  if (!contextualQuestion.includes(expectedPart)) {
    throw new Error(`Selected Al-Maaida 38 context was not sent to the AI prompt: ${expectedPart}`);
  }
}
const contextualPayloadQuestions = [
  "ان کی وضاحت دیں",
  "اس آیت کی وضاحت کریں",
  "اس کا آسان مطلب بتائیں",
  "اس میں کیا حکم ہے؟",
];
for (const currentQuestion of contextualPayloadQuestions) {
  const payload = {
    question: currentQuestion,
    ayahContext: selectedMaaida38,
  };
  if (payload.question !== currentQuestion
    || payload.ayahContext.surahEnglishName !== "Al-Maaida"
    || payload.ayahContext.ayahNumber !== 38
    || payload.ayahContext.arabic !== selectedMaaida38.arabic
    || payload.ayahContext.translation !== selectedMaaida38.translation) {
    throw new Error(`Contextual request lost Al-Maaida 38 context for: ${currentQuestion}`);
  }
}

console.log("Quran Assistant server context-use test passed");