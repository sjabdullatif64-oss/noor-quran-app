import {
  BEGINNER_LESSONS,
  BEGINNER_LEVELS,
  getBeginnerLesson,
} from "./beginner-course";

export const BEGINNER_PROGRESS_KEY = "noor-beginner-reading-progress-v1";
export const BEGINNER_PROGRESS_CHANGED_EVENT = "noor:beginner-progress-changed";

export interface BeginnerProgress {
  completed: Record<string, string>;
}

function emptyProgress(): BeginnerProgress {
  return { completed: {} };
}

export function loadBeginnerProgress(): BeginnerProgress {
  try {
    const raw = localStorage.getItem(BEGINNER_PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as BeginnerProgress;
    if (!parsed || typeof parsed !== "object" || !parsed.completed) {
      return emptyProgress();
    }
    return parsed;
  } catch {
    return emptyProgress();
  }
}

function saveBeginnerProgress(progress: BeginnerProgress): void {
  try {
    localStorage.setItem(BEGINNER_PROGRESS_KEY, JSON.stringify(progress));
    window.dispatchEvent(new Event(BEGINNER_PROGRESS_CHANGED_EVENT));
  } catch {
    // The course remains usable if storage is unavailable.
  }
}

export function isBeginnerLessonCompleted(id: string): boolean {
  return Boolean(loadBeginnerProgress().completed[id]);
}

export function isBeginnerLevelUnlocked(level: number): boolean {
  if (level <= 1) return true;
  const previous = BEGINNER_LEVELS.find((item) => item.level === level - 1);
  if (!previous) return false;
  const progress = loadBeginnerProgress();
  return previous.lessonIds.every((id) => Boolean(progress.completed[id]));
}

export function isBeginnerLessonUnlocked(id: string): boolean {
  const lesson = getBeginnerLesson(id);
  if (!lesson || !isBeginnerLevelUnlocked(lesson.level)) return false;
  const progress = loadBeginnerProgress();
  if (progress.completed[id]) return true;
  return BEGINNER_LESSONS.find(
    (candidate) =>
      candidate.level === lesson.level && !progress.completed[candidate.id],
  )?.id === id;
}

export function getNextBeginnerLesson(): string | null {
  const progress = loadBeginnerProgress();
  const next = BEGINNER_LESSONS.find(
    (lesson) => !progress.completed[lesson.id] && isBeginnerLevelUnlocked(lesson.level),
  );
  return next?.id ?? null;
}

export function completeBeginnerLesson(id: string): boolean {
  if (!getBeginnerLesson(id) || !isBeginnerLessonUnlocked(id)) return false;
  const progress = loadBeginnerProgress();
  if (!progress.completed[id]) {
    progress.completed[id] = new Date().toISOString();
    saveBeginnerProgress(progress);
  }
  return true;
}

export function getBeginnerStats(): {
  completed: number;
  total: number;
  percentage: number;
} {
  const progress = loadBeginnerProgress();
  const completed = BEGINNER_LESSONS.filter((lesson) => progress.completed[lesson.id]).length;
  return {
    completed,
    total: BEGINNER_LESSONS.length,
    percentage: BEGINNER_LESSONS.length
      ? Math.round((completed / BEGINNER_LESSONS.length) * 100)
      : 0,
  };
}

export function subscribeBeginnerProgress(listener: () => void): () => void {
  window.addEventListener(BEGINNER_PROGRESS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(BEGINNER_PROGRESS_CHANGED_EVENT, listener);
}