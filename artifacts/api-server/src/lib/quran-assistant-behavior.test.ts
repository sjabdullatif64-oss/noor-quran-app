import {
  getDirectIslamicAnswer,
  getFallbackGuidance,
  getSuggestedQuranReferences,
} from "./quran-assistant-behavior";

const created = getDirectIslamicAnswer("Who created the world?", "english");
if (!created || !/Allah created the heavens and the earth/i.test(created)) {
  throw new Error(`Expected a direct answer about Allah, got: ${created ?? "empty"}`);
}

const patience = getSuggestedQuranReferences("I have no patience. Which Ayah should I read?");
if (patience.length !== 1 || patience[0].surahNumber !== 2 || patience[0].ayahNumber !== 153) {
  throw new Error(`Expected patience reference 2:153, got: ${JSON.stringify(patience)}`);
}

const worry = getSuggestedQuranReferences("I am worried. Give me an Ayah.");
if (worry.length !== 1 || worry[0].surahNumber !== 13 || worry[0].ayahNumber !== 28) {
  throw new Error(`Expected worry reference 13:28, got: ${JSON.stringify(worry)}`);
}

const taweezGuidance = getFallbackGuidance("My taweez is not correct. What should I do?", "english");
if (!taweezGuidance || !/qualified Islamic scholar/i.test(taweezGuidance)) {
  throw new Error("Expected careful taweez guidance with qualified-scholar recommendation");
}

console.log("Quran Assistant behavior cases passed");