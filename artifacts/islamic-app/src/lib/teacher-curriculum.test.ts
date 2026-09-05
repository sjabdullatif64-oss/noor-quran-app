import assert from "node:assert/strict";
import {
  CURRICULUM,
  LEVELS,
  getNextLesson,
  lessonAudioUrls,
  practiceWordCount,
} from "./teacher-curriculum";

assert.deepEqual(
  [0, 29, 30, 59, 60, 89, 90, 269, 270, 999].map(practiceWordCount),
  [1, 1, 2, 2, 3, 3, 4, 5, 5, 5],
);
assert.equal(LEVELS.length, 5);

// The original lesson IDs remain in the same order for existing learners.
assert.deepEqual(
  CURRICULUM.slice(0, 4).map((lesson) => lesson.id),
  ["l1-01", "l1-02", "l1-03", "l1-04"],
);
assert.equal(CURRICULUM.filter((lesson) => lesson.level === 5).length > 0, true);
assert.equal(getNextLesson("l4-29")?.id, "quran-0001");
assert.equal(CURRICULUM[70]?.expected.trim().split(/\s+/).length, 3);
assert.deepEqual(
  CURRICULUM[70]?.audio.sequence?.map((word) => word.word),
  [1, 2, 3],
);

const fullQuranLessons = CURRICULUM.filter((lesson) => lesson.level === 5);
assert.equal(fullQuranLessons.at(-1)?.audio.surah, 114);
assert.equal(
  fullQuranLessons.every((lesson) => {
    const words = lesson.expected.trim().split(/\s+/).filter(Boolean);
    return words.length >= 1 &&
      words.length <= 5 &&
      lesson.audio.sequence?.length === words.length &&
      lessonAudioUrls(lesson).length === words.length;
  }),
  true,
);

console.log("teacher curriculum tests passed");