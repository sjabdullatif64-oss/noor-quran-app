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
  listenOnce, stopListening, normalizeArabic, openAppSettings,
  type Assessment, type SpeechSupport,
} from "@/lib/teacher-speech";
import { isConnected } from "@/lib/capacitor";

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getSpeechSupport().then(setSupport).catch(() => setSupport("none"));
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
    if (!lesson) return;

    // Daily-limit gate applies only to NEW lessons
    if (!isLessonCompleted(lesson.id) && getDailyStatus().limitReached) {
      setPhase("limit");
      return;
    }
    if (!hasConsent()) {
      setPhase("consent");
      return;
    }
    if (support === "none") {
      setPhase("no-mic");
      return;
    }
    if (!(await isConnected())) {
      setPhase("offline");
      return;
    }

    // Just-in-time permission: first tap shows the native Android dialog
    const perm = await checkSpeechPermission();
    if (perm === "denied") {
      setPhase("mic-denied");
      return;
    }
    if (perm === "prompt" && support === "native") {
      const granted = await requestSpeechPermission();
      if (granted !== "granted") {
        setPhase("mic-denied");
        return;
      }
    }

    setPhase("recording");
    setRecordMs(0);
    const started = Date.now();
    recordTimer.current = setInterval(() => setRecordMs(Date.now() - started), 100);

    const res = await listenOnce(MAX_RECORD_MS);

    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
    setPhase("checking");

    if (res.error === "not-allowed") { setPhase("mic-denied"); return; }
    if (res.error === "network") { setPhase("offline"); return; }

    const a = assess(lesson.expected, res.alternatives, res.confidence);
    setResult(a);

    if (a.verdict === "pass") {
      const cr = completeLesson(lesson.id, a.matchScore);
      clearMistake(lesson.id);
      setCompletedNow(cr);
      if (cr === "limit-reached") setPhase("limit");
      else setPhase("passed");
    } else if (a.verdict === "unclear") {
      setPhase("unclear"); // never counted as a mistake
    } else {
      setAttempts((n) => n + 1);
      recordMistake(lesson.id);
      setPhase("feedback");
    }
  }, [lesson, support]);

  /** Tap "Read Now" → permission (first time) → listen; auto-stops after MAX_RECORD_MS. */
  const onReadNow = useCallback(() => {
    beginRecording();
  }, [beginRecording]);

  /** Tap "Stop" while listening → finish early and check what was heard. */
  const onStop = useCallback(() => {
    stopListening().catch(() => {});
  }, []);

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!lesson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
        style={{ background: "#071a0e" }}>
        <p className="text-emerald-400 text-sm">Lesson not found.</p>
        <Link href="/teacher" className="text-emerald-300 text-sm underline">Back to Teacher</Link>
      </div>
    );
  }

  // Structured progression: only completed lessons (review) and the next
  // uncompleted lesson are accessible. Everything ahead is locked.
  if (!isLessonUnlocked(lesson.id)) {
    const nextAllowed = getNextUncompleted();
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
        data-testid="panel-locked">
        <p className="text-emerald-300 font-semibold text-sm">This lesson is still locked</p>
        <p className="text-emerald-600 text-xs max-w-xs leading-relaxed">
          Lessons unlock one at a time as you pass them — step by step is how strong reading is
          built.
        </p>
        {nextAllowed && (
          <Link href={`/teacher/lesson/${nextAllowed}`}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #1a5c38, #0d3d24)" }}>
            Go to your current lesson
          </Link>
        )}
        <Link href="/teacher" className="text-emerald-500 text-xs underline mt-1">Back to Teacher</Link>
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
      className="min-h-screen pb-32 md:pb-12 animate-in fade-in duration-300"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-6 pb-3"
        style={{ background: "linear-gradient(180deg, #071a0e 85%, transparent 100%)" }}>
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link
            href="/teacher"
            className="flex items-center justify-center w-9 h-9 rounded-full border border-emerald-800/50 text-emerald-500"
            data-testid="link-back-teacher"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-emerald-300 text-sm font-semibold truncate">
              Level {lesson.level}: {levelInfo.title}
            </p>
            <p className="text-emerald-700 text-[11px]">
              {revision
                ? `Smart Revision · ${revision.index} of ${revision.total}`
                : `Lesson ${lesson.order} of ${levelLessons.length}${alreadyDone ? " · completed" : ""}`}
            </p>
          </div>
          <p className="text-emerald-600 text-xs shrink-0">{lesson.order}/{levelLessons.length}</p>
        </div>
        {/* Level progress bar */}
        <div className="max-w-2xl mx-auto mt-2 h-1 rounded-full bg-emerald-950 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(lesson.order / levelLessons.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-4 space-y-4 max-w-2xl mx-auto pt-2">
        {/* The word card */}
        <div
          className="rounded-3xl p-8 border border-emerald-800/40 text-center"
          style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.25), rgba(6,22,16,0.5))" }}
        >
          {lesson.highlight && (
            <p className="text-emerald-200 font-arabic text-6xl mb-3" dir="rtl" data-testid="text-target">
              {lesson.arabic}
            </p>
          )}
          <p
            className={`text-emerald-100 font-arabic leading-relaxed ${lesson.highlight ? "text-4xl" : "text-6xl"}`}
            data-testid="text-lesson-word"
          >
            {wordDisplay}
          </p>
          <p className="text-emerald-400 text-base mt-4 font-medium">{lesson.transliteration}</p>
          <p className="text-emerald-600 text-sm mt-1">&ldquo;{lesson.meaning}&rdquo;</p>

          <button
            onClick={playAudio}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-emerald-200 border border-emerald-700/60 transition-all active:scale-95"
            style={{ background: "rgba(26,92,56,0.4)" }}
            data-testid="button-listen"
          >
            {playing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
            Listen
          </button>
          <p className="text-emerald-800 text-[10px] mt-2">Verified recitation — listen as many times as you like</p>
        </div>

        {/* Tip */}
        <div className="rounded-2xl border border-emerald-900/40 p-4 flex gap-3"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-emerald-500 text-xs leading-relaxed">{lesson.tip}</p>
        </div>

        {/* ── State panels ── */}

        {phase === "consent" && (
          <div className="rounded-2xl border border-emerald-700/50 p-5"
            style={{ background: "rgba(26,92,56,0.2)" }} data-testid="panel-consent">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <p className="text-emerald-300 font-semibold text-sm">Before you start speaking</p>
            </div>
            <ul className="text-emerald-500 text-xs leading-relaxed space-y-2 mb-4 list-disc pl-4">
              <li>Your recitation is processed by <strong className="text-emerald-300">your device&apos;s speech-recognition service</strong> — on most Android devices this is provided by Google and audio may be processed on Google&apos;s servers.</li>
              <li>Noor Quran itself <strong className="text-emerald-300">never saves or uploads</strong> audio files of your voice.</li>
              <li>Only the recognized text is used — for instant feedback — then discarded.</li>
              <li>You can delete all learning data anytime from the Teacher home screen.</li>
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => { grantConsent(); setPhase("idle"); beginRecording(); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #1a5c38, #0d3d24)" }}
                data-testid="button-consent-agree"
              >
                I understand — continue
              </button>
              <button
                onClick={() => setPhase("no-mic")}
                className="px-4 py-3 rounded-xl text-xs font-medium text-emerald-400 border border-emerald-800/50"
              >
                Listen only
              </button>
            </div>
          </div>
        )}

        {phase === "passed" && result && (
          <div className="rounded-2xl border border-emerald-600/60 p-5 text-center"
            style={{ background: "rgba(52,211,153,0.1)" }} data-testid="panel-passed">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-300 font-bold text-base">
              {result.matchScore >= 90 ? "Excellent! Masha'Allah!" : "Well done! That was correct."}
            </p>
            <p className="text-emerald-500 text-xs mt-1">
              Word match: {result.matchScore}%
              {completedNow === "review" && " · review practice (already completed)"}
            </p>
          </div>
        )}

        {alreadyDone && phase === "idle" && (
          <div className="rounded-2xl border border-emerald-800/40 p-3 text-center"
            style={{ background: "rgba(52,211,153,0.05)" }}>
            <p className="text-emerald-500 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> You completed this lesson — practice again anytime.
            </p>
          </div>
        )}

        {phase === "feedback" && result && (
          <div className="rounded-2xl border border-amber-800/50 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ background: "rgba(217,119,6,0.07)" }} data-testid="panel-feedback">
            <p className="text-amber-300 font-semibold text-sm mb-2">
              Good try — let&apos;s polish it together.
            </p>
            {/* Word match bar */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1.5 rounded-full bg-amber-950/60 overflow-hidden">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${result.matchScore}%` }} />
              </div>
              <p className="text-amber-400 text-xs font-semibold shrink-0">{result.matchScore}%</p>
            </div>
            {/* The word with problem letters highlighted */}
            {result.missing.length > 0 && (
              <div className="rounded-xl bg-amber-950/30 p-3 mb-2 text-center">
                <p className="font-arabic text-3xl leading-relaxed" dir="rtl" data-testid="text-diff-word">
                  {lesson.word.split("").map((ch, i) => {
                    const norm = normalizeArabic(ch);
                    const wrong = norm.length > 0 && result.missing.includes(norm);
                    return (
                      <span key={i} className={wrong ? "text-rose-400 underline decoration-rose-500/60 underline-offset-4" : "text-emerald-100"}>
                        {ch}
                      </span>
                    );
                  })}
                </p>
                <p className="text-amber-500/90 text-[11px] mt-2">
                  The <span className="text-rose-400 font-semibold">highlighted letters</span> were not heard clearly — listen again and focus on those sounds.
                </p>
              </div>
            )}
            {result.heard && (
              <p className="text-amber-500/90 text-xs mb-1">
                I heard: <span className="font-arabic text-sm" dir="rtl">{result.heard}</span>
              </p>
            )}
            {result.missing.length > 0 && (
              <p className="text-amber-500/90 text-xs mb-1">
                Sounds to focus on:{" "}
                <span className="font-arabic text-base text-amber-300" dir="rtl">
                  {result.missing.join(" ، ")}
                </span>
              </p>
            )}
            {result.extra.length > 0 && (
              <p className="text-amber-500/90 text-xs mb-1">
                Extra sounds I heard (not in the word):{" "}
                <span className="font-arabic text-base text-amber-300" dir="rtl">
                  {result.extra.join(" ، ")}
                </span>
              </p>
            )}
            <p className="text-amber-600 text-xs mt-2 leading-relaxed">{lesson.tip}</p>
            {attempts >= MAX_RETRIES && (
              <p className="text-amber-500 text-xs mt-3 leading-relaxed border-t border-amber-900/30 pt-3">
                This one is tricky — that&apos;s completely normal. Tap <strong>Listen</strong> a few
                more times and repeat slowly, sound by sound. You can also continue in
                listen-only mode and come back later.
              </p>
            )}
            <button
              onClick={playAudio}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-amber-200 border border-amber-800/50"
            >
              <Volume2 className="w-3.5 h-3.5" /> Hear it again
            </button>
          </div>
        )}

        {phase === "unclear" && (
          <div className="rounded-2xl border border-sky-900/50 p-4 text-center"
            style={{ background: "rgba(56,189,248,0.06)" }} data-testid="panel-unclear">
            <Ear className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <p className="text-sky-300 text-sm font-medium">I couldn&apos;t clearly understand that.</p>
            <p className="text-sky-600 text-xs mt-1">
              No worries — this doesn&apos;t count against you. Try again in a quieter place,
              holding the phone a little closer.
            </p>
          </div>
        )}

        {phase === "mic-denied" && (
          <div className="rounded-2xl border border-rose-900/50 p-4"
            style={{ background: "rgba(244,63,94,0.06)" }} data-testid="panel-denied">
            <div className="flex items-center gap-2 mb-2">
              <MicOff className="w-4 h-4 text-rose-400" />
              <p className="text-rose-300 text-sm font-medium">Microphone permission needed</p>
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
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-rose-200 border border-rose-800/50"
                style={{ background: "rgba(244,63,94,0.12)" }}
                data-testid="button-open-settings"
              >
                Open Settings
              </button>
              <button
                onClick={() => { setPhase("idle"); setResult(null); setSettingsFailed(false); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 border border-emerald-800/50"
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
          <div className="rounded-2xl border border-emerald-900/50 p-4"
            style={{ background: "rgba(255,255,255,0.02)" }} data-testid="panel-nomic">
            <div className="flex items-center gap-2 mb-2">
              <Ear className="w-4 h-4 text-emerald-400" />
              <p className="text-emerald-300 text-sm font-medium">Listen-only practice</p>
            </div>
            <p className="text-emerald-600 text-xs leading-relaxed">
              {support === "none"
                ? "Recitation checking isn't available in this browser — it works in the Noor Quran Android app. For now: tap Listen, repeat aloud, and compare with your own ears — it's how students have learned for centuries."
                : "Tap Listen and repeat aloud as many times as you like. To pass this lesson and unlock the next one, the AI needs to hear your recitation — allow the microphone when you're ready."}
            </p>
            {support !== "none" && (
              <button
                onClick={() => setPhase("idle")}
                className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold text-emerald-200 border border-emerald-700/50"
                style={{ background: "rgba(26,92,56,0.3)" }}
                data-testid="button-back-to-mic"
              >
                I&apos;m ready — try with the microphone
              </button>
            )}
          </div>
        )}

        {phase === "offline" && (
          <div className="rounded-2xl border border-slate-700/50 p-4 text-center"
            style={{ background: "rgba(255,255,255,0.02)" }} data-testid="panel-offline">
            <WifiOff className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-300 text-sm font-medium">No internet connection</p>
            <p className="text-slate-500 text-xs mt-1">
              Speech checking needs a connection on most devices. You can still practice in
              listen-only mode with downloaded audio.
            </p>
          </div>
        )}

        {phase === "limit" && (
          <div className="rounded-2xl border border-emerald-700/50 p-5 text-center"
            style={{ background: "rgba(26,92,56,0.2)" }} data-testid="panel-limit">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-300 font-semibold text-sm">
              Masha&apos;Allah — today&apos;s {getDailyStatus().limit} lessons are complete!
            </p>
            <p className="text-emerald-600 text-xs mt-1 leading-relaxed">
              Rest is part of learning. You can still review completed lessons and listen as much
              as you like. New lessons unlock at midnight.
            </p>
            <Link href="/teacher"
              className="inline-block mt-3 px-5 py-2.5 rounded-xl text-xs font-semibold text-emerald-200 border border-emerald-700/50">
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
                      <Mic className="w-7 h-7 text-[#071a0e]" />
                    </div>
                    <p className="text-rose-300 text-sm font-medium mt-3" data-testid="text-listening">
                      Listening… Read the letter or word now.
                    </p>
                    <p className="text-emerald-700 text-[11px] mt-1">
                      {(recordMs / 1000).toFixed(1)}s · stops automatically
                    </p>
                    <button
                      onClick={onStop}
                      className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-rose-200 border border-rose-700/60 active:scale-95 transition-all"
                      style={{ background: "rgba(244,63,94,0.15)" }}
                      data-testid="button-stop"
                    >
                      <span className="w-2.5 h-2.5 rounded-[3px] bg-rose-400 inline-block" /> Stop — I&apos;m done
                    </button>
                  </>
                ) : phase === "checking" ? (
                  <>
                    <div className="w-20 h-20 rounded-full inline-flex items-center justify-center bg-emerald-500 opacity-60 shadow-lg shadow-emerald-900/50">
                      <Loader2 className="w-7 h-7 text-[#071a0e] animate-spin" />
                    </div>
                    <p className="text-emerald-600 text-xs mt-3">Checking your recitation…</p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onReadNow}
                      className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-[#071a0e] bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-900/50 transition-all"
                      data-testid="button-record"
                    >
                      <Mic className="w-5 h-5" /> Read Now
                    </button>
                    <p className="text-emerald-600 text-xs mt-3">
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
                  className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-emerald-300 border border-emerald-700/50 flex items-center justify-center gap-2"
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
                      ? "text-white active:scale-[0.98]"
                      : "text-emerald-800 border border-emerald-900/50 cursor-not-allowed"
                  }`}
                  style={passed ? { background: "linear-gradient(135deg, #1a5c38, #0d3d24)" } : undefined}
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
                      ? "text-white active:scale-[0.98]"
                      : "text-emerald-800 border border-emerald-900/50 cursor-not-allowed"
                  }`}
                  style={passed ? { background: "linear-gradient(135deg, #1a5c38, #0d3d24)" } : undefined}
                  data-testid="button-next"
                >
                  {passed ? "Pass & Next Lesson" : "Pass the AI check to unlock"} <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                passed && (
                  <Link href="/teacher"
                    className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white text-center"
                    style={{ background: "linear-gradient(135deg, #1a5c38, #0d3d24)" }}>
                    Finish — back to dashboard
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
