import assert from "node:assert/strict";
import {
  arabicSimilarityDetails,
  assess,
  isUsableTranscript,
  normalizeArabic,
  statusForAlternatives,
} from "./teacher-speech";

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

testArabicNormalization();
testSpeechRecognizerInsertionScoring();
testHardErrorsRemainMeaningful();
testNoTranscriptStatuses();
console.log("teacher-speech tests passed");