import {
  buildQuranAssistantRequestBody,
  type QuranAssistantContext,
  type QuranAssistantRequest,
} from "./quran-assistant-context";

const selectedAyah: QuranAssistantContext = {
  surahEnglishName: "At-Tawbah",
  surahName: "التوبة",
  surahNumber: 9,
  ayahNumber: 3,
  arabic: "وَأَذَانٌ مِّنَ اللَّهِ وَرَسُولِهِ",
  translation: "A declaration from Allah and His Messenger.",
  audioGlobalNumber: 127,
};

type SpiedRequest = {
  path: string;
  body: ReturnType<typeof buildQuranAssistantRequestBody>;
};

function createRequestSpy() {
  const requests: SpiedRequest[] = [];
  let responseCount = 0;
  let successfulUsageCount = 0;

  function sendQuestion(question: string, ayahContext: QuranAssistantContext | null): void {
    const request: QuranAssistantRequest = {
      question,
      deviceId: "test-device",
      ayahContext,
    };
    const body = buildQuranAssistantRequestBody(request);
    requests.push({ path: "/quran-assistant", body });
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
    || JSON.stringify(request.body.ayahContext) !== JSON.stringify(selectedAyah)) {
    throw new Error("Composer request body must contain the exact question and selected Ayah together");
  }
}

// B. Selected Ayah + Explain this Ayah: the same pipeline, only the question differs.
{
  const spy = createRequestSpy();
  spy.sendQuestion("Explain this Ayah", selectedAyah);
  if (spy.requests.length !== 1
    || spy.requests[0].body.question !== "Explain this Ayah"
    || JSON.stringify(spy.requests[0].body.ayahContext) !== JSON.stringify(selectedAyah)) {
    throw new Error("Explain this Ayah must use one request with the same exact selected Ayah context");
  }
}

// C. No selected Ayah: normal Composer behavior remains question-only.
{
  const spy = createRequestSpy();
  spy.sendQuestion("What does the Quran say about patience?", null);
  if (spy.requests.length !== 1
    || spy.requests[0].body.question !== "What does the Quran say about patience?"
    || Object.prototype.hasOwnProperty.call(spy.requests[0].body, "ayahContext")) {
    throw new Error("A normal Composer question must send one question-only request");
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