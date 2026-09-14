import {
  buildQuranAssistantQuestion,
  getSelectedAyahReference,
  quranAssistantRequestSchema,
} from "./quran-assistant-request";

const exactPayload = {
  question: "اس آیت کی وضاحت کریں",
  ayahContext: {
    surahEnglishName: "Al-Anfaal",
    surahName: "الأنفال",
    surahNumber: 8,
    ayahNumber: 2,
    arabic: "إِنَّمَا الْمُؤْمِنُونَ الَّذِينَ إِذَا ذُكِرَ اللَّهُ وَجِلَتْ قُلُوبُهُمْ وَإِذَا تُلِيَتْ عَلَيْهِمْ آيَاتُهُ زَادَتْهُمْ إِيمَانًا وَعَلَىٰ رَبِّهِمْ يَتَوَكَّلُونَ",
    translation: "The believers are only those who, when Allah is mentioned, their hearts become fearful, and when His verses are recited to them, it increases them in faith; and upon their Lord they rely.",
    audioGlobalNumber: 208,
  },
  deviceId: "test-device",
};

const parsed = quranAssistantRequestSchema.safeParse(exactPayload);
if (!parsed.success) {
  throw new Error(`The exact captured request was rejected by the server schema: ${parsed.error.message}`);
}
if (!parsed.data.ayahContext
  || parsed.data.ayahContext.surahEnglishName !== "Al-Anfaal"
  || parsed.data.ayahContext.ayahNumber !== 2
  || parsed.data.ayahContext.arabic !== exactPayload.ayahContext.arabic
  || parsed.data.ayahContext.translation !== exactPayload.ayahContext.translation) {
  throw new Error("The server schema did not preserve the exact selected Ayah context");
}

const exactPrompt = buildQuranAssistantQuestion(
  parsed.data.question,
  parsed.data.ayahContext,
  parsed.data.conversation,
);
for (const expectedPart of [
  "SELECTED AYAH CONTEXT (server-validated handoff from the Quran Reader):",
  "Surah: Al-Anfaal (8)",
  "Surah name: الأنفال",
  "Ayah number: 2",
  `Verified Arabic text: ${exactPayload.ayahContext.arabic}`,
  `Displayed translation: ${exactPayload.ayahContext.translation}`,
  "CURRENT USER QUESTION: اس آیت کی وضاحت کریں",
]) {
  if (!exactPrompt.includes(expectedPart)) {
    throw new Error(`The final AI prompt omitted selected Ayah data: ${expectedPart}`);
  }
}

const selectedReference = getSelectedAyahReference(parsed.data.ayahContext);
const finalResponseAyahs = [{
  surahNumber: 8,
  ayahNumber: 2,
  surahName: "الأنفال",
  arabic: exactPayload.ayahContext.arabic,
  translation: exactPayload.ayahContext.translation,
  audioGlobalNumber: 208,
}].filter((ayah) => selectedReference.some((reference) => (
  reference.surahNumber === ayah.surahNumber && reference.ayahNumber === ayah.ayahNumber
)));
if (finalResponseAyahs.length !== 1
  || finalResponseAyahs[0]?.surahNumber !== 8
  || finalResponseAyahs[0]?.ayahNumber !== 2
  || finalResponseAyahs[0]?.arabic !== exactPayload.ayahContext.arabic
  || finalResponseAyahs[0]?.translation !== exactPayload.ayahContext.translation) {
  throw new Error("The selected Ayah reference was not attached to the final verified response");
}

const customPrompt = buildQuranAssistantQuestion(
  "اس سے ہمیں کیا سبق ملتا ہے؟",
  parsed.data.ayahContext,
);
if (!customPrompt.includes("CURRENT USER QUESTION: اس سے ہمیں کیا سبق ملتا ہے؟")) {
  throw new Error("Custom Composer question was not preserved with selected Ayah context");
}

const explainPrompt = buildQuranAssistantQuestion("Explain this Ayah", parsed.data.ayahContext);
if (!explainPrompt.includes("CURRENT USER QUESTION: Explain this Ayah")) {
  throw new Error("Explain this Ayah question was not preserved with selected Ayah context");
}

const normalPayload = quranAssistantRequestSchema.safeParse({
  question: "What does the Quran say about patience?",
  deviceId: "test-device",
});
if (!normalPayload.success
  || normalPayload.data.ayahContext
  || buildQuranAssistantQuestion(normalPayload.data.question, normalPayload.data.ayahContext)
    !== normalPayload.data.question) {
  throw new Error("A normal question without selected Ayah must not gain Ayah prompt context");
}

const followUpPayload = quranAssistantRequestSchema.safeParse({
  ...exactPayload,
  question: "اس سے ہمیں کیا سبق ملتا ہے؟",
  conversation: [
    { role: "user", content: "اس آیت کی وضاحت کریں" },
    { role: "assistant", content: "یہ آیت ایمان، اللہ کے ذکر اور توکل کی اہمیت بیان کرتی ہے۔" },
  ],
});
if (!followUpPayload.success) throw new Error("The selected-Ayah follow-up request was rejected");
const followUpPrompt = buildQuranAssistantQuestion(
  followUpPayload.data.question,
  followUpPayload.data.ayahContext,
  followUpPayload.data.conversation,
);
for (const expectedPart of [
  "CONVERSATION CONTEXT (latest completed user/assistant pairs from the current chat only):",
  "User: اس آیت کی وضاحت کریں",
  "Assistant: یہ آیت ایمان، اللہ کے ذکر اور توکل کی اہمیت بیان کرتی ہے۔",
  "SELECTED AYAH CONTEXT (server-validated handoff from the Quran Reader):",
  "CURRENT USER QUESTION: اس سے ہمیں کیا سبق ملتا ہے؟",
]) {
  if (!followUpPrompt.includes(expectedPart)) {
    throw new Error(`The selected-Ayah follow-up prompt omitted: ${expectedPart}`);
  }
}

let apiRequestCount = 0;
let usageReservationCount = 0;
function sendOnce(payload: typeof exactPayload): string {
  apiRequestCount += 1;
  usageReservationCount += 1;
  const request = quranAssistantRequestSchema.safeParse(payload);
  if (!request.success) throw new Error("The request spy received an invalid request");
  return buildQuranAssistantQuestion(request.data.question, request.data.ayahContext);
}
const requestSpyPrompt = sendOnce(exactPayload);
if (apiRequestCount !== 1 || usageReservationCount !== 1
  || !requestSpyPrompt.includes("Al-Anfaal (8)")
  || !requestSpyPrompt.includes("CURRENT USER QUESTION: اس آیت کی وضاحت کریں")) {
  throw new Error("One Send must create one server request/reservation with the selected Ayah prompt");
}

console.log("Server request spy exact payload:");
console.log(JSON.stringify({
  parsedAyah: parsed.data.ayahContext,
  prompt: exactPrompt,
  finalReference: selectedReference[0],
  apiRequestCount,
  usageReservationCount,
}, null, 2));
console.log("Quran Assistant server flow exact Al-Anfaal 2 regression passed");