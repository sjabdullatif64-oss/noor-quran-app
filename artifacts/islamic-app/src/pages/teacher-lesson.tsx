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
  MAX_RECORD_MS, MAX_RECOGNITION_ATTEMPTS, MAX_RETRIES, TEACHER_CONSENT_KEY,
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
  listenWithRetries, stopListening, normalizeArabic, openAppSettings, getSpeechSupportReason,
  type Assessment, type SpeechSupport,
  type ListenResult,
} from "@/lib/teacher-speech";
import { isConnected } from "@/lib/capacitor";
import { getLang, TRANSLATION_LANGUAGE_CHANGED_EVENT } from "@/lib/settings";
import { getTeacherSpeechCopy } from "@/lib/teacher-speech-copy";
import { TeacherSpeechDiagnostics } from "@/components/teacher-speech-diagnostics";

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
  const [speechResult, setSpeechResult] = useState<ListenResult | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState(() => getLang());
  const copy = getTeacherSpeechCopy(translationLanguage);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    getSpeechSupport()
      .then(setSupport)
      .catch(() => setSupport("none"));
  }, []);

  useEffect(() => {
    const syncTranslationLanguage = () => setTranslationLanguage(getLang());
    window.addEventListener(TRANSLATION_LANGUAGE_CHANGED_EVENT, syncTranslationLanguage);
    return () => window.removeEventListener(TRANSLATION_LANGUAGE_CHANGED_EVENT, syncTranslationLanguage);
  }, []);

  // Reset state when navigating between lessons
  useEffect(() => {
    setPhase("idle");
    setAttempts(0);
    setResult(null);
    setSpeechResult(null);
    setDiagnosticsOpen(false);
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
    if (!lesson) {
      return;
    }

    // Daily-limit gate applies only to NEW lessons
    if (!isLessonCompleted(lesson.id) && getDailyStatus().limitReached) {
      setPhase("limit");
      return;
    }
    if (!hasConsent()) {
      setPhase("consent");
      return;
    }

    let sup: SpeechSupport;
    try {
      sup = await getSpeechSupport();
    } catch (error) {
      throw error;
    }
    setSupport(sup);
    if (sup === "none") {
      setNoMicReason(getSpeechSupportReason());
      setPhase("no-mic");
      return;
    }

    let connected: boolean;
    try {
      connected = await isConnected();
    } catch (error) {
      throw error;
    }
    if (!connected) {
      setPhase("offline");
      return;
    }

    let perm: Awaited<ReturnType<typeof checkSpeechPermission>>;
    try {
      perm = await checkSpeechPermission();
    } catch (error) {
      throw error;
    }
    if (perm === "denied") {
      setPhase("mic-denied");
      return;
    }

    if (perm === "prompt" && sup === "native") {
      let granted: Awaited<ReturnType<typeof requestSpeechPermission>>;
      try {
        granted = await requestSpeechPermission();
      } catch (error) {
        throw error;
      }
      if (granted !== "granted") {
        setPhase("mic-denied");
        return;
      }
    }

    setPhase("recording");
    setRecordMs(0);
    const started = Date.now();
    recordTimer.current = setInterval(() => setRecordMs(Date.now() - started), 100);

    let res: Awaited<ReturnType<typeof listenWithRetries>>;
    try {
      res = await listenWithRetries(MAX_RECORD_MS, MAX_RECOGNITION_ATTEMPTS);
    } catch (error) {
      throw error;
    }

    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
    setPhase("checking");

    if (res.error === "not-allowed") {
      setPhase("mic-denied");
      return;
    }
    if (res.error === "network") {
      setPhase("offline");
      return;
    }

    const a = assess(lesson.expected, res.alternatives, res.confidence, res.status);
    setSpeechResult(res);
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
    beginRecording().catch(() => {});
  }, [beginRecording]);

  /** Tap "Stop" while listening → finish early and check what was heard. */
  const onStop = useCallback(() => {
    stopListening().catch(() => {});
  }, []);

  const openDiagnostics = useCallback(() => {
    setDiagnosticsOpen(true);
  }, []);

  const advancedButton = (testId: string) => (
    <button
      type="button"
      onClick={openDiagnostics}
      className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground"
      data-testid={testId}
    >
      {copy.advanced}
    </button>
  );

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
            {copy.listen}
          </button>
            <p className="text-muted-foreground text-[10px] mt-2">{copy.verifiedRecitation}</p>
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
              <p className="text-foreground font-semibold text-sm">{copy.consentTitle}</p>
            </div>
            <ul className="text-muted-foreground text-xs leading-relaxed space-y-2 mb-4 list-disc pl-4">
              <li>{copy.permissionData}</li>
              <li>{copy.noVoiceStorage}</li>
              <li>{copy.recognizedTextOnly}</li>
              <li>{copy.deleteLearningData}</li>
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    grantConsent();
                    setPhase("idle");
                    beginRecording().catch(() => {});
                  } catch {
                  }
                }}
                className="relative z-30 flex-1 touch-manipulation pointer-events-auto py-3 rounded-xl text-sm font-semibold text-primary-foreground bg-primary"
                data-testid="button-consent-agree"
              >
                {copy.consentAgree}
              </button>
              <button
                onClick={() => {
                  setPhase("no-mic");
                }}
                className="px-4 py-3 rounded-xl text-xs font-medium text-muted-foreground border border-border"
              >
                {copy.listenOnly}
              </button>
            </div>
            {advancedButton("button-advanced-consent")}
          </div>
        )}

        {phase === "passed" && result && (
          <div className="rounded-2xl border border-border p-5 text-center bg-card" data-testid="panel-passed">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-foreground font-bold text-base">
              {result.matchScore >= 90 ? copy.passedExcellent : copy.passedCorrect}
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              {copy.wordMatch}: {result.matchScore}%
            </p>
            {advancedButton("button-advanced-passed")}
          </div>
        )}

        {alreadyDone && phase === "idle" && (
          <div className="rounded-2xl border border-border p-3 text-center bg-card">
            <p className="text-muted-foreground text-xs flex items-center justify-center gap-2">
               <CheckCircle2 className="w-3.5 h-3.5" /> {copy.completedPractice}
            </p>
          </div>
        )}

        {phase === "feedback" && result && (
          <div className="rounded-2xl border border-border p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-card" data-testid="panel-feedback">
            <p className="text-foreground font-semibold text-sm mb-2">
              {copy.retryTitle}
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
                  {copy.focusSounds}
                </p>
              </div>
            )}
            {result.heard && (
              <p className="text-muted-foreground text-xs mb-1">
                {copy.heard}: <span className="font-arabic text-sm" dir="rtl">{result.heard}</span>
              </p>
            )}
            {result.missing.length > 0 && (
              <p className="text-muted-foreground text-xs mb-1">
                {copy.focusSounds}:{" "}
                <span className="font-arabic text-base text-amber-300" dir="rtl">
                  {result.missing.join(" ، ")}
                </span>
              </p>
            )}
            {result.extra.length > 0 && (
              <p className="text-muted-foreground text-xs mb-1">
                {copy.extraSounds}:{" "}
                <span className="font-arabic text-base text-amber-300" dir="rtl">
                  {result.extra.join(" ، ")}
                </span>
              </p>
            )}
              <p className="text-muted-foreground text-xs mt-2 leading-relaxed">{lesson.tip}</p>
            {attempts >= MAX_RETRIES && (
                <p className="text-muted-foreground text-xs mt-3 leading-relaxed border-t border-border pt-3">
                {copy.retryGuidance}
              </p>
            )}
            <button
              onClick={playAudio}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground border border-border bg-primary"
            >
              <Volume2 className="w-3.5 h-3.5" /> {copy.hearAgain}
            </button>
            {advancedButton("button-advanced-feedback")}
          </div>
        )}

        {phase === "unclear" && (
          <div className="rounded-2xl border border-border p-4 text-center bg-card" data-testid="panel-unclear">
            <Ear className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <p className="text-sky-300 text-sm font-medium">{copy.unclearTitle}</p>
            <p className="text-sky-600 text-xs mt-1">
              {copy.unclearBody}
            </p>
            {advancedButton("button-advanced-unclear")}
          </div>
        )}

        {phase === "mic-denied" && (
          <div className="rounded-2xl border border-border p-4 bg-card" data-testid="panel-denied">
            <div className="flex items-center gap-2 mb-2">
              <MicOff className="w-4 h-4 text-rose-400" />
              <p className="text-foreground text-sm font-medium">{copy.microphoneTitle}</p>
            </div>
            <p className="text-rose-500/80 text-xs leading-relaxed">
              {copy.microphoneBody}
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
                {copy.openSettings}
              </button>
              <button
                onClick={() => { setPhase("idle"); setResult(null); setSettingsFailed(false); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground border border-border"
                data-testid="button-denied-retry"
              >
                {copy.tryAgain}
              </button>
            </div>
            {settingsFailed && (
              <p className="text-rose-400/80 text-[11px] mt-2 leading-relaxed" data-testid="text-settings-fallback">
                {copy.settingsFailed}
              </p>
            )}
            {advancedButton("button-advanced-mic-denied")}
          </div>
        )}

        {phase === "no-mic" && (
          <div className="rounded-2xl border border-border p-4 bg-card" data-testid="panel-nomic">
            <div className="flex items-center gap-2 mb-2">
              <Ear className="w-4 h-4 text-primary" />
              <p className="text-foreground text-sm font-medium">{copy.listenOnlyTitle}</p>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {support === "none"
                ? copy.listenOnlyUnavailable
                : copy.listenOnlyAvailable}
            </p>
            {noMicReason && (
              <p className="text-muted-foreground text-[10px] mt-2 leading-relaxed" data-testid="text-nomic-reason">
                 {copy.reason}: {noMicReason}
              </p>
            )}
            {support !== "none" && (
              <button
                onClick={() => setPhase("idle")}
                className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold text-primary-foreground border border-border bg-primary"
                data-testid="button-back-to-mic"
              >
                {copy.readyMicrophone}
              </button>
            )}
            {advancedButton("button-advanced-no-mic")}
          </div>
        )}

        {phase === "offline" && (
          <div className="rounded-2xl border border-border p-4 text-center bg-card" data-testid="panel-offline">
            <WifiOff className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-foreground text-sm font-medium">{copy.offlineTitle}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {copy.offlineBody}
            </p>
            {advancedButton("button-advanced-offline")}
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
                       {copy.listening}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-1">
                       {(recordMs / 1000).toFixed(1)}s · {copy.recordingAutoStop}
                    </p>
                    <button
                      onClick={onStop}
                      className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground border border-border bg-primary active:scale-95 transition-all"
                      data-testid="button-stop"
                    >
                       <span className="w-2.5 h-2.5 rounded-[3px] bg-rose-400 inline-block" /> {copy.stop}
                    </button>
                  </>
                ) : phase === "checking" ? (
                  <>
                    <div className="w-20 h-20 rounded-full inline-flex items-center justify-center bg-primary opacity-60 shadow-lg">
                      <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                    </div>
                     <p className="text-muted-foreground text-xs mt-3">{copy.checking}</p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onReadNow}
                      className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-primary-foreground bg-primary active:scale-95 shadow-lg transition-all"
                      data-testid="button-record"
                    >
                       <Mic className="w-5 h-5" /> {copy.readNow}
                    </button>
                    <p className="text-muted-foreground text-xs mt-3">
                       {copy.tapToRead}
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
                   <RotateCcw className="w-4 h-4" /> {copy.tryAgain}
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
      <TeacherSpeechDiagnostics
        open={diagnosticsOpen}
        onOpenChange={setDiagnosticsOpen}
        assessment={result}
        speech={speechResult}
      />

    </div>
  );
}
