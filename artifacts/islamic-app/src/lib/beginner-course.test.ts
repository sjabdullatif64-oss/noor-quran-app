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
  firstLetters.slice(0, 3).map((lesson) => lesson.arabic),
  ["ا", "ب", "ت"],
);
assert.equal(firstLetters[0].title, "Alif");
assert.equal(firstLetters[1].title, "Ba");
assert.equal(firstLetters[2].title, "Ta");

assert.equal(BEGINNER_LEVELS.length, 10);
assert.equal(BEGINNER_LESSONS.length, 60);
assert.equal(new Set(BEGINNER_LESSONS.map((lesson) => lesson.id)).size, BEGINNER_LESSONS.length);
assert.ok(getBeginnerLesson("letters-01"));
assert.ok(getBeginnerLesson("foundation-01"));

for (const level of BEGINNER_LEVELS) {
  const lessons = getBeginnerLevelLessons(level.level);
  assert.ok(lessons.length > 0, `level ${level.level} has no lessons`);
  assert.deepEqual(level.lessonIds, lessons.map((lesson) => lesson.id));
}

console.log("beginner course tests passed");