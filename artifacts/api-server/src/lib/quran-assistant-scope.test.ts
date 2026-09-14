import { isQuranAssistantFollowUp, isQuranAssistantQuestion } from "./quran-assistant-scope";

const cases: Array<[string, boolean]> = [
  ["Who created the world?", true],
  ["Who created the heavens and earth?", true],
  ["Who created human beings?", true],
  ["What does the Quran say about patience?", true],
  ["I have no patience. Which Ayah should I read?", true],
  ["I am worried. Give me an Ayah.", true],
  ["My taweez is not correct. What should I do?", true],
  ["Explain Surah Al-Fatihah.", true],
  ["How can I earn money online?", false],
  ["How do I start working on Upwork?", false],
  ["How do I build an app?", false],
  ["Create an image for me.", false],
  ["How can I make a website?", false],
  ["How can I make friends with a girl?", false],
  ["مجھے آن لائن ارننگ کرنی ہے کس طرح میں کر سکتا ہوں کوئی ویب سائٹ یا ایپ بتائیں", false],
  ["دنیا کس نے بنائی؟", true],
  ["Mujhe Quran ki woh ayat chahiye jo mushkil waqt mein madad kare", true],
  ["माता-पिता के बारे में कुरआन क्या कहता है?", true],
  ["কুরআনে অসুস্থতার সময় কী বলা হয়েছে?", true],
];

for (const [question, expected] of cases) {
  const actual = isQuranAssistantQuestion(question);
  if (actual !== expected) {
    throw new Error(`${question}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

if (!isQuranAssistantFollowUp("اس کے بارے میں مزید بتاؤ", true)) {
  throw new Error("Expected a contextual Urdu follow-up to remain in scope");
}
if (isQuranAssistantFollowUp("اس کے بارے میں مزید بتاؤ", false)) {
  throw new Error("A follow-up without Quran context must not bypass the scope gate");
}

console.log("Quran Assistant scope cases passed");