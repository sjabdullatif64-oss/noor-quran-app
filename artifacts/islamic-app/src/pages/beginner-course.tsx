import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  BEGINNER_LEVELS,
  getBeginnerLesson,
  getBeginnerLevelLessons,
} from "@/lib/beginner-course";
import {
  getBeginnerStats,
  getNextBeginnerLesson,
  isBeginnerLevelUnlocked,
  isBeginnerLessonCompleted,
  subscribeBeginnerProgress,
} from "@/lib/beginner-progress";

function useBeginnerState() {
  const [, setTick] = useState(0);
  useEffect(() => subscribeBeginnerProgress(() => setTick((tick) => tick + 1)), []);
  return {
    stats: getBeginnerStats(),
    nextId: getNextBeginnerLesson(),
  };
}

export function BeginnerCourse() {
  const { stats, nextId } = useBeginnerState();
  const nextLesson = nextId ? getBeginnerLesson(nextId) : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8" data-testid="beginner-course">
      <div className="flex items-center gap-3">
        <Link
          href="/teacher"
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
          aria-label="Back to Quran Teacher"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-primary text-xs font-semibold uppercase tracking-[0.16em]">
            A new reading path
          </p>
          <h1 className="text-2xl font-bold text-foreground">Arabic Reading Basics</h1>
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6 overflow-hidden relative">
        <div className="absolute -right-10 -top-12 w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Start from Alif, Ba, Ta</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mt-1 max-w-lg">
            Learn Arabic reading step by step, from individual letters to short Quranic phrases.
            Every lesson is short, focused and designed for a brand-new reader.
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Course progress</span>
              <span className="text-primary font-semibold">
                {stats.completed} / {stats.total} lessons
              </span>
            </div>
            <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {nextLesson ? (
        <Link
          href={`/beginner-reading/lesson/${nextLesson.id}`}
          className="block rounded-2xl border border-primary/40 bg-primary/10 p-5 active:scale-[0.99] transition-transform"
          data-testid="beginner-next-lesson"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-semibold uppercase tracking-wide">Continue here</p>
              <p className="text-foreground font-semibold mt-1 truncate">
                Level {nextLesson.level}: {nextLesson.title}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Lesson {nextLesson.order} · Listen, repeat and practice
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-primary shrink-0" />
          </div>
        </Link>
      ) : (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center">
          <Check className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-foreground font-semibold">Course complete — Masha&apos;Allah!</p>
          <p className="text-muted-foreground text-xs mt-1">Review any lesson whenever you like.</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-foreground font-semibold">Your learning path</h2>
      </div>

      <div className="space-y-3">
        {BEGINNER_LEVELS.map((level) => {
          const unlocked = isBeginnerLevelUnlocked(level.level);
          const lessons = getBeginnerLevelLessons(level.level);
          const completed = lessons.filter((lesson) => isBeginnerLessonCompleted(lesson.id)).length;
          const firstLesson = lessons[0];

          return (
            <div
              key={level.level}
              className={`rounded-2xl border p-4 transition-colors ${
                unlocked ? "border-border bg-card" : "border-border/60 bg-card/50 opacity-70"
              }`}
              data-testid={`beginner-level-${level.level}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {unlocked ? level.level : <Lock className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-semibold text-sm">{level.title}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{level.subtitle}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {completed}/{lessons.length}
                </span>
                {unlocked && firstLesson ? (
                  <Link
                    href={`/beginner-reading/lesson/${firstLesson.id}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label={`Open ${level.title}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : null}
              </div>
              {unlocked ? (
                <div className="mt-3 h-1.5 rounded-full bg-primary/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${lessons.length ? (completed / lessons.length) * 100 : 0}%` }}
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-[11px] mt-3">
                  Complete the previous level to unlock
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}