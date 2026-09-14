import { buildQuranAssistantRequestText, type QuranAssistantContext } from "./quran-assistant-context";

const context: QuranAssistantContext = {
  surahNumber: 2,
  surahName: "البقرة",
  surahEnglishName: "Al-Baqarah",
  ayahNumber: 255,
  arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
  translation: "Allah—there is no deity except Him.",
  audioGlobalNumber: 262,
};

const requestText = buildQuranAssistantRequestText(context, "Explain this Ayah");

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

console.log("Quran Assistant Ayah context request test passed");