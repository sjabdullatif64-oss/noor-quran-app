import {
  getDirectIslamicAnswer,
  getFallbackGuidance,
  getSuggestedQuranReferences,
} from "./quran-assistant-behavior";

const created = getDirectIslamicAnswer("Who created the world?", "english");
if (!created || !/Allah created the heavens and the earth/i.test(created)) {
  throw new Error(`Expected a direct answer about Allah, got: ${created ?? "empty"}`);
}

const createdUrdu = getDirectIslamicAnswer("دنیا کس نے بنائی؟", "urdu");
if (!createdUrdu || !/اللہ نے/.test(createdUrdu)) {
  throw new Error(`Expected a direct Urdu answer about Allah, got: ${createdUrdu ?? "empty"}`);
}

const patience = getSuggestedQuranReferences("I have no patience. Which Ayah should I read?");
if (patience.length !== 1 || patience[0].surahNumber !== 2 || patience[0].ayahNumber !== 153) {
  throw new Error(`Expected patience reference 2:153, got: ${JSON.stringify(patience)}`);
}

const patienceUrdu = getSuggestedQuranReferences("مجھے صبر نہیں ہے، کون سی آیت پڑھوں؟");
if (patienceUrdu.length !== 1 || patienceUrdu[0].surahNumber !== 2 || patienceUrdu[0].ayahNumber !== 153) {
  throw new Error(`Expected Urdu patience reference 2:153, got: ${JSON.stringify(patienceUrdu)}`);
}

const worry = getSuggestedQuranReferences("I am worried. Give me an Ayah.");
if (worry.length !== 1 || worry[0].surahNumber !== 13 || worry[0].ayahNumber !== 28) {
  throw new Error(`Expected worry reference 13:28, got: ${JSON.stringify(worry)}`);
}

const taweezGuidance = getFallbackGuidance("My taweez is not correct. What should I do?", "english");
if (!taweezGuidance || !/qualified Islamic scholar/i.test(taweezGuidance)) {
  throw new Error("Expected careful taweez guidance with qualified-scholar recommendation");
}

const healing = getSuggestedQuranReferences("I am sick. Which Ayah should I read?");
if (!healing.some((reference) => reference.surahNumber === 26 && reference.ayahNumber === 80)) {
  throw new Error(`Expected healing reference 26:80, got: ${JSON.stringify(healing)}`);
}

const protection = getSuggestedQuranReferences("Which Ayahs should I read for protection from the evil eye?");
if (protection.length !== 2 || protection[0].surahNumber !== 113 || protection[1].surahNumber !== 114) {
  throw new Error(`Expected protection references 113:1 and 114:1, got: ${JSON.stringify(protection)}`);
}

const paradise = getSuggestedQuranReferences("Which Quran verses explain who enters Paradise?");
if (paradise.length !== 2 || paradise[0].surahNumber !== 2 || paradise[1].surahNumber !== 4) {
  throw new Error(`Expected Paradise references 2:82 and 4:124, got: ${JSON.stringify(paradise)}`);
}

const createdHumans = getDirectIslamicAnswer("Who created human beings?", "english");
if (createdHumans !== "Allah created human beings.") {
  throw new Error(`Expected a direct answer about human creation, got: ${createdHumans ?? "empty"}`);
}

const validIslamicQuestions = [
  "میں بیماری میں کیا پڑھوں؟",
  "میں تکلیف میں کس کو یاد کروں؟",
  "تمام جہانوں کا پروردگار کون ہے؟",
  "جنت میں کون لوگ جائیں گے؟",
  "مجھے صبر کے لیے کیا کرنا چاہیے؟",
];
for (const question of validIslamicQuestions) {
  if (/أنا هنا لمساعدتك|براہِ کرم.*سوال پوچھیں/.test(question)) {
    throw new Error(`Test fixture unexpectedly contains a generic scope refusal: ${question}`);
  }
}

console.log("Quran Assistant behavior cases passed");