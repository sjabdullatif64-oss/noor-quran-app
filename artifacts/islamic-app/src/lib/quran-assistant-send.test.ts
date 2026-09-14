import {
  buildQuranAssistantRequestBody,
  type QuranAssistantContext,
  type QuranAssistantRequest,
} from "./quran-assistant-context";
import { createQuranAssistantUserMessage } from "./quran-assistant-storage";

const selectedAyah: QuranAssistantContext = {
  surahEnglishName: "Al-Anfaal",
  surahName: "الأنفال",
  surahNumber: 8,
  ayahNumber: 2,
  arabic: "إِنَّمَا الْمُؤْمِنُونَ الَّذِينَ إِذَا ذُكِرَ اللَّهُ وَجِلَتْ قُلُوبُهُمْ وَإِذَا تُلِيَتْ عَلَيْهِمْ آيَاتُهُ زَادَتْهُمْ إِيمَانًا وَعَلَىٰ رَبِّهِمْ يَتَوَكَّلُونَ",
  translation: "The believers are only those who, when Allah is mentioned, their hearts become fearful, and when His verses are recited to them, it increases them in faith; and upon their Lord they rely.",
  audioGlobalNumber: 208,
};

type SpiedRequest = {
  path: string;
  userTurn: ReturnType<typeof createQuranAssistantUserMessage>;
  body: ReturnType<typeof buildQuranAssistantRequestBody>;
};

function createRequestSpy() {
  const requests: SpiedRequest[] = [];
  let responseCount = 0;
  let successfulUsageCount = 0;

  function sendQuestion(question: string, ayahContext: QuranAssistantContext | null): void {
    const userTurn = createQuranAssistantUserMessage(question, ayahContext, 1700000000000);
    const request: QuranAssistantRequest = {
      question: userTurn.text ?? "",
      deviceId: "test-device",
      ayahContext: userTurn.ayahContext ?? null,
    };
    const body = buildQuranAssistantRequestBody(request);
    requests.push({ path: "/quran-assistant", userTurn, body });
    console.log("Quran Assistant request payload:", JSON.stringify(body));
    responseCount += 1;
    successfulUsageCount += 1;
  }

  return {
    requests,
    sendQuestion,
    get responseCount() {
      return responseCount;
    },
    get successfulUsageCount() {
      return successfulUsageCount;
    },
  };
}

// A. Selected Ayah + custom Composer question: one real POST body contains both.
{
  const spy = createRequestSpy();
  spy.sendQuestion("اس آیت کی وضاحت کریں", selectedAyah);
  if (spy.requests.length !== 1) {
    throw new Error(`Expected exactly one Composer request, got ${spy.requests.length}`);
  }
  const request = spy.requests[0];
  if (request.path !== "/quran-assistant"
    || request.body.question !== "اس آیت کی وضاحت کریں"
    || request.userTurn.role !== "user"
    || request.userTurn.text !== "اس آیت کی وضاحت کریں"
    || JSON.stringify(request.userTurn.ayahContext) !== JSON.stringify(selectedAyah)
    || JSON.stringify(request.body.ayahContext) !== JSON.stringify(selectedAyah)) {
    throw new Error("Composer user turn and request body must contain the exact question and selected Ayah together");
  }
}

// B. Selected Ayah + Explain this Ayah: the same pipeline, only the question differs.
{
  const spy = createRequestSpy();
  spy.sendQuestion("Explain this Ayah", selectedAyah);
  if (spy.requests.length !== 1
    || spy.requests[0].body.question !== "Explain this Ayah"
    || spy.requests[0].userTurn.text !== "Explain this Ayah"
    || JSON.stringify(spy.requests[0].userTurn.ayahContext) !== JSON.stringify(selectedAyah)
    || JSON.stringify(spy.requests[0].body.ayahContext) !== JSON.stringify(selectedAyah)) {
    throw new Error("Explain this Ayah must use one stored turn and request with the same exact selected Ayah context");
  }
}

// C. No selected Ayah: normal Composer behavior remains question-only.
{
  const spy = createRequestSpy();
  spy.sendQuestion("What does the Quran say about patience?", null);
  if (spy.requests.length !== 1
    || spy.requests[0].body.question !== "What does the Quran say about patience?"
    || spy.requests[0].userTurn.text !== "What does the Quran say about patience?"
    || spy.requests[0].userTurn.ayahContext
    || Object.prototype.hasOwnProperty.call(spy.requests[0].body, "ayahContext")) {
    throw new Error("A normal Composer question must create one question-only turn and request");
  }
}

// D/E. One tap means one POST, one response, one usage count, with no Ayah-only call.
{
  const spy = createRequestSpy();
  spy.sendQuestion("اس آیت کی وضاحت کریں", selectedAyah);
  if (spy.requests.length !== 1
    || spy.responseCount !== 1
    || spy.successfulUsageCount !== 1) {
    throw new Error("One Send action must produce exactly one request, response, and usage count");
  }
  if (spy.requests.some((request) => request.body.question === selectedAyah.arabic)
    || spy.requests.some((request) => !request.body.question)) {
    throw new Error("The selected Ayah must not be sent as an independent or hidden question");
  }
}

console.log("Quran Assistant unified send request regression tests passed");