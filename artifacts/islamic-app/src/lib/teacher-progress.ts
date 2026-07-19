/**
 * Noor Quran — AI Quran Teacher: progress engine
 *
 * All state persisted client-side in localStorage under noor-teacher-*.
 * Completion is IDEMPOTENT per lesson id per day — a lesson id can only
 * count toward the daily limit once, so refreshes / re-entries never
 * double-count. Records include the deviceId (learnerId) so a later
 * server sync or voice-profile phase can attach to the same key.
 */

import {
  DAILY_LIMIT, REVISION_SIZE, TEACHER_PROGRESS_KEY, TEACHER_REVISION_KEY,
} from "./teacher-config";
import { CURRICULUM } from "./teacher-curriculum";
import { getDeviceId } from "./user";

export interface LessonRecord {
  /** First-completion date, YYYY-MM-DD local. */
  date: string;
  /** Best accuracy (0–100). */
  accuracy: number;
  attempts: number;
  /** True when completed without a recitation check (listen-only mode). */
  selfAssessed?: boolean;
}

export interface HistoryEntry {
  date: string; // YYYY-MM-DD local
  lessons: number; // new lessons completed that day
  accuracy: number; // average accuracy that day (0-100)
}

export interface TeacherProgress {
  learnerId: string;
  /** lessonId → first-completion record */
  completed: Record<string, LessonRecord>;
  /** lessonId → total failed attempts (for Review Mistakes) */
  mistakes: Record<string, number>;
  /** Daily counter — only lesson ids completed TODAY for the first time. */
  daily: { date: string; lessonIds: string[] };
  /** Learning-day history (most recent last). */
  history: HistoryEntry[];
  streak: { lastDate: string; count: number };
  /** Total failed attempts across all lessons (retry counter). */
  totalRetries?: number;
  /** Total time spent on lesson screens, in milliseconds. */
  timeSpentMs?: number;
}

// ── Date helpers (local time) ─────────────────────────────────────────────────

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

/** Milliseconds until the next local midnight (daily-limit reset). */
export function msUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

// ── Load / save ───────────────────────────────────────────────────────────────

function emptyProgress(): TeacherProgress {
  return {
    learnerId: getDeviceId(),
    completed: {},
    mistakes: {},
    daily: { date: todayStr(), lessonIds: [] },
    history: [],
    streak: { lastDate: "", count: 0 },
  };
}

export function loadProgress(): TeacherProgress {
  try {
    const raw = localStorage.getItem(TEACHER_PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw) as TeacherProgress;
    if (!p || typeof p !== "object" || !p.completed) return emptyProgress();
    // Roll the daily counter at local midnight
    if (p.daily?.date !== todayStr()) {
      p.daily = { date: todayStr(), lessonIds: [] };
    }
    if (!p.mistakes) p.mistakes = {};
    if (!p.history) p.history = [];
    if (!p.streak) p.streak = { lastDate: "", count: 0 };
    if (!p.learnerId) p.learnerId = getDeviceId();
    if (typeof p.totalRetries !== "number") p.totalRetries = 0;
    if (typeof p.timeSpentMs !== "number") p.timeSpentMs = 0;
    return p;
  } catch {
    return emptyProgress();
  }
}

function saveProgress(p: TeacherProgress): void {
  try {
    localStorage.setItem(TEACHER_PROGRESS_KEY, JSON.stringify(p));
  } catch { /* storage full — non-fatal */ }
  notify();
}

// ── Pub/sub so dashboard reacts to lesson-screen changes ─────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeProgress(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export type CompleteResult = "counted" | "review" | "limit-reached";

/**
 * Record a passed lesson.
 * - Already completed before → "review" (never re-counts, always allowed).
 * - New + daily limit reached → "limit-reached" (not recorded as complete).
 * - New + under limit → "counted".
 */
export function completeLesson(
  lessonId: string,
  accuracy: number,
  opts?: { selfAssessed?: boolean },
): CompleteResult {
  const p = loadProgress();
  const existing = p.completed[lessonId];

  if (existing) {
    // Review pass — update best accuracy only.
    existing.attempts += 1;
    if (!opts?.selfAssessed && (accuracy > existing.accuracy || existing.selfAssessed)) {
      existing.accuracy = accuracy;
      existing.selfAssessed = undefined;
    }
    saveProgress(p);
    return "review";
  }

  // Idempotency: if somehow already in today's list, treat as review.
  if (p.daily.lessonIds.includes(lessonId)) return "review";

  if (p.daily.lessonIds.length >= DAILY_LIMIT) return "limit-reached";

  const today = todayStr();
  p.completed[lessonId] = {
    date: today, accuracy, attempts: 1,
    ...(opts?.selfAssessed ? { selfAssessed: true } : {}),
  };
  p.daily.lessonIds.push(lessonId);

  // Streak
  if (p.streak.lastDate === today) {
    // already counted today
  } else if (p.streak.lastDate === yesterdayStr()) {
    p.streak = { lastDate: today, count: p.streak.count + 1 };
  } else {
    p.streak = { lastDate: today, count: 1 };
  }

  // History — accuracy averaged over checked (non-self-assessed) lessons only
  const todayLessons = p.daily.lessonIds;
  const checked = todayLessons.filter((id) => p.completed[id] && !p.completed[id].selfAssessed);
  const avg = checked.length
    ? Math.round(checked.reduce((sum, id) => sum + p.completed[id].accuracy, 0) / checked.length)
    : 0;
  const entry = p.history.find((h) => h.date === today);
  if (entry) {
    entry.lessons = todayLessons.length;
    entry.accuracy = avg;
  } else {
    p.history.push({ date: today, lessons: todayLessons.length, accuracy: avg });
    if (p.history.length > 60) p.history = p.history.slice(-60);
  }

  saveProgress(p);
  return "counted";
}

/** Record a failed attempt (for the Review Mistakes card + retry counter). */
export function recordMistake(lessonId: string): void {
  const p = loadProgress();
  p.mistakes[lessonId] = (p.mistakes[lessonId] ?? 0) + 1;
  p.totalRetries = (p.totalRetries ?? 0) + 1;
  saveProgress(p);
}

/** Accumulate time spent learning (called when leaving a lesson screen). */
export function addStudyTime(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) return;
  // Cap a single visit at 30 min so a backgrounded tab doesn't inflate stats
  const capped = Math.min(ms, 30 * 60 * 1000);
  const p = loadProgress();
  p.timeSpentMs = (p.timeSpentMs ?? 0) + capped;
  try {
    localStorage.setItem(TEACHER_PROGRESS_KEY, JSON.stringify(p));
  } catch { /* non-fatal */ }
  // No notify() — time updates shouldn't force re-renders mid-lesson
}

/** Clear a lesson from the mistakes list once re-passed. */
export function clearMistake(lessonId: string): void {
  const p = loadProgress();
  if (p.mistakes[lessonId]) {
    delete p.mistakes[lessonId];
    saveProgress(p);
  }
}

/** Delete ALL Teacher learning data (privacy control). */
export function resetAllProgress(): void {
  try {
    localStorage.removeItem(TEACHER_PROGRESS_KEY);
    localStorage.removeItem(TEACHER_REVISION_KEY);
  } catch { /* ignore */ }
  notify();
}

// ── Derived queries ───────────────────────────────────────────────────────────

export function isLessonCompleted(lessonId: string): boolean {
  return Boolean(loadProgress().completed[lessonId]);
}

export interface DailyStatus {
  done: number;
  limit: number;
  limitReached: boolean;
  msUntilReset: number;
}

export function getDailyStatus(): DailyStatus {
  const p = loadProgress();
  const done = p.daily.lessonIds.length;
  return {
    done,
    limit: DAILY_LIMIT,
    limitReached: done >= DAILY_LIMIT,
    msUntilReset: msUntilMidnight(),
  };
}

export interface TeacherStats {
  wordsLearned: number;
  lessonsCompleted: number;
  streak: number;
  avgAccuracy: number; // 0-100
  totalLessons: number;
  overallPct: number; // 0-100 — completed / total curriculum
  totalRetries: number;
  timeSpentMs: number;
}

export function getStats(): TeacherStats {
  const p = loadProgress();
  const records = Object.entries(p.completed);
  const wordLessons = records.filter(([id]) => id.startsWith("l3-") || id.startsWith("l4-"));
  // Accuracy is only meaningful for lessons that were actually checked by the recognizer
  const checked = records.filter(([, r]) => !r.selfAssessed);
  const avg = checked.length
    ? Math.round(checked.reduce((s, [, r]) => s + r.accuracy, 0) / checked.length)
    : 0;
  // Streak only counts if last learning day was today or yesterday
  const active =
    p.streak.lastDate === todayStr() || p.streak.lastDate === yesterdayStr();
  return {
    wordsLearned: wordLessons.length,
    lessonsCompleted: records.length,
    streak: active ? p.streak.count : 0,
    avgAccuracy: avg,
    totalLessons: CURRICULUM.length,
    overallPct: CURRICULUM.length
      ? Math.round((records.length / CURRICULUM.length) * 100)
      : 0,
    totalRetries: p.totalRetries ?? 0,
    timeSpentMs: p.timeSpentMs ?? 0,
  };
}

/** The first not-yet-completed lesson in curriculum order (Continue Learning). */
export function getNextUncompleted(): string | null {
  const p = loadProgress();
  const next = CURRICULUM.find((l) => !p.completed[l.id]);
  return next ? next.id : null;
}

/**
 * Structured progression: a lesson is unlocked if it is already completed
 * (review is always allowed) or it is the FIRST uncompleted lesson in
 * curriculum order. Everything past that is locked.
 */
export function isLessonUnlocked(lessonId: string): boolean {
  const p = loadProgress();
  if (p.completed[lessonId]) return true;
  return getNextUncompleted() === lessonId;
}

/** Lesson ids with recorded mistakes, most-failed first. */
export function getMistakeLessons(): Array<{ lessonId: string; count: number }> {
  const p = loadProgress();
  return Object.entries(p.mistakes)
    .map(([lessonId, count]) => ({ lessonId, count }))
    .sort((a, b) => b.count - a.count);
}

export function getHistory(): HistoryEntry[] {
  return [...loadProgress().history].reverse(); // most recent first
}

// ── Smart Revision ────────────────────────────────────────────────────────────
// A revision session is a queue of the learner's weakest lessons (most failed
// attempts first, then lowest accuracy). Revision lessons are always already
// completed, so they replay as reviews and never consume the daily limit.

export interface RevisionQueue {
  ids: string[];
  /** Index of the lesson currently being revised. */
  pos: number;
}

/** True when there is at least one weak lesson worth revising. */
export function hasRevisableLessons(): boolean {
  const p = loadProgress();
  return (
    Object.keys(p.mistakes).some((id) => p.completed[id]) ||
    Object.values(p.completed).some((r) => !r.selfAssessed && r.accuracy < 90)
  );
}

/** Build a fresh revision queue from mistakes + low-accuracy lessons. */
export function startRevision(): string | null {
  const p = loadProgress();
  const byMistakes = Object.entries(p.mistakes)
    .filter(([id]) => p.completed[id]) // only completed lessons can be revised
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
  const byAccuracy = Object.entries(p.completed)
    .filter(([, r]) => !r.selfAssessed && r.accuracy < 90)
    .sort((a, b) => a[1].accuracy - b[1].accuracy)
    .map(([id]) => id);
  const ids = [...new Set([...byMistakes, ...byAccuracy])].slice(0, REVISION_SIZE);
  if (ids.length === 0) return null;
  try {
    localStorage.setItem(TEACHER_REVISION_KEY, JSON.stringify({ ids, pos: 0 }));
  } catch { return null; }
  return ids[0];
}

function loadRevision(): RevisionQueue | null {
  try {
    const raw = localStorage.getItem(TEACHER_REVISION_KEY);
    if (!raw) return null;
    const q = JSON.parse(raw) as RevisionQueue;
    if (!q || !Array.isArray(q.ids) || typeof q.pos !== "number") return null;
    return q;
  } catch {
    return null;
  }
}

/** Current revision session info for a lesson id, or null if not in revision. */
export function getRevisionInfo(lessonId: string): { index: number; total: number } | null {
  const q = loadRevision();
  if (!q) return null;
  const index = q.ids.indexOf(lessonId);
  if (index === -1) return null;
  return { index: index + 1, total: q.ids.length };
}

/** Advance the revision queue past this lesson. Returns next lesson id or null when done. */
export function nextRevisionLesson(lessonId: string): string | null {
  const q = loadRevision();
  if (!q) return null;
  const idx = q.ids.indexOf(lessonId);
  if (idx === -1) return null;
  const nextIdx = idx + 1;
  if (nextIdx >= q.ids.length) {
    endRevision();
    return null;
  }
  try {
    localStorage.setItem(TEACHER_REVISION_KEY, JSON.stringify({ ids: q.ids, pos: nextIdx }));
  } catch { /* ignore */ }
  return q.ids[nextIdx];
}

export function endRevision(): void {
  try { localStorage.removeItem(TEACHER_REVISION_KEY); } catch { /* ignore */ }
}
