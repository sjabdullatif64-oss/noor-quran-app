import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  Headphones,
  Loader2,
  RotateCcw,
  Volume2,
  X,
} from "lucide-react";
import { NativeTTS } from "@/lib/native-tts";
import { getBeginnerLesson } from "@/lib/beginner-course";
import {
  completeBeginnerLesson,
  getNextBeginnerLesson,
  isBeginnerLessonCompleted,
  isBeginnerLessonUnlocked,
} from "@/lib/beginner-progress";

type LessonStep = "learn" | "practice" | "complete";

export function BeginnerLesson() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const lesson = id ? getBeginnerLesson(id) : undefined;
  const [step, setStep] = useState<LessonStep>("learn");
  const [speaking, setSpeaking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!lesson || !isBeginnerLessonUnlocked(lesson.id)) {
      setLocation("/beginner-reading", { replace: true });
    }
  }, [lesson, setLocation]);

  useEffect(() => {
    return () => {
      void NativeTTS.stop().catch(() => {});
    };
  }, []);

  const speak = useCallback(async () => {
    if (!lesson) return;
    setSpeaking(true);
    try {
      await NativeTTS.stop();
      await NativeTTS.speak({
        text: lesson.audioText,
        lang: "ar-SA",
        rate: 0.7,
      });
    } catch {
      // The lesson remains usable without a device voice.
    } finally {
      setSpeaking(false);
    }
  }, [lesson]);

  const choices = useMemo(() => {
    if (!lesson) return [];
    return [...lesson.choices].sort((a, b) => a.localeCompare(b, "ar"));
  }, [lesson]);

  if (!lesson || !isBeginnerLessonUnlocked(lesson.id)) return null;

  const markComplete = () => {
    if (completeBeginnerLesson(lesson.id)) {
      setSaved(true);
      setStep("complete");
    }
  };

  const choose = (choice: string) => {
    if (answered) return;
    setSelected(choice);
    setAnswered(true);
    setCorrect(choice === lesson.arabic);
  };

  const resetPractice = () => {
    setSelected(null);
    setAnswered(false);
    setCorrect(false);
  };

  const nextId = saved ? getNextBeginnerLesson() : null;

  return (
    <div className="max-w-2xl mx-auto pb-8" data-testid="beginner-lesson">
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/beginner-reading"
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
          aria-label="Back to Arabic Reading Basics"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <p className="text-primary text-xs font-semibold uppercase tracking-[0.16em]">
            Level {lesson.level}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">Lesson {lesson.order}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex gap-1.5 mb-6" aria-label="Lesson steps">
        {(["learn", "practice", "complete"] as LessonStep[]).map((item, index) => (
          <div
            key={item}
            className={`h-1.5 flex-1 rounded-full ${
              step === item || index < ["learn", "practice", "complete"].indexOf(step)
                ? "bg-primary"
                : "bg-primary/15"
            }`}
          />
        ))}
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 text-center">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.16em] font-semibold">
          {lesson.title}
        </p>
        <div
          className="font-arabic text-6xl sm:text-7xl text-foreground leading-tight mt-7 mb-4"
          dir="rtl"
          aria-label={lesson.title}
        >
          {lesson.arabic}
        </div>
        <p className="text-primary font-medium">{lesson.transliteration}</p>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mt-3">
          {lesson.explanation}
        </p>

        <button
          type="button"
          onClick={() => void speak()}
          disabled={speaking}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 font-semibold text-sm active:scale-95 transition-transform disabled:opacity-60"
          data-testid="beginner-listen"
        >
          {speaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
          {speaking ? "Playing…" : "Listen"}
        </button>
      </section>

      {step === "learn" ? (
        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Headphones className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-foreground font-semibold text-sm">Learn · Listen · Repeat</p>
              <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                Listen carefully, repeat the sound out loud, then check that you can recognize it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep("practice")}
            className="w-full mt-5 rounded-xl border border-primary/40 bg-primary/10 text-primary px-4 py-3 font-semibold text-sm"
          >
            I repeated it
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </section>
      ) : null}

      {step === "practice" ? (
        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CircleHelp className="w-5 h-5 text-primary" />
            <div>
              <p className="text-foreground font-semibold text-sm">Quick check</p>
              <p className="text-muted-foreground text-xs">Tap the {lesson.kind === "letter" ? "letter" : "reading"} you just learned.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2" dir="rtl">
            {choices.map((choice) => {
              const isSelected = selected === choice;
              const isAnswer = answered && choice === lesson.arabic;
              const isWrong = answered && isSelected && !correct;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => choose(choice)}
                  className={`min-h-16 rounded-xl border text-2xl font-arabic transition-colors ${
                    isAnswer
                      ? "border-primary bg-primary/15 text-primary"
                      : isWrong
                        ? "border-destructive/60 bg-destructive/10 text-destructive"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                  }`}
                  aria-label={`Choose ${choice}`}
                >
                  {choice}
                  {isAnswer ? <Check className="w-4 h-4 inline ml-1" /> : null}
                  {isWrong ? <X className="w-4 h-4 inline ml-1" /> : null}
                </button>
              );
            })}
          </div>
          {answered ? (
            <div className="mt-4">
              {correct ? (
                <div className="flex items-center gap-2 text-primary text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Excellent — that is correct.
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-destructive text-xs">Not quite. Listen once more and try again.</p>
                  <button
                    type="button"
                    onClick={resetPractice}
                    className="inline-flex items-center gap-1 text-primary text-xs font-semibold shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try again
                  </button>
                </div>
              )}
            </div>
          ) : null}
          {correct ? (
            <button
              type="button"
              onClick={markComplete}
              className="w-full mt-5 rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold text-sm"
            >
              Complete lesson
              <Check className="w-4 h-4 inline ml-2" />
            </button>
          ) : null}
        </section>
      ) : null}

      {step === "complete" ? (
        <section className="mt-4 rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-foreground font-semibold mt-3">Lesson complete</h2>
          <p className="text-muted-foreground text-xs mt-1">A small step toward confident Quranic reading.</p>
          <div className="flex gap-2 mt-5">
            <Link
              href="/beginner-reading"
              className="flex-1 rounded-xl border border-border bg-card text-foreground px-4 py-3 text-sm font-semibold"
            >
              Course home
            </Link>
            {nextId ? (
              <Link
                href={`/beginner-reading/lesson/${nextId}`}
                className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold"
              >
                Next lesson
                <ArrowRight className="w-4 h-4 inline ml-2" />
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}