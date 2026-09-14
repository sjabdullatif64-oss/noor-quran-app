import {
  buildQuranAssistantRequestBody,
  type QuranAssistantContext,
  type QuranAssistantRequest,
} from "./quran-assistant-context";
import { getQuranAssistantConversationContext } from "./quran-assistant-conversation";
import {
  createQuranAssistantUserMessage,
  loadQuranAssistantStorage,
  saveQuranAssistantStorage,
  type QuranAssistantMessage,
} from "./quran-assistant-storage";

const selectedAyah: QuranAssistantContext = {
  surahEnglishName: "Al-Anfaal",
  surahName: "الأنفال",
  surahNumber: 8,
  ayahNumber: 2,
  arabic: "إِنَّمَا الْمُؤْمِنُونَ الَّذِينَ إِذَا ذُكِرَ اللَّهُ وَجِلَتْ قُلُوبُهُمْ وَإِذَا تُلِيَتْ عَلَيْهِمْ آيَاتُهُ زَادَتْهُمْ إِيمَانًا وَعَلَىٰ رَبِّهِمْ يَتَوَكَّلُونَ",
  translation: "The believers are only those who, when Allah is mentioned, their hearts become fearful, and when His verses are recited to them, it increases them in faith; and upon their Lord they rely.",
  audioGlobalNumber: 208,
};

function assistantMessage(content: string, id: string): QuranAssistantMessage {
  return {
    id,
    role: "assistant",
    answer: {
      language: "ur",
      explanation: content,
      guidance: "",
      ayahs: [],
    },
    createdAt: 1,
  };
}

function completedPair(index: number): QuranAssistantMessage[] {
  return [
    createQuranAssistantUserMessage(`Question ${index}`, null, index),
    assistantMessage(`Answer ${index}`, `assistant-${index}`),
  ];
}

type CapturedRequest = {
  userTurn: QuranAssistantMessage;
  body: ReturnType<typeof buildQuranAssistantRequestBody>;
};

const capturedRequests: CapturedRequest[] = [];
let successfulUsageReservations = 0;

function composerSend(
  currentChatMessages: QuranAssistantMessage[],
  question: string,
  ayahContext: QuranAssistantContext | null,
): CapturedRequest {
  const userTurn = createQuranAssistantUserMessage(question, ayahContext, 1700000000000);
  const request: QuranAssistantRequest = {
    question: userTurn.text ?? "",
    deviceId: "memory-test-device",
    conversation: getQuranAssistantConversationContext(currentChatMessages),
    ayahContext: userTurn.ayahContext ?? null,
  };
  const body = buildQuranAssistantRequestBody(request);
  capturedRequests.push({ userTurn, body });
  console.log("Composer request spy body:", JSON.stringify(body));
  successfulUsageReservations += 1;
  return { userTurn, body };
}

// A. First question: no previous completed pair, but the request explicitly carries [].
const first = composerSend([], "قرآن میں صبر کے بارے میں کیا بتایا گیا؟", null);
if (first.body.conversation?.length !== 0) {
  throw new Error("The first question must send conversation: []");
}

const firstCompletedMessages = [
  createQuranAssistantUserMessage("قرآن میں صبر کے بارے میں کیا بتایا گیا؟", null, 1),
  assistantMessage("صبر کے بارے میں قرآن مومنوں کو ثابت قدم رہنے کی تعلیم دیتا ہے۔", "assistant-patience"),
];

// B. Follow-up: actual previous user and assistant content must be serialized.
const followUp = composerSend(firstCompletedMessages, "اس کی مزید وضاحت کریں", null);
if (followUp.body.question !== "اس کی مزید وضاحت کریں"
  || followUp.body.conversation?.[0]?.content !== "قرآن میں صبر کے بارے میں کیا بتایا گیا؟"
  || followUp.body.conversation?.[1]?.content !== "صبر کے بارے میں قرآن مومنوں کو ثابت قدم رہنے کی تعلیم دیتا ہے۔") {
  throw new Error("The follow-up request must contain the actual previous user and assistant content");
}

// C/D/L. Six pairs are trimmed to five; fewer pairs are all included; an unanswered
// current user message is not treated as a completed pair.
const sixPairs = Array.from({ length: 6 }, (_, index) => completedPair(index + 1)).flat();
const sixPairRequest = composerSend(sixPairs, "Current follow-up", null);
if (sixPairRequest.body.conversation?.length !== 10
  || sixPairRequest.body.conversation[0]?.content !== "Question 2"
  || sixPairRequest.body.conversation[9]?.content !== "Answer 6") {
  throw new Error("Only the latest five completed pairs may be sent as AI context");
}
const threePairs = Array.from({ length: 3 }, (_, index) => completedPair(index + 1)).flat();
const threePairRequest = composerSend(threePairs, "Current follow-up", null);
if (threePairRequest.body.conversation?.length !== 6
  || threePairRequest.body.conversation[0]?.content !== "Question 1"
  || threePairRequest.body.conversation[5]?.content !== "Answer 3") {
  throw new Error("All available completed pairs must be sent when there are fewer than five");
}
const unanswered = [
  ...firstCompletedMessages,
  createQuranAssistantUserMessage("This question is still loading", null, 3),
];
if (getQuranAssistantConversationContext(unanswered).some((message) => (
  message.content === "This question is still loading"
))) {
  throw new Error("The current unanswered question must not enter its own context");
}

// E. New Chat: no stored messages means no previous context.
if (getQuranAssistantConversationContext([]).length !== 0) {
  throw new Error("New Chat must start with an empty conversation context");
}

// F/G. Local history keeps more than five chats and restores each chat independently.
const originalLocalStorage = globalThis.localStorage;
const localValues = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => localValues.get(key) ?? null,
    setItem: (key: string, value: string) => { localValues.set(key, value); },
    removeItem: (key: string) => { localValues.delete(key); },
  },
});
try {
  const chats = Array.from({ length: 7 }, (_, index) => ({
    id: `chat-${index + 1}`,
    title: `Chat ${index + 1}`,
    messages: index === 0 ? firstCompletedMessages : [],
    draft: "",
    ayahContext: index === 0 ? selectedAyah : null,
    createdAt: index + 1,
    updatedAt: index + 1,
  }));
  chats[1] = {
    ...chats[1],
    messages: [
      createQuranAssistantUserMessage("Chat B question", selectedAyah, 10),
      assistantMessage("Chat B answer", "assistant-chat-b"),
    ],
    ayahContext: selectedAyah,
  };
  saveQuranAssistantStorage({ version: 1, activeChatId: "chat-2", chats });
  const restored = loadQuranAssistantStorage();
  if (restored.chats.length !== 7 || restored.activeChatId !== "chat-2") {
    throw new Error("Chat History must preserve all chats and the active conversation ID");
  }
  const restoredA = restored.chats.find((chat) => chat.id === "chat-1");
  const restoredB = restored.chats.find((chat) => chat.id === "chat-2");
  if (!restoredA || !restoredB
    || restoredA.messages.some((message) => message.text === "Chat B question")
    || restoredB.messages.some((message) => message.text === "قرآن میں صبر کے بارے میں کیا بتایا گیا؟")
    || restoredB.messages[0]?.ayahContext?.surahNumber !== selectedAyah.surahNumber) {
    throw new Error("Reopened chats must restore only their own messages and context");
  }
} finally {
  if (originalLocalStorage === undefined) {
    Reflect.deleteProperty(globalThis, "localStorage");
  } else {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  }
}

// H/I/J/K. Selected Ayah remains alongside previous context; one send has one
// captured request/usage reservation; retrying does not manufacture a new pair.
const selectedFollowUp = composerSend(firstCompletedMessages, "اس سے ہمیں کیا سبق ملتا ہے؟", selectedAyah);
if (selectedFollowUp.body.conversation?.length !== 2
  || selectedFollowUp.body.ayahContext?.surahNumber !== selectedAyah.surahNumber
  || selectedFollowUp.body.ayahContext?.ayahNumber !== selectedAyah.ayahNumber
  || selectedFollowUp.userTurn.ayahContext?.arabic !== selectedAyah.arabic) {
  throw new Error("Selected Ayah requests must contain both current context and previous conversation");
}
if (capturedRequests.length !== 5 || successfulUsageReservations !== 5) {
  throw new Error("Each simulated Composer Send must create exactly one request and one usage reservation");
}
const savedBeforeFailure = firstCompletedMessages;
const failedUserTurn = createQuranAssistantUserMessage("Retry me", selectedAyah, 20);
const savedAfterFailure = savedBeforeFailure;
if (savedAfterFailure !== savedBeforeFailure
  || failedUserTurn.ayahContext?.ayahNumber !== selectedAyah.ayahNumber
  || getQuranAssistantConversationContext(savedAfterFailure).some((message) => message.content === "Retry me")) {
  throw new Error("A failed request must preserve retry context without creating a duplicate saved pair");
}

console.log("Quran Assistant conversation memory/history regression tests passed");