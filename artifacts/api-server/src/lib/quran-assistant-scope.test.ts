import { isQuranAssistantQuestion } from "./quran-assistant-scope";

const cases: Array<[string, boolean]> = [
  ["Who created the world?", true],
  ["Who created the heavens and earth?", true],
  ["What does the Quran say about patience?", true],
  ["Explain Surah Al-Fatihah.", true],
  ["How can I earn money online?", false],
  ["How do I start working on Upwork?", false],
  ["How do I build an app?", false],
  ["Create an image for me.", false],
  ["How can I make a website?", false],
  ["How can I make friends with a girl?", false],
];

for (const [question, expected] of cases) {
  const actual = isQuranAssistantQuestion(question);
  if (actual !== expected) {
    throw new Error(`${question}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

console.log("Quran Assistant scope cases passed");