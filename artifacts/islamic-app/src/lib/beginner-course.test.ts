import assert from "node:assert/strict";
import {
  BEGINNER_LESSONS,
  BEGINNER_LEVELS,
  getBeginnerLesson,
  getBeginnerLevelLessons,
} from "./beginner-course";

const firstLetters = getBeginnerLevelLessons(1);
assert.equal(firstLetters.length, 28);
assert.deepEqual(
  firstLetters.map((lesson) => lesson.arabic),
  ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "و", "ه", "ي"],
);
assert.equal(firstLetters[0].title, "Alif");
assert.equal(firstLetters[1].title, "Ba");
assert.equal(firstLetters[2].title, "Ta");

assert.equal(BEGINNER_LEVELS.length, 13);
assert.equal(BEGINNER_LESSONS.length, 556);
assert.equal(new Set(BEGINNER_LESSONS.map((lesson) => lesson.id)).size, BEGINNER_LESSONS.length);
assert.ok(getBeginnerLesson("letters-01"));
assert.ok(getBeginnerLesson("foundation-01"));

for (const level of BEGINNER_LEVELS) {
  const lessons = getBeginnerLevelLessons(level.level);
  assert.ok(lessons.length > 0, `level ${level.level} has no lessons`);
  assert.deepEqual(level.lessonIds, lessons.map((lesson) => lesson.id));
  if (level.level > 1) {
    assert.equal(lessons.length, 44, `level ${level.level} should contain 44 actual practice items`);
  }
  console.log(`level ${level.level}: ${level.title} = ${lessons.length} underlying items`);
}

console.log("beginner course tests passed");