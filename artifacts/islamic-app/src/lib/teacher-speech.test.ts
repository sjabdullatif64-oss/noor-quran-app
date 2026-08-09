import assert from "node:assert/strict";
import {
  arabicSimilarityDetails,
  assess,
  isUsableTranscript,
  listenWithRetries,
  normalizeArabic,
  statusForAlternatives,
} from "./teacher-speech";
import type { TranslationLanguage } from "./api";
import { TTS_LANG_CODES } from "./translation-language-metadata";
import { getTeacherSpeechCopy } from "./teacher-speech-copy";

const translationLanguages: TranslationLanguage[] = [
  "english", "arabic", "urdu", "hindi", "bengali", "turkish", "indonesian",
  "french", "spanish", "malay", "sindhi", "persian", "german", "portuguese",
  "russian", "italian", "chinese", "japanese", "korean", "swahili", "tamil",
  "telugu", "malayalam", "punjabi", "dutch", "thai", "vietnamese",
  "azerbaijani", "bosnian", "somali", "hausa", "uzbek", "kazakh",
];

function testArabicNormalization(): void {
  assert.equal(normalizeArabic("بِسْمِ"), "بسم");
  assert.equal(normalizeArabic("مـرْحَبًا،"), "مرحبا");
  assert.equal(normalizeArabic("أ إ آ ٱ ء ؤ ئ ى ة ۀ"), "ا ا ا ا ا و ي ي ه ه");
  assert.equal(normalizeArabic("نِعْمَةٌ"), "نعمه");
}

function testSpeechRecognizerInsertionScoring(): void {
  const details = arabicSimilarityDetails("بِسْمِ", "باسمي");
  assert.equal(details.normalizedExpected, "بسم");
  assert.equal(details.normalizedActual, "باسمي");
  assert.equal(details.distance, 1);
  assert.equal(details.maxLength, 5);
  assert.equal(details.score, 80);
  assert.deepEqual(details.operations, {
    insertions: 2,
    deletions: 0,
    substitutions: 0,
  });

  const result = assess("بِسْمِ", ["باسمي"]);
  assert.equal(result.verdict, "pass");
  assert.equal(result.matchScore, 80);
  assert.equal(result.inputStatus, "recognized");
}

function testProgressivePassagesRequireTheWholePhrase(): void {
  const singleWord = assess("بِسْمِ", ["بِسْمِ"], 0.9);
  assert.equal(singleWord.verdict, "pass");

  const oneWordOfPassage = assess("بِسْمِ اللَّهِ الرَّحْمَٰنِ", ["بِسْمِ"], 0.9);
  assert.notEqual(oneWordOfPassage.verdict, "pass");

  const completePassage = assess(
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ",
    ["بِسْمِ اللَّهِ الرَّحْمَٰنِ"],
    0.9,
  );
  assert.equal(completePassage.verdict, "pass");
}

function testHardErrorsRemainMeaningful(): void {
  const consonantError = arabicSimilarityDetails("بسم", "حسم");
  assert.equal(consonantError.operations.substitutions, 1);
  assert.equal(consonantError.score, 67);

  assert.equal(isUsableTranscript("باسمي"), true);
  assert.equal(isUsableTranscript(""), false);
  assert.equal(isUsableTranscript("Didn't understand"), false);
  assert.equal(isUsableTranscript("لم أفهم"), false);
  assert.equal(statusForAlternatives(["", "Didn't understand"]), "silence");
  assert.equal(statusForAlternatives(["باسمي"]), "recognized");
}

function testNoTranscriptStatuses(): void {
  const silence = assess("بسم", [""], -1, "silence");
  assert.equal(silence.verdict, "unclear");
  assert.equal(silence.matchScore, 0);
  assert.equal(silence.inputStatus, "silence");

  const timeout = assess("بسم", [], -1, "timeout");
  assert.equal(timeout.verdict, "unclear");
  assert.equal(timeout.inputStatus, "timeout");
  assert.equal(timeout.heard, "");

  const failure = assess("بسم", [], -1, "recognition-failure");
  assert.equal(failure.verdict, "unclear");
  assert.equal(failure.inputStatus, "recognition-failure");
}

function testRecognizedLowConfidenceIsRetryableFeedback(): void {
  const result = assess("بسم", ["مرحبا"], 0.1, "recognized");
  assert.equal(result.verdict, "retry");
  assert.equal(result.inputStatus, "recognized");
}

async function testBoundedRecognitionRetries(): Promise<void> {
  const silence = () => Promise.resolve({
    alternatives: [],
    confidence: -1,
    status: "silence" as const,
    error: "no-speech" as const,
  });
  const afterSilence = await listenWithRetries(18000, 2, async (timeoutMs) => {
    assert.equal(timeoutMs, 18000);
    return silence();
  });
  assert.equal(afterSilence.attempts, 2);
  assert.equal(afterSilence.status, "silence");
  assert.deepEqual(afterSilence.errors, ["no-speech"]);

  let timeoutCalls = 0;
  const afterTimeout = await listenWithRetries(18000, 2, async () => {
    timeoutCalls++;
    return {
      alternatives: [],
      confidence: -1,
      status: "timeout" as const,
      error: "timeout" as const,
    };
  });
  assert.equal(timeoutCalls, 2);
  assert.equal(afterTimeout.attempts, 2);
  assert.equal(afterTimeout.status, "timeout");

  let recognizedCalls = 0;
  const recognized = await listenWithRetries(18000, 2, async () => {
    recognizedCalls++;
    return {
      alternatives: ["بسم"],
      confidence: 0.1,
      status: "recognized" as const,
    };
  });
  assert.equal(recognizedCalls, 1);
  assert.equal(recognized.attempts, 1);
  assert.deepEqual(recognized.alternatives, ["بسم"]);
}

function testLocalizedCopyRegistry(): void {
  assert.equal(translationLanguages.length, 33);
  for (const language of translationLanguages) {
    const copy = getTeacherSpeechCopy(language);
    assert.ok(copy.advanced.length > 0, `${language} advanced copy is empty`);
    assert.ok(copy.diagnosticsTitle.length > 0, `${language} diagnostics title is empty`);
    assert.ok(copy.recognizedText.length > 0, `${language} recognized-text label is empty`);
    assert.ok(copy.errors.length > 0, `${language} errors label is empty`);
    assert.ok(copy.errorLabels["no-speech"], `${language} no-speech copy is missing`);
    assert.ok(copy.lessonHint.length > 0, `${language} lesson hint is empty`);
    assert.ok(copy.lockedBody.length > 0, `${language} locked guidance is empty`);
    assert.ok(copy.limitBody.length > 0, `${language} limit guidance is empty`);
    assert.ok(TTS_LANG_CODES[language], `${language} TTS language code is missing`);
  }
}

testArabicNormalization();
testSpeechRecognizerInsertionScoring();
testProgressivePassagesRequireTheWholePhrase();
testHardErrorsRemainMeaningful();
testNoTranscriptStatuses();
testRecognizedLowConfidenceIsRetryableFeedback();
testLocalizedCopyRegistry();
await testBoundedRecognitionRetries();
console.log("teacher-speech tests passed");