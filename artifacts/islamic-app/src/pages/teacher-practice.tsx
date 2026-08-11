/**
 * Noor Quran — AI Quran Teacher: Practice Mode
 *
 * This is a separate review surface. It only links to completed lessons and
 * never changes the user's course position or completion records.
 */

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CheckCircle2, Clock3, RotateCcw, Search, X } from "lucide-react";
import { Link } from "wouter";
import { CURRICULUM } from "@/lib/teacher-curriculum";
import {
  getPracticeStats,
  loadProgress,
  loadPracticeStats,
  subscribeProgress,
  type PracticeStats,
} from "@/lib/teacher-progress";

function formatLastPracticed(value: string | null): string {
  if (!value) return "Not practiced yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not practiced yet";
  return `Last practiced ${date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function TeacherPractice() {
  const [, setTick] = useState(0);
  const [practiceStats, setPracticeStats] = useState<PracticeStats>(() => loadPracticeStats());

  useEffect(() => {
    const refresh = () => {
      setPracticeStats(loadPracticeStats());
      setTick((tick) => tick + 1);
    };
    return subscribeProgress(refresh);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const progress = loadProgress();
  const completedLessons = CURRICULUM.filter((lesson) => Boolean(progress.completed[lesson.id]));
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = normalizeSearchText(searchQuery);
  const filteredLessons = useMemo(() => {
    if (!normalizedQuery) return completedLessons;
    return completedLessons.filter((lesson) => {
      const searchableText = [
        lesson.id,
        `level ${lesson.level}`,
        `lesson ${lesson.order}`,
        lesson.arabic,
        lesson.word,
        lesson.transliteration,
        lesson.meaning,
      ].join(" ");
      return normalizeSearchText(searchableText).includes(normalizedQuery);
    });
  }, [completedLessons, normalizedQuery]);

  return (
    <div className="min-h-screen pb-32 md:pb-12 animate-in fade-in duration-500 bg-background">
      <div className="px-4 pt-8 pb-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground"
            data-testid="link-back-teacher-practice"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Practice Completed Lessons</h1>
            <p className="text-muted-foreground text-xs">
              Repeat any completed lesson with the full AI Teacher check.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 max-w-2xl mx-auto">
        {completedLessons.length === 0 ? (
          <div
            className="rounded-2xl p-6 border border-border text-center bg-card"
            data-testid="panel-practice-empty"
          >
            <RotateCcw className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-foreground font-semibold text-sm">No completed lessons yet</p>
            <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
              Complete your first lesson to unlock unlimited practice here.
            </p>
            <Link
              href="/teacher"
              className="inline-flex mt-4 px-5 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground bg-primary"
              data-testid="link-start-learning-from-practice"
            >
              Back to Teacher
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-4 border border-border bg-card">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <p className="text-foreground font-semibold text-sm">
                  {completedLessons.length} completed lesson{completedLessons.length === 1 ? "" : "s"} available
                </p>
              </div>
              <p className="text-muted-foreground text-xs mt-1">
                Practice scores are tracked separately and never change your learning progress.
              </p>
            </div>

            <div
              className="rounded-2xl p-3 border border-border bg-card"
              data-testid="panel-search-completed-lessons"
            >
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-primary pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search completed lessons..."
                  aria-label="Search completed lessons"
                  className="w-full h-11 rounded-xl border border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary"
                  data-testid="input-search-completed-lessons"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label="Clear lesson search"
                    data-testid="button-clear-completed-lesson-search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {normalizedQuery && (
                <p className="px-1 pt-2 text-[11px] text-muted-foreground">
                  {filteredLessons.length} of {completedLessons.length} completed lessons
                </p>
              )}
            </div>

            {filteredLessons.length === 0 ? (
              <div
                className="rounded-2xl p-6 border border-border text-center bg-card"
                data-testid="panel-completed-lessons-no-results"
              >
                <Search className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="text-foreground font-semibold text-sm">No matching lessons found</p>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                  Try searching by Arabic, transliteration, meaning, or lesson number.
                </p>
              </div>
            ) : filteredLessons.map((lesson) => {
              const completion = progress.completed[lesson.id];
              const stats = practiceStats[lesson.id] ?? getPracticeStats(lesson.id);
              return (
                <div
                  key={lesson.id}
                  className="rounded-2xl p-4 border border-border bg-card"
                  data-testid={`card-practice-${lesson.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                      <span className="font-arabic text-xl text-primary" dir="rtl">{lesson.arabic}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-semibold truncate">
                        Level {lesson.level} · Lesson {lesson.order}
                      </p>
                      <p className="text-muted-foreground text-xs truncate">
                        {lesson.transliteration} · Best learning score {completion.accuracy}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border text-center">
                    <div>
                      <p className="text-primary font-bold text-sm">{stats.sessions}</p>
                      <p className="text-muted-foreground text-[10px]">Practice sessions</p>
                    </div>
                    <div>
                      <p className="text-primary font-bold text-sm">
                        {stats.bestScore === null ? "—" : `${stats.bestScore}%`}
                      </p>
                      <p className="text-muted-foreground text-[10px]">Best practice score</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-primary font-bold text-sm flex justify-center">
                        <Clock3 className="w-4 h-4" />
                      </p>
                      <p className="text-muted-foreground text-[10px] truncate">
                        {formatLastPracticed(stats.lastPracticedAt)}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/teacher/practice/${lesson.id}`}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-primary-foreground bg-primary active:scale-[0.99]"
                    data-testid={`button-practice-again-${lesson.id}`}
                  >
                    <RotateCcw className="w-4 h-4" /> Practice Again
                  </Link>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}