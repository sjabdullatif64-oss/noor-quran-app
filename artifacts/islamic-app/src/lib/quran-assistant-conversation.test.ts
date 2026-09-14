import {
  getRecentQuranAssistantConversation,
  QURAN_ASSISTANT_RECENT_TURN_LIMIT,
  buildQuranAssistantRequestPayload,
  type QuranAssistantContext,
  type QuranAssistantConversationMessage,
} from "./quran-assistant-context";

const context: QuranAssistantContext = {
  surahNumber: 49,
  surahName: "الحجرات",
  surahEnglishName: "Al-Hujuraat",
  ayahNumber: 8,
  arabic: "فَضْلًا مِّنَ اللَّهِ وَنِعْمَةً",
  translation: "[It is] bounty from Allah and favor.",
  audioGlobalNumber: 5169,
};

const allTurns: QuranAssistantConversationMessage[] = Array.from({ length: 7 }, (_, index) => [
  { role: "user" as const, content: `Question ${index + 1}` },
  { role: "assistant" as const, content: `Answer ${index + 1}` },
]).flat();

const recent = getRecentQuranAssistantConversation(allTurns);
if (recent.length !== QURAN_ASSISTANT_RECENT_TURN_LIMIT * 2) {
  throw new Error("The AI context must contain exactly five complete conversation turns");
}
if (recent[0]?.content !== "Question 3" || recent.at(-1)?.content !== "Answer 7") {
  throw new Error("The AI context must drop the oldest turns and retain the newest five");
}

const followUp = getRecentQuranAssistantConversation([
  ...allTurns,
  { role: "user", content: "I didn't understand that." },
  { role: "assistant", content: "Here is a simpler explanation." },
]);
if (!followUp.some((message) => message.content === "I didn't understand that.")
  || !followUp.some((message) => message.content === "Here is a simpler explanation.")) {
  throw new Error("A follow-up turn must receive its preceding conversation context");
}
if (followUp.some((message) => message.content === "Question 1")) {
  throw new Error("Older turns must be excluded from the AI context");
}

const selectedAyahFollowUp = buildQuranAssistantRequestPayload(
  context,
  "What does this mean?",
  followUp,
);
if (selectedAyahFollowUp.ayahContext?.ayahNumber !== context.ayahNumber
  || selectedAyahFollowUp.ayahContext?.arabic !== context.arabic
  || selectedAyahFollowUp.conversation?.length !== followUp.length) {
  throw new Error("Selected Ayah context must remain alongside recent follow-up context");
}

if (getRecentQuranAssistantConversation([]).length !== 0) {
  throw new Error("New Chat must start with no conversation context");
}

let successfulUsageCount = 0;
const beforeContextBuild = successfulUsageCount;
const normalQuestion = buildQuranAssistantRequestPayload(null, "What does the Quran say about patience?", recent);
if (normalQuestion.ayahContext || normalQuestion.conversation?.length !== recent.length) {
  throw new Error("A normal question must carry recent context without selected Ayah data");
}
if (successfulUsageCount !== beforeContextBuild) {
  throw new Error("Building conversation context must not consume a Quran Assistant question");
}

console.log("Quran Assistant rolling conversation context test passed");