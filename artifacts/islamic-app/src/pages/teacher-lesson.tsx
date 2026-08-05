/**
 * Noor Quran — AI Quran Teacher: lesson screen
 * Flow: Listen → Read → Check → Correct → Retry → Pass → Next
 * Privacy-first: consent before first mic use; permission requested just-in-time.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ChevronLeft, Volume2, Mic, RotateCcw, ArrowRight, ShieldCheck,
  CheckCircle2, Ear, MicOff, WifiOff, Sparkles, Loader2,
} from "lucide-react";
import {
  MAX_RECORD_MS, MAX_RETRIES, TEACHER_CONSENT_KEY,
} from "@/lib/teacher-config";
import {
  getLesson, getLevelLessons, getNextLesson, lessonAudioUrl, LEVELS,
  type TeacherLesson,
} from "@/lib/teacher-curriculum";
import {
  completeLesson, clearMistake, recordMistake, getDailyStatus,
  isLessonCompleted, isLessonUnlocked, getNextUncompleted,
  addStudyTime, getRevisionInfo, nextRevisionLesson,
  type CompleteResult,
} from "@/lib/teacher-progress";
import {
  assess, getSpeechSupport, checkSpeechPermission, requestSpeechPermission,
  listenOnce, stopListening, normalizeArabic, openAppSettings, getSpeechSupportReason,
  type Assessment, type SpeechSupport,
} from "@/lib/teacher-speech";
import { isConnected } from "@/lib/capacitor";
import { BUILD_INFO } from "@/lib/buildInfo";
import {
  clearTeacherDiagnosticEntries,
  getTeacherDiagnosticEntries,
  installTeacherTouchDiagnostics,
  teacherDiag,
} from "@/lib/teacher-touch-diagnostics";

// ── Consent helpers ───────────────────────────────────────────────────────────

function hasConsent(): boolean {
  try { return localStorage.getItem(TEACHER_CONSENT_KEY) === "granted"; }
  catch { return false; }
}
function grantConsent(): void {
  try { localStorage.setItem(TEACHER_CONSENT_KEY, "granted"); } catch { /* ignore */ }
}

// ── UI state machine ──────────────────────────────────────────────────────────

type Phase =
  | "idle"          // before anything — Listen encouraged
  | "consent"       // consent screen shown
  | "recording"     // mic held down
  | "checking"      // waiting on recognizer result
  | "passed"        // assessment passed
  | "feedback"      // assessment failed — show tips
  | "unclear"       // couldn't hear clearly
  | "mic-denied"    // permission denied
  | "no-mic"        // no recognizer available (listen-only)
  | "offline"       // no connection for recognition
  | "limit";        // daily limit reached (new lesson)

export function TeacherLesson() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const lesson = getLesson(params.id ?? "");

  const [phase, setPhase] = useState<Phase>("idle");
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<Assessment | null>(null);
  const [support, setSupport] = useState<SpeechSupport>("none");
  const [playing, setPlaying] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [completedNow, setCompletedNow] = useState<CompleteResult | null>(null);
  const [settingsFailed, setSettingsFailed] = useState(false);
  const [noMicReason, setNoMicReason] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticEntries, setDiagnosticEntries] = useState<string[]>(() => getTeacherDiagnosticEntries());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const readNowButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    teacherDiag("lesson component mounted", {
      buildVersion: BUILD_INFO.version,
      buildCommit: BUILD_INFO.commitSha,
      path: window.location.pathname,
      lessonId: params.id,
      lessonFound: Boolean(lesson),
      phase,
      isNative: Boolean(
        (window as Window & {
          Capacitor?: { isNativePlatform?: () => boolean };
        }).Capacitor?.isNativePlatform?.(),
      ),
    });
    getSpeechSupport((message) => teacherDiag("Speech support step", { message }))
      .then((resolved) => {
        teacherDiag("Speech support initial resolution", { support: resolved });
        setSupport(resolved);
      })
      .catch((error) => {
        teacherDiag("Speech support initial resolution rejected", { error: String(error) }, "error");
        setSupport("none");
      });
  }, []);

  useEffect(() => {
    teacherDiag("lesson render state", {
      lessonId: lesson?.id,
      phase,
      buttonPresent: Boolean(readNowButtonRef.current),
      buttonDisabled: readNowButtonRef.current?.disabled,
      buttonPointerEvents: readNowButtonRef.current
        ? getComputedStyle(readNowButtonRef.current).pointerEvents
        : undefined,
    });
    return installTeacherTouchDiagnostics(readNowButtonRef.current, {
      lessonId: lesson?.id ?? String(params.id ?? ""),
      phase,
    });
  }, [lesson?.id, params.id, phase]);

  useEffect(() => {
    const refresh = () => setDiagnosticEntries(getTeacherDiagnosticEntries());
    window.addEventListener("noor:teacher-diagnostic", refresh);
    window.addEventListener("noor:teacher-diagnostic-cleared", refresh);
    return () => {
      window.removeEventListener("noor:teacher-diagnostic", refresh);
      window.removeEventListener("noor:teacher-diagnostic-cleared", refresh);
    };
  }, []);

  // Reset state when navigating between lessons
  useEffect(() => {
    setPhase("idle");
    setAttempts(0);
    setResult(null);
    setCompletedNow(null);
    setRecordMs(0);
    window.scrollTo({ top: 0 });
  }, [params.id]);

  // Track time spent learning (per lesson visit)
  useEffect(() => {
    const start = Date.now();
    return () => addStudyTime(Date.now() - start);
  }, [params.id]);

  useEffect(() => () => {
    audioRef.current?.pause();
    stopListening().catch(() => {});
    if (recordTimer.current) clearInterval(recordTimer.current);
  }, []);

  const playAudio = useCallback(() => {
    if (!lesson) return;
    audioRef.current?.pause();
    const audio = new Audio(lessonAudioUrl(lesson));
    audioRef.current = audio;
    setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play().catch(() => setPlaying(false));
  }, [lesson]);

  // ── Recording flow ──────────────────────────────────────────────────────────

  const beginRecording = useCallback(async () => {
    teacherDiag("beginRecording entered", { lessonId: lesson?.id, phase });
    if (!lesson) {
      teacherDiag("beginRecording return: lesson missing");
      return;
    }

    // Daily-limit gate applies only to NEW lessons
    if (!isLessonCompleted(lesson.id) && getDailyStatus().limitReached) {
      teacherDiag("beginRecording return: daily limit reached", { lessonId: lesson.id });
      setPhase("limit");
      return;
    }
    if (!hasConsent()) {
      teacherDiag("beginRecording return: consent required", { lessonId: lesson.id });
      setPhase("consent");
      return;
    }

    teacherDiag("beginRecording before getSpeechSupport");
    let sup: SpeechSupport;
    try {
      sup = await getSpeechSupport();
      teacherDiag("beginRecording after getSpeechSupport", { support: sup });
    } catch (error) {
      teacherDiag("beginRecording exception: getSpeechSupport", { error: String(error) });
      throw error;
    }
    setSupport(sup);
    if (sup === "none") {
      teacherDiag("beginRecording return: no speech support");
      setNoMicReason(getSpeechSupportReason());
      setPhase("no-mic");
      return;
    }

    teacherDiag("beginRecording before isConnected");
    let connected: boolean;
    try {
      connected = await isConnected();
      teacherDiag("beginRecording after isConnected", { connected });
    } catch (error) {
      teacherDiag("beginRecording exception: isConnected", { error: String(error) });
      throw error;
    }
    if (!connected) {
      teacherDiag("beginRecording return: offline");
      setPhase("offline");
      return;
    }

    teacherDiag("beginRecording before checkSpeechPermission");
    let perm: Awaited<ReturnType<typeof checkSpeechPermission>>;
    try {
      perm = await checkSpeechPermission();
      teacherDiag("beginRecording after checkSpeechPermission", { permission: perm });
    } catch (error) {
      teacherDiag("beginRecording exception: checkSpeechPermission", { error: String(error) });
      throw error;
    }
    if (perm === "denied") {
      teacherDiag("beginRecording return: permission denied");
      setPhase("mic-denied");
      return;
    }

    if (perm === "prompt" && sup === "native") {
      teacherDiag("beginRecording before requestSpeechPermission");
      let granted: Awaited<ReturnType<typeof requestSpeechPermission>>;
      try {
        granted = await requestSpeechPermission();
        teacherDiag("beginRecording after requestSpeechPermission", { permission: granted });
      } catch (error) {
        teacherDiag("beginRecording exception: requestSpeechPermission", { error: String(error) });
        throw error;
      }
      if (granted !== "granted") {
        teacherDiag("beginRecording return: permission not granted");
        setPhase("mic-denied");
        return;
      }
    }

    teacherDiag("beginRecording entering recording phase");
    setPhase("recording");
    setRecordMs(0);
    const started = Date.now();
    recordTimer.current = setInterval(() => setRecordMs(Date.now() - started), 100);

    teacherDiag("beginRecording before listenOnce", { timeoutMs: MAX_RECORD_MS });
    let res: Awaited<ReturnType<typeof listenOnce>>;
    try {
      res = await listenOnce(MAX_RECORD_MS);
      teacherDiag("beginRecording after listenOnce", {
        error: res.error,
        alternatives: res.alternatives.length,
      });
    } catch (error) {
      teacherDiag("beginRecording exception: listenOnce", { error: String(error) });
      throw error;
    }

    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
    setPhase("checking");

    if (res.error === "not-allowed") {
      teacherDiag("beginRecording return: listen not allowed");
      setPhase("mic-denied");
      return;
    }
    if (res.error === "network") {
      teacherDiag("beginRecording return: listen network error");
      setPhase("offline");
      return;
    }

    teacherDiag("beginRecording before assess");
    const a = assess(lesson.expected, res.alternatives, res.confidence);
    teacherDiag("beginRecording after assess", { verdict: a.verdict, score: a.matchScore });
    setResult(a);

    if (a.verdict === "pass") {
      const cr = completeLesson(lesson.id, a.matchScore);
      clearMistake(lesson.id);
      setCompletedNow(cr);
      if (cr === "limit-reached") setPhase("limit");
      else setPhase("passed");
    } else if (a.verdict === "unclear") {
      setPhase("unclear");
    } else {
      setAttempts((n) => n + 1);
      recordMistake(lesson.id);
      setPhase("feedback");
    }
  }, [lesson]);

  /** Tap "Read Now" → permission (first time) → listen; auto-stops after MAX_RECORD_MS. */
  const onReadNow = useCallback(() => {
    teacherDiag("Read Now React onClick ENTERED", {
      lessonId: lesson?.id,
      phase,
      buttonDisabled: readNowButtonRef.current?.disabled,
    });
    try {
      const pending = beginRecording();
      teacherDiag("Read Now beginRecording invoked", { returnedPromise: Boolean(pending) });
      pending.catch((error) => {
        teacherDiag("Read Now beginRecording rejected", { error: String(error) });
      });
    } catch (error) {
      teacherDiag("Read Now handler exception", { error: String(error) });
    }
  }, [beginRecording, lesson?.id, phase]);

  /** Tap "Stop" while listening → finish early and check what was heard. */
  const onStop = useCallback(() => {
    stopListening().catch(() => {});
  }, []);

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!lesson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-background">
        <p className="text-muted-foreground text-sm">Lesson not found.</p>
        <Link href="/teacher" className="text-primary text-sm underline">Back to Teacher</Link>
      </div>
    );
  }

  // Structured progression: only completed lessons (review) and the next
  // uncompleted lesson are accessible. Everything ahead is locked.
  if (!isLessonUnlocked(lesson.id)) {
    const nextAllowed = getNextUncompleted();
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center bg-background"
        data-testid="panel-locked">
        <p className="text-foreground font-semibold text-sm">This lesson is still locked</p>
        <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
          Lessons unlock one at a time as you pass them — step by step is how strong reading is
          built.
        </p>
        {nextAllowed && (
          <Link href={`/teacher/lesson/${nextAllowed}`}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground bg-primary">
            Go to your current lesson
          </Link>
        )}
        <Link href="/teacher" className="text-primary text-xs underline mt-1">Back to Teacher</Link>
      </div>
    );
  }

  const levelInfo = LEVELS[lesson.level - 1];
  const levelLessons = getLevelLessons(lesson.level);
  const next = getNextLesson(lesson.id);
  const alreadyDone = isLessonCompleted(lesson.id);
  // Smart Revision session (queue of weakest lessons)
  const revision = getRevisionInfo(lesson.id);
  // Strict gate: "Pass & Next" unlocks only after the AI check passes THIS visit.
  // Outside revision, an already-completed lesson may be skipped forward (review).
  // In revision, a fresh pass is always required.
  const passed = phase === "passed" || (!revision && alreadyDone && phase === "idle");

  // Highlight the target letter inside the word (letter/harakat lessons)
  const wordDisplay = lesson.highlight ? (
    <span dir="rtl">
      {lesson.word.split("").map((ch, i) => (
        <span
          key={i}
          className={lesson.highlight.includes(ch) ? "text-amber-300" : undefined}
        >
          {ch}
        </span>
      ))}
    </span>
  ) : (
    <span dir="rtl">{lesson.word}</span>
  );

  return (
    <div
      className="min-h-screen pb-32 md:pb-12 animate-in fade-in duration-300 bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-6 pb-3 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link
            href="/teacher"
            className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground"
            data-testid="link-back-teacher"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-foreground text-sm font-semibold truncate">
              Level {lesson.level}: {levelInfo.title}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {revision
                ? `Smart Revision · ${revision.index} of ${revision.total}`
                : `Lesson ${lesson.order} of ${levelLessons.length}${alreadyDone ? " · completed" : ""}`}
            </p>
          </div>
          <p className="text-muted-foreground text-xs shrink-0">{lesson.order}/{levelLessons.length}</p>
        </div>
        {/* Level progress bar */}
        <div className="max-w-2xl mx-auto mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(lesson.order / levelLessons.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-4 space-y-4 max-w-2xl mx-auto pt-2">
        {/* The word card */}
        <div
          className="rounded-3xl p-8 border border-border text-center bg-card"
        >
          {lesson.highlight && (
            <p className="text-foreground font-arabic text-6xl mb-3" dir="rtl" data-testid="text-target">
              {lesson.arabic}
            </p>
          )}
          <p
            className={`text-foreground font-arabic leading-relaxed ${lesson.highlight ? "text-4xl" : "text-6xl"}`}
            data-testid="text-lesson-word"
          >
            {wordDisplay}
          </p>
          <p className="text-muted-foreground text-base mt-4 font-medium">{lesson.transliteration}</p>
          <p className="text-muted-foreground text-sm mt-1">&ldquo;{lesson.meaning}&rdquo;</p>

          <button
            onClick={playAudio}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-primary-foreground border border-border bg-primary transition-all active:scale-95"
            data-testid="button-listen"
          >
            {playing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
            Listen
          </button>
          <p className="text-muted-foreground text-[10px] mt-2">Verified recitation — listen as many times as you like</p>
        </div>

        {/* Tip */}
        <div className="rounded-2xl border border-border p-4 flex gap-3 bg-card">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-muted-foreground text-xs leading-relaxed">{lesson.tip}</p>
        </div>

        {/* ── State panels ── */}

        {phase === "consent" && (
          <div className="relative z-30 rounded-2xl border border-border p-5 bg-card" data-testid="panel-consent">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <p className="text-foreground font-semibold text-sm">Before you start speaking</p>
            </div>
            <ul className="text-muted-foreground text-xs leading-relaxed space-y-2 mb-4 list-disc pl-4">
              <li>Your recitation is processed by <strong className="text-primary">your device&apos;s speech-recognition service</strong> — on most Android devices this is provided by Google and audio may be processed on Google&apos;s servers.</li>
              <li>Noor Quran itself <strong className="text-primary">never saves or uploads</strong> audio files of your voice.</li>
              <li>Only the recognized text is used — for instant feedback — then discarded.</li>
              <li>You can delete all learning data anytime from the Teacher home screen.</li>
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  teacherDiag("Consent Continue onClick ENTERED", { lessonId: lesson.id, phase });
                  try {
                    grantConsent();
                    teacherDiag("Consent granted; setting idle and invoking beginRecording");
                    setPhase("idle");
                    beginRecording().catch((error) => {
                      teacherDiag("Consent beginRecording rejected", { error: String(error) }, "error");
                    });
                  } catch (error) {
                    teacherDiag("Consent Continue handler exception", { error: String(error) }, "error");
                  }
                }}
                className="relative z-30 flex-1 touch-manipulation pointer-events-auto py-3 rounded-xl text-sm font-semibold text-primary-foreground bg-primary"
                data-testid="button-consent-agree"
              >
                I understand — continue
              </button>
              <button
                onClick={() => {
                  teacherDiag("Consent Listen only onClick ENTERED");
                  setPhase("no-mic");
                }}
                className="px-4 py-3 rounded-xl text-xs font-medium text-muted-foreground border border-border"
              >
                Listen only
              </button>
            </div>
          </div>
        )}

        {phase === "passed" && result && (
          <div className="rounded-2xl border border-border p-5 text-center bg-card" data-testid="panel-passed">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-foreground font-bold text-base">
              {result.matchScore >= 90 ? "Excellent! Masha'Allah!" : "Well done! That was correct."}
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Word match: {result.matchScore}%
              {completedNow === "review" && " · review practice (already completed)"}
            </p>
          </div>
        )}

        {alreadyDone && phase === "idle" && (
          <div className="rounded-2xl border border-border p-3 text-center bg-card">
            <p className="text-muted-foreground text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> You completed this lesson — practice again anytime.
            </p>
          </div>
        )}

        {phase === "feedback" && result && (
          <div className="rounded-2xl border border-border p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-card" data-testid="panel-feedback">
            <p className="text-foreground font-semibold text-sm mb-2">
              Good try — let&apos;s polish it together.
            </p>
            {/* Word match bar */}
            <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${result.matchScore}%` }} />
              </div>
              <p className="text-amber-400 text-xs font-semibold shrink-0">{result.matchScore}%</p>
            </div>
            {/* The word with problem letters highlighted */}
            {result.missing.length > 0 && (
                <div className="rounded-xl bg-muted p-3 mb-2 text-center">
                <p className="font-arabic text-3xl leading-relaxed" dir="rtl" data-testid="text-diff-word">
                  {lesson.word.split("").map((ch, i) => {
                    const norm = normalizeArabic(ch);
                    const wrong = norm.length > 0 && result.missing.includes(norm);
                    return (
                        <span key={i} className={wrong ? "text-rose-400 underline decoration-rose-500/60 underline-offset-4" : "text-foreground"}>
                        {ch}
                      </span>
                    );
                  })}
                </p>
                <p className="text-muted-foreground text-[11px] mt-2">
                  The <span className="text-rose-400 font-semibold">highlighted letters</span> were not heard clearly — listen again and focus on those sounds.
                </p>
              </div>
            )}
            {result.heard && (
              <p className="text-muted-foreground text-xs mb-1">
                I heard: <span className="font-arabic text-sm" dir="rtl">{result.heard}</span>
              </p>
            )}
            {result.missing.length > 0 && (
              <p className="text-muted-foreground text-xs mb-1">
                Sounds to focus on:{" "}
                <span className="font-arabic text-base text-amber-300" dir="rtl">
                  {result.missing.join(" ، ")}
                </span>
              </p>
            )}
            {result.extra.length > 0 && (
              <p className="text-muted-foreground text-xs mb-1">
                Extra sounds I heard (not in the word):{" "}
                <span className="font-arabic text-base text-amber-300" dir="rtl">
                  {result.extra.join(" ، ")}
                </span>
              </p>
            )}
              <p className="text-muted-foreground text-xs mt-2 leading-relaxed">{lesson.tip}</p>
            {attempts >= MAX_RETRIES && (
                <p className="text-muted-foreground text-xs mt-3 leading-relaxed border-t border-border pt-3">
                This one is tricky — that&apos;s completely normal. Tap <strong>Listen</strong> a few
                more times and repeat slowly, sound by sound. You can also continue in
                listen-only mode and come back later.
              </p>
            )}
            <button
              onClick={playAudio}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground border border-border bg-primary"
            >
              <Volume2 className="w-3.5 h-3.5" /> Hear it again
            </button>
          </div>
        )}

        {phase === "unclear" && (
          <div className="rounded-2xl border border-border p-4 text-center bg-card" data-testid="panel-unclear">
            <Ear className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <p className="text-sky-300 text-sm font-medium">I couldn&apos;t clearly understand that.</p>
            <p className="text-sky-600 text-xs mt-1">
              No worries — this doesn&apos;t count against you. Try again in a quieter place,
              holding the phone a little closer.
            </p>
          </div>
        )}

        {phase === "mic-denied" && (
          <div className="rounded-2xl border border-border p-4 bg-card" data-testid="panel-denied">
            <div className="flex items-center gap-2 mb-2">
              <MicOff className="w-4 h-4 text-rose-400" />
              <p className="text-foreground text-sm font-medium">Microphone permission needed</p>
            </div>
            <p className="text-rose-500/80 text-xs leading-relaxed">
              To check your recitation, the app needs microphone access. Allow it under
              Permissions → Microphone. Until then, you can keep learning in listen-only mode —
              tap Listen and repeat aloud.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  const ok = await openAppSettings().catch(() => false);
                  if (!ok) setSettingsFailed(true);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground border border-border bg-primary"
                data-testid="button-open-settings"
              >
                Open Settings
              </button>
              <button
                onClick={() => { setPhase("idle"); setResult(null); setSettingsFailed(false); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground border border-border"
                data-testid="button-denied-retry"
              >
                Try Again
              </button>
            </div>
            {settingsFailed && (
              <p className="text-rose-400/80 text-[11px] mt-2 leading-relaxed" data-testid="text-settings-fallback">
                Couldn&apos;t open settings automatically. Please go to: Settings → Apps →
                Noor Quran → Permissions → Microphone → Allow.
              </p>
            )}
          </div>
        )}

        {phase === "no-mic" && (
          <div className="rounded-2xl border border-border p-4 bg-card" data-testid="panel-nomic">
            <div className="flex items-center gap-2 mb-2">
              <Ear className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-medium">Listen-only practice</p>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {support === "none"
                ? "Recitation checking isn't available in this browser — it works in the Noor Quran Android app. For now: tap Listen, repeat aloud, and compare with your own ears — it's how students have learned for centuries."
                : "Tap Listen and repeat aloud as many times as you like. To pass this lesson and unlock the next one, the AI needs to hear your recitation — allow the microphone when you're ready."}
            </p>
            {noMicReason && (
              <p className="text-muted-foreground text-[10px] mt-2 leading-relaxed" data-testid="text-nomic-reason">
                Reason: {noMicReason}
              </p>
            )}
            {support !== "none" && (
              <button
                onClick={() => setPhase("idle")}
                className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold text-primary-foreground border border-border bg-primary"
                data-testid="button-back-to-mic"
              >
                I&apos;m ready — try with the microphone
              </button>
            )}
          </div>
        )}

        {phase === "offline" && (
          <div className="rounded-2xl border border-border p-4 text-center bg-card" data-testid="panel-offline">
            <WifiOff className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-foreground text-sm font-medium">No internet connection</p>
            <p className="text-muted-foreground text-xs mt-1">
              Speech checking needs a connection on most devices. You can still practice in
              listen-only mode with downloaded audio.
            </p>
          </div>
        )}

        {phase === "limit" && (
          <div className="rounded-2xl border border-border p-5 text-center bg-card" data-testid="panel-limit">
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-foreground font-semibold text-sm">
              Masha&apos;Allah — today&apos;s {getDailyStatus().limit} lessons are complete!
            </p>
            <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
              Rest is part of learning. You can still review completed lessons and listen as much
              as you like. New lessons unlock at midnight.
            </p>
            <Link href="/teacher"
              className="inline-block mt-3 px-5 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground border border-border bg-primary">
              Back to dashboard
            </Link>
          </div>
        )}

        {/* ── Mic + navigation controls ── */}
        {phase !== "limit" && phase !== "consent" && (
          <div className="pt-2 pb-4">
            {/* Read Now is ALWAYS visible (except while an error panel with its own
                recovery actions is shown) — never hidden by recognizer availability. */}
            {phase !== "no-mic" && phase !== "mic-denied" && (
              <div className="text-center">
                {phase === "recording" ? (
                  <>
                    <div className="w-20 h-20 rounded-full inline-flex items-center justify-center bg-rose-500 scale-110 shadow-lg shadow-rose-900/50 animate-pulse"
                      data-testid="indicator-recording">
                      <Mic className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <p className="text-rose-300 text-sm font-medium mt-3" data-testid="text-listening">
                      Listening… Read the letter or word now.
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-1">
                      {(recordMs / 1000).toFixed(1)}s · stops automatically
                    </p>
                    <button
                      onClick={onStop}
                      className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground border border-border bg-primary active:scale-95 transition-all"
                      data-testid="button-stop"
                    >
                      <span className="w-2.5 h-2.5 rounded-[3px] bg-rose-400 inline-block" /> Stop — I&apos;m done
                    </button>
                  </>
                ) : phase === "checking" ? (
                  <>
                    <div className="w-20 h-20 rounded-full inline-flex items-center justify-center bg-primary opacity-60 shadow-lg">
                      <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                    </div>
                    <p className="text-muted-foreground text-xs mt-3">Checking your recitation…</p>
                  </>
                ) : (
                  <>
                    <button
                      ref={readNowButtonRef}
                      onClick={onReadNow}
                      className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-primary-foreground bg-primary active:scale-95 shadow-lg transition-all"
                      data-testid="button-record"
                    >
                      <Mic className="w-5 h-5" /> Read Now
                    </button>
                    <p className="text-muted-foreground text-xs mt-3">
                      Tap, then read the {lesson.highlight ? "letter" : "word"} aloud
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              {(phase === "feedback" || phase === "unclear") && (
                <button
                  onClick={() => { setPhase("idle"); setResult(null); }}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-primary border border-border flex items-center justify-center gap-2"
                  data-testid="button-try-again"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>
              )}
              {revision ? (
                <button
                  onClick={() => {
                    const nid = nextRevisionLesson(lesson.id);
                    if (nid) navigate(`/teacher/lesson/${nid}`);
                    else navigate("/teacher");
                  }}
                  disabled={!passed}
                  className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    passed
                      ? "text-primary-foreground bg-primary active:scale-[0.98]"
                      : "text-muted-foreground border border-border cursor-not-allowed"
                  }`}
                  data-testid="button-next-revision"
                >
                  {revision.index >= revision.total
                    ? (passed ? "Finish Revision" : "Pass the check to finish")
                    : (passed ? "Pass & Next Word" : "Pass the check to continue")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : next ? (
                <button
                  onClick={() => navigate(`/teacher/lesson/${next.id}`)}
                  disabled={!passed}
                  className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    passed
                      ? "text-primary-foreground bg-primary active:scale-[0.98]"
                      : "text-muted-foreground border border-border cursor-not-allowed"
                  }`}
                  data-testid="button-next"
                >
                  {passed ? "Pass & Next Lesson" : "Pass the AI check to unlock"} <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                passed && (
                  <Link href="/teacher"
                    className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-primary-foreground text-center bg-primary">
                    Finish — back to dashboard
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-8 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => {
            teacherDiag("Diagnostic panel toggled", { open: !showDiagnostics });
            setShowDiagnostics((open) => !open);
          }}
          className="w-full rounded-xl border border-border px-3 py-2 text-left text-[11px] text-muted-foreground"
          data-testid="button-teacher-diagnostics"
        >
          {showDiagnostics ? "Hide diagnostic log" : `Show diagnostic log (${diagnosticEntries.length} entries)`}
        </button>
        {showDiagnostics && (
          <div className="mt-2 rounded-xl border border-border bg-card p-3">
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  const text = diagnosticEntries.join("\n");
                  navigator.clipboard?.writeText(text).catch(() => {});
                  teacherDiag("Diagnostic log copy requested", { entries: diagnosticEntries.length });
                }}
                className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
              >
                Copy log
              </button>
              <button
                type="button"
                onClick={() => {
                  clearTeacherDiagnosticEntries();
                  setDiagnosticEntries([]);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground"
              >
                Clear log
              </button>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-relaxed text-muted-foreground">
              {diagnosticEntries.length ? diagnosticEntries.join("\n") : "No diagnostic entries yet."}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}
