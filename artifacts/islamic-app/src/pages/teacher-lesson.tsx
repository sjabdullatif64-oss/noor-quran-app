/**
 * Noor Quran — AI Quran Teacher: lesson screen
 * Flow: Listen → Read → Check → Correct → Retry → Pass → Next
 * Privacy-first: consent before first mic use; permission requested just-in-time.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ChevronLeft, Volume2, Mic, RotateCcw, ArrowRight, ShieldCheck, Languages, Check,
  CheckCircle2, Ear, MicOff, WifiOff, Sparkles, Loader2,
} from "lucide-react";
import {
  MAX_RECORD_MS, MAX_RECOGNITION_ATTEMPTS, MAX_RETRIES, TEACHER_CONSENT_KEY,
} from "@/lib/teacher-config";
import {
  getLesson, getLevelLessons, getNextLesson, lessonAudioUrls, LEVELS,
  type TeacherLesson,
} from "@/lib/teacher-curriculum";
import {
  completeLesson, clearMistake, recordMistake, getDailyStatus,
  isLessonCompleted, isLessonUnlocked, getNextUncompleted,
  addStudyTime, getRevisionInfo, nextRevisionLesson,
  recordPracticeScore, startPracticeSession,
  type CompleteResult,
} from "@/lib/teacher-progress";
import {
  assess, getSpeechSupport, checkSpeechPermission, requestSpeechPermission,
  listenWithRetries, stopListening, normalizeArabic, openAppSettings, getSpeechSupportReason,
  type Assessment, type SpeechSupport,
  type ListenResult,
} from "@/lib/teacher-speech";
import { isConnected } from "@/lib/capacitor";
import {
  getLang,
  getTeacherLanguageMode,
  setTeacherLanguageMode,
  TEACHER_LANGUAGE_MODE_CHANGED_EVENT,
  TRANSLATION_LANGUAGE_CHANGED_EVENT,
  type TeacherLanguageMode,
} from "@/lib/settings";
import { TRANSLATION_ENGLISH_NAMES } from "@/lib/api";
import { getTeacherSpeechCopy } from "@/lib/teacher-speech-copy";
import { TeacherSpeechDiagnostics } from "@/components/teacher-speech-diagnostics";
import { TeacherSpeechListenButton, TeacherSpeechMessage } from "@/components/teacher-speech-message";

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
  const [location, navigate] = useLocation();
  const lesson = getLesson(params.id ?? "");
  const isPracticeMode = location.startsWith("/teacher/practice/");

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
  const practiceSessionStarted = useRef(false);
  const [translationLanguage, setTranslationLanguage] = useState(() => getLang());
  const [teacherLanguageMode, setTeacherLanguageModeState] = useState<TeacherLanguageMode>(
    () => getTeacherLanguageMode(),
  );
  const teacherLanguage = teacherLanguageMode === "english" ? "english" : translationLanguage;
  const copy = getTeacherSpeechCopy(teacherLanguage);
  const lessonGuidance = teacherLanguage === "english" ? lesson?.tip ?? copy.lessonHint : copy.lessonHint;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const audioQueueIndexRef = useRef(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingControllerRef = useRef<AbortController | null>(null);
  const recordingRunRef = useRef(0);
  useEffect(() => {
    getSpeechSupport()
      .then(setSupport)
      .catch(() => setSupport("none"));
  }, []);

  useEffect(() => {
    const syncTranslationLanguage = () => setTranslationLanguage(getLang());
    window.addEventListener(TRANSLATION_LANGUAGE_CHANGED_EVENT, syncTranslationLanguage);
    const syncTeacherLanguageMode = () => setTeacherLanguageModeState(getTeacherLanguageMode());
    window.addEventListener(TEACHER_LANGUAGE_MODE_CHANGED_EVENT, syncTeacherLanguageMode);
    return () => {
      window.removeEventListener(TRANSLATION_LANGUAGE_CHANGED_EVENT, syncTranslationLanguage);
      window.removeEventListener(TEACHER_LANGUAGE_MODE_CHANGED_EVENT, syncTeacherLanguageMode);
    };
  }, []);

  // Reset state when navigating between lessons
  useEffect(() => {
    recordingRunRef.current += 1;
    recordingControllerRef.current?.abort();
    recordingControllerRef.current = null;
    stopListening().catch(() => {});
    if (recordTimer.current) {
      clearInterval(recordTimer.current);
      recordTimer.current = null;
    }
    setPhase("idle");
    setAttempts(0);
    setResult(null);
    setSpeechResult(null);
    setDiagnosticsOpen(false);
    setCompletedNow(null);
    setRecordMs(0);
    practiceSessionStarted.current = false;
    window.scrollTo({ top: 0 });
  }, [params.id, isPracticeMode]);

  // Track time spent learning (per lesson visit)
  useEffect(() => {
    const start = Date.now();
    return () => {
      if (!isPracticeMode) addStudyTime(Date.now() - start);
    };
  }, [params.id, isPracticeMode]);

  useEffect(() => () => {
    recordingRunRef.current += 1;
    recordingControllerRef.current?.abort();
    recordingControllerRef.current = null;
    audioRef.current?.pause();
    audioQueueRef.current = [];
    audioQueueIndexRef.current = 0;
    stopListening().catch(() => {});
    if (recordTimer.current) clearInterval(recordTimer.current);
  }, []);

  const playAudio = useCallback(() => {
    if (!lesson) return;
    audioRef.current?.pause();
    const urls = lessonAudioUrls(lesson);
    audioQueueRef.current = urls;
    audioQueueIndexRef.current = 0;
    setPlaying(true);

    const playNext = () => {
      const url = audioQueueRef.current[audioQueueIndexRef.current];
      if (!url) {
        setPlaying(false);
        return;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        audioQueueIndexRef.current += 1;
        playNext();
      };
      audio.onerror = () => setPlaying(false);
      audio.play().catch(() => setPlaying(false));
    };
    playNext();
  }, [lesson]);

  // ── Recording flow ──────────────────────────────────────────────────────────

  const beginRecording = useCallback(async () => {
    if (!lesson) {
      return;
    }
    // A second tap must not create a second permission/start chain.
    if (recordingControllerRef.current && !recordingControllerRef.current.signal.aborted) {
      return;
    }

    const controller = new AbortController();
    const runId = recordingRunRef.current + 1;
    recordingRunRef.current = runId;
    recordingControllerRef.current = controller;
    const isCurrentRun = () =>
      recordingRunRef.current === runId && !controller.signal.aborted;

    // Daily-limit gate applies only to NEW lessons, never Practice Mode.
    if (!isPracticeMode && !isLessonCompleted(lesson.id) && getDailyStatus().limitReached) {
      setPhase("limit");
      recordingControllerRef.current = null;
      return;
    }
    if (!hasConsent()) {
      setPhase("consent");
      recordingControllerRef.current = null;
      return;
    }

    let sup: SpeechSupport;
    try {
      sup = await getSpeechSupport();
    } catch (error) {
      throw error;
    }
    if (!isCurrentRun()) return;
    setSupport(sup);
    if (sup === "none") {
      setNoMicReason(getSpeechSupportReason());
      setPhase("no-mic");
      recordingControllerRef.current = null;
      return;
    }

    let connected: boolean;
    try {
      connected = await isConnected();
    } catch (error) {
      throw error;
    }
    if (!isCurrentRun()) return;
    if (!connected) {
      setPhase("offline");
      recordingControllerRef.current = null;
      return;
    }

    let perm: Awaited<ReturnType<typeof checkSpeechPermission>>;
    try {
      perm = await checkSpeechPermission();
    } catch (error) {
      throw error;
    }
    if (!isCurrentRun()) return;
    if (perm === "denied") {
      setPhase("mic-denied");
      recordingControllerRef.current = null;
      return;
    }

    if (perm === "prompt" && sup === "native") {
      let granted: Awaited<ReturnType<typeof requestSpeechPermission>>;
      try {
        granted = await requestSpeechPermission();
      } catch (error) {
        throw error;
      }
      if (!isCurrentRun()) return;
      if (granted !== "granted") {
        setPhase("mic-denied");
        recordingControllerRef.current = null;
        return;
      }
    }

    if (isPracticeMode && !practiceSessionStarted.current) {
      startPracticeSession(lesson.id);
      practiceSessionStarted.current = true;
    }

    if (!isCurrentRun()) return;
    setPhase("recording");
    setRecordMs(0);
    const started = Date.now();
    if (recordTimer.current) clearInterval(recordTimer.current);
    recordTimer.current = setInterval(() => setRecordMs(Date.now() - started), 100);

    let res: Awaited<ReturnType<typeof listenWithRetries>>;
    try {
      res = await listenWithRetries(
        MAX_RECORD_MS,
        MAX_RECOGNITION_ATTEMPTS,
        undefined,
        controller.signal,
      );
    } catch (error) {
      throw error;
    }

    if (recordTimer.current) {
      clearInterval(recordTimer.current);
      recordTimer.current = null;
    }
    if (!isCurrentRun() || res.error === "aborted") return;
    setPhase("checking");

    if (res.error === "not-allowed") {
      setPhase("mic-denied");
      recordingControllerRef.current = null;
      return;
    }
    if (res.error === "network") {
      setPhase("offline");
      recordingControllerRef.current = null;
      return;
    }

    const a = assess(lesson.expected, res.alternatives, res.confidence, res.status);
    setSpeechResult(res);
    setResult(a);

    if (isPracticeMode) {
      recordPracticeScore(lesson.id, a.matchScore);
      if (a.verdict === "pass") {
        setCompletedNow(null);
        setPhase("passed");
      } else if (a.verdict === "unclear") {
        setPhase("unclear");
      } else {
        setAttempts((n) => n + 1);
        setPhase("feedback");
      }
    } else if (a.verdict === "pass") {
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
    recordingControllerRef.current = null;
  }, [isPracticeMode, lesson]);

  /** Tap "Read Now" → permission (first time) → listen; auto-stops after MAX_RECORD_MS. */
  const onReadNow = useCallback(() => {
    beginRecording().catch(() => {
      // A rejected permission/plugin call must not leave the duplicate-tap
      // guard armed for the rest of the lesson.
      recordingControllerRef.current?.abort();
      recordingControllerRef.current = null;
      if (recordTimer.current) {
        clearInterval(recordTimer.current);
        recordTimer.current = null;
      }
    });
  }, [beginRecording]);

  /** Tap "Stop" while listening → finish early and check what was heard. */
  const onStop = useCallback(() => {
    recordingRunRef.current += 1;
    recordingControllerRef.current?.abort();
    recordingControllerRef.current = null;
    if (recordTimer.current) {
      clearInterval(recordTimer.current);
      recordTimer.current = null;
    }
    // Leave the recording state immediately. The aborted promise is ignored
    // by beginRecording and cannot enter checking/scoring afterward.
    setRecordMs(0);
    setPhase("idle");
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

  const listenButton = (text: string, testId?: string) => (
    <TeacherSpeechListenButton
      text={text}
      language={teacherLanguage}
      label={copy.listen}
      testId={testId}
    />
  );

  const teacherLanguageButton = (
    <div
      className="rounded-2xl border border-border bg-card/90 p-2 shadow-sm"
      data-testid="teacher-language-switcher"
    >
      <div className="flex items-center gap-2 px-2 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10">
          <Languages className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-[11px] font-semibold">Teacher language</p>
          <p className="text-muted-foreground truncate text-[10px]">
            {teacherLanguageMode === "english"
              ? "English only"
              : `Use ${TRANSLATION_ENGLISH_NAMES[translationLanguage]}`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1">
        {([
          ["selected", `My ${TRANSLATION_ENGLISH_NAMES[translationLanguage]}`],
          ["english", "English only"],
        ] as const).map(([mode, label]) => {
          const active = teacherLanguageMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setTeacherLanguageMode(mode);
                setTeacherLanguageModeState(mode);
              }}
              className={`flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-semibold transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={active}
              data-testid={`button-teacher-language-${mode}`}
            >
              {active && <Check className="h-3 w-3" />}
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!lesson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-background">
        <TeacherSpeechMessage
          spokenText={copy.lessonNotFound}
          language={teacherLanguage}
          listenLabel={copy.listen}
          testId="button-listen-lesson-not-found"
          contentClassName="text-muted-foreground text-sm"
        >
          <p>{copy.lessonNotFound}</p>
        </TeacherSpeechMessage>
        <Link href="/teacher" className="text-primary text-sm underline">{copy.backToTeacher}</Link>
      </div>
    );
  }

  // Structured progression: only completed lessons (review) and the next
  // uncompleted lesson are accessible. Everything ahead is locked.
  if (isPracticeMode && !isLessonCompleted(lesson.id)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center bg-background">
        <p className="text-foreground font-semibold text-sm">Practice is available after completion</p>
        <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
          Complete this lesson in the main learning path before practicing it here.
        </p>
        <Link href="/teacher/practice" className="mt-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground bg-primary">
          Back to Practice
        </Link>
      </div>
    );
  }

  if (!isPracticeMode && !isLessonUnlocked(lesson.id)) {
    const nextAllowed = getNextUncompleted();
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center bg-background"
        data-testid="panel-locked">
        <TeacherSpeechMessage
          spokenText={copy.lockedTitle}
          language={teacherLanguage}
          listenLabel={copy.listen}
          testId="button-listen-locked-title"
          contentClassName="text-foreground font-semibold text-sm"
        >
          <p>{copy.lockedTitle}</p>
        </TeacherSpeechMessage>
        <TeacherSpeechMessage
          spokenText={copy.lockedBody}
          language={teacherLanguage}
          listenLabel={copy.listen}
          testId="button-listen-locked-body"
          contentClassName="text-muted-foreground text-xs max-w-xs leading-relaxed"
        >
          <p>{copy.lockedBody}</p>
        </TeacherSpeechMessage>
        {nextAllowed && (
          <Link href={`/teacher/lesson/${nextAllowed}`}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground bg-primary">
            {copy.goToCurrentLesson}
          </Link>
        )}
        <Link href="/teacher" className="text-primary text-xs underline mt-1">{copy.backToTeacher}</Link>
      </div>
    );
  }

  const levelInfo = LEVELS[lesson.level - 1];
  const levelLessons = getLevelLessons(lesson.level);
  const next = getNextLesson(lesson.id);
  const alreadyDone = isLessonCompleted(lesson.id);
  // Smart Revision session (queue of weakest lessons)
  const revision = isPracticeMode ? null : getRevisionInfo(lesson.id);
  // Strict gate: "Pass & Next" unlocks only after the AI check passes THIS visit.
  // Outside revision, an already-completed lesson may be skipped forward (review).
  // In revision, a fresh pass is always required.
  const passed = isPracticeMode
    ? phase === "passed"
    : phase === "passed" || (!revision && alreadyDone && phase === "idle");

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
                href={isPracticeMode ? "/teacher/practice" : "/teacher"}
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
               {isPracticeMode
                 ? "Practice Mode"
                 : revision
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
        <div className="max-w-2xl mx-auto mt-3">
          {teacherLanguageButton}
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
            <TeacherSpeechMessage
              spokenText={copy.verifiedRecitation}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-verified-recitation"
              contentClassName="text-muted-foreground text-[10px] mt-2"
            >
              <p>{copy.verifiedRecitation}</p>
            </TeacherSpeechMessage>
        </div>

        {/* Tip */}
        <div className="rounded-2xl border border-border p-4 flex gap-3 bg-card">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <TeacherSpeechMessage
            spokenText={lessonGuidance}
          language={teacherLanguage}
            listenLabel={copy.listen}
            testId="button-listen-lesson-hint"
            contentClassName="text-muted-foreground text-xs leading-relaxed"
          >
            <p>{lessonGuidance}</p>
          </TeacherSpeechMessage>
        </div>

        {/* ── State panels ── */}

        {phase === "consent" && (
          <div className="relative z-30 rounded-2xl border border-border p-5 bg-card" data-testid="panel-consent">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <TeacherSpeechMessage
                spokenText={copy.consentTitle}
          language={teacherLanguage}
                listenLabel={copy.listen}
                testId="button-listen-consent-title"
                contentClassName="text-foreground font-semibold text-sm"
              >
                <p>{copy.consentTitle}</p>
              </TeacherSpeechMessage>
            </div>
            <ul className="text-muted-foreground text-xs leading-relaxed space-y-2 mb-4 list-disc pl-4">
              <li className="flex items-start gap-2">
                <span className="min-w-0 flex-1">{copy.permissionData}</span>
                {listenButton(copy.permissionData, "button-listen-consent-permission")}
              </li>
              <li className="flex items-start gap-2">
                <span className="min-w-0 flex-1">{copy.noVoiceStorage}</span>
                {listenButton(copy.noVoiceStorage, "button-listen-consent-storage")}
              </li>
              <li className="flex items-start gap-2">
                <span className="min-w-0 flex-1">{copy.recognizedTextOnly}</span>
                {listenButton(copy.recognizedTextOnly, "button-listen-consent-text")}
              </li>
              <li className="flex items-start gap-2">
                <span className="min-w-0 flex-1">{copy.deleteLearningData}</span>
                {listenButton(copy.deleteLearningData, "button-listen-consent-delete")}
              </li>
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
            <TeacherSpeechMessage
              spokenText={result.matchScore >= 90 ? copy.passedExcellent : copy.passedCorrect}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-passed-message"
              contentClassName="text-foreground font-bold text-base"
            >
              <p>{result.matchScore >= 90 ? copy.passedExcellent : copy.passedCorrect}</p>
            </TeacherSpeechMessage>
            <TeacherSpeechMessage
              spokenText={`${copy.wordMatch}: ${result.matchScore}%`}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-passed-score"
              contentClassName="text-muted-foreground text-xs mt-1"
            >
              <p>{copy.wordMatch}: {result.matchScore}%</p>
            </TeacherSpeechMessage>
            {advancedButton("button-advanced-passed")}
          </div>
        )}

        {alreadyDone && phase === "idle" && (
          <div className="rounded-2xl border border-border p-3 text-center bg-card">
            <TeacherSpeechMessage
              spokenText={copy.completedPractice}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-completed-practice"
              contentClassName="text-muted-foreground text-xs"
            >
              <p className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> {copy.completedPractice}
              </p>
            </TeacherSpeechMessage>
          </div>
        )}

        {phase === "feedback" && result && (
          <div className="rounded-2xl border border-border p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-card" data-testid="panel-feedback">
            <TeacherSpeechMessage
              spokenText={copy.retryTitle}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-retry-title"
              contentClassName="text-foreground font-semibold text-sm mb-2"
            >
              <p>{copy.retryTitle}</p>
            </TeacherSpeechMessage>
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
                <TeacherSpeechMessage
                  spokenText={copy.focusSounds}
          language={teacherLanguage}
                  listenLabel={copy.listen}
                  testId="button-listen-focus-sounds"
                  contentClassName="text-muted-foreground text-[11px] mt-2"
                >
                  <p>{copy.focusSounds}</p>
                </TeacherSpeechMessage>
              </div>
            )}
            {result.heard && (
              <TeacherSpeechMessage
                spokenText={`${copy.heard}: ${result.heard}`}
          language={teacherLanguage}
                listenLabel={copy.listen}
                testId="button-listen-heard"
                contentClassName="text-muted-foreground text-xs mb-1"
              >
                <p>{copy.heard}: <span className="font-arabic text-sm" dir="rtl">{result.heard}</span></p>
              </TeacherSpeechMessage>
            )}
            {result.missing.length > 0 && (
              <TeacherSpeechMessage
                spokenText={`${copy.focusSounds}: ${result.missing.join("، ")}`}
          language={teacherLanguage}
                listenLabel={copy.listen}
                testId="button-listen-missing-sounds"
                contentClassName="text-muted-foreground text-xs mb-1"
              >
                <p>{copy.focusSounds}:{" "}
                  <span className="font-arabic text-base text-amber-300" dir="rtl">
                    {result.missing.join(" ، ")}
                  </span>
                </p>
              </TeacherSpeechMessage>
            )}
            {result.extra.length > 0 && (
              <TeacherSpeechMessage
                spokenText={`${copy.extraSounds}: ${result.extra.join("، ")}`}
          language={teacherLanguage}
                listenLabel={copy.listen}
                testId="button-listen-extra-sounds"
                contentClassName="text-muted-foreground text-xs mb-1"
              >
                <p>{copy.extraSounds}:{" "}
                  <span className="font-arabic text-base text-amber-300" dir="rtl">
                    {result.extra.join(" ، ")}
                  </span>
                </p>
              </TeacherSpeechMessage>
            )}
            <TeacherSpeechMessage
              spokenText={lessonGuidance}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-feedback-hint"
              contentClassName="text-muted-foreground text-xs mt-2 leading-relaxed"
            >
              <p>{lessonGuidance}</p>
            </TeacherSpeechMessage>
            {attempts >= MAX_RETRIES && (
              <TeacherSpeechMessage
                spokenText={copy.retryGuidance}
          language={teacherLanguage}
                listenLabel={copy.listen}
                testId="button-listen-retry-guidance"
                contentClassName="text-muted-foreground text-xs mt-3 leading-relaxed border-t border-border pt-3"
              >
                <p>{copy.retryGuidance}</p>
              </TeacherSpeechMessage>
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
            <TeacherSpeechMessage
              spokenText={copy.unclearTitle}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-unclear-title"
              contentClassName="text-sky-300 text-sm font-medium"
            >
              <p>{copy.unclearTitle}</p>
            </TeacherSpeechMessage>
            <TeacherSpeechMessage
              spokenText={copy.unclearBody}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-unclear-body"
              contentClassName="text-sky-600 text-xs mt-1"
            >
              <p>{copy.unclearBody}</p>
            </TeacherSpeechMessage>
            {advancedButton("button-advanced-unclear")}
          </div>
        )}

        {phase === "mic-denied" && (
          <div className="rounded-2xl border border-border p-4 bg-card" data-testid="panel-denied">
            <div className="flex items-center gap-2 mb-2">
              <MicOff className="w-4 h-4 text-rose-400" />
              <TeacherSpeechMessage
                spokenText={copy.microphoneTitle}
          language={teacherLanguage}
                listenLabel={copy.listen}
                testId="button-listen-mic-title"
                contentClassName="text-foreground text-sm font-medium"
              >
                <p>{copy.microphoneTitle}</p>
              </TeacherSpeechMessage>
            </div>
            <TeacherSpeechMessage
              spokenText={copy.microphoneBody}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-mic-body"
              contentClassName="text-rose-500/80 text-xs leading-relaxed"
            >
              <p>{copy.microphoneBody}</p>
            </TeacherSpeechMessage>
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
              <TeacherSpeechMessage
                spokenText={copy.settingsFailed}
          language={teacherLanguage}
                listenLabel={copy.listen}
                testId="button-listen-settings-failed"
                contentClassName="text-rose-400/80 text-[11px] mt-2 leading-relaxed"
              >
                <p data-testid="text-settings-fallback">{copy.settingsFailed}</p>
              </TeacherSpeechMessage>
            )}
            {advancedButton("button-advanced-mic-denied")}
          </div>
        )}

        {phase === "no-mic" && (
          <div className="rounded-2xl border border-border p-4 bg-card" data-testid="panel-nomic">
            <div className="flex items-center gap-2 mb-2">
              <Ear className="w-4 h-4 text-primary" />
              <TeacherSpeechMessage
                spokenText={copy.listenOnlyTitle}
          language={teacherLanguage}
                listenLabel={copy.listen}
                testId="button-listen-listen-only-title"
                contentClassName="text-foreground text-sm font-medium"
              >
                <p>{copy.listenOnlyTitle}</p>
              </TeacherSpeechMessage>
            </div>
            <TeacherSpeechMessage
              spokenText={support === "none" ? copy.listenOnlyUnavailable : copy.listenOnlyAvailable}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-listen-only-body"
              contentClassName="text-muted-foreground text-xs leading-relaxed"
            >
              <p>{support === "none" ? copy.listenOnlyUnavailable : copy.listenOnlyAvailable}</p>
            </TeacherSpeechMessage>
            {noMicReason && (
              <TeacherSpeechMessage
                spokenText={`${copy.reason}: ${noMicReason}`}
          language={teacherLanguage}
                listenLabel={copy.listen}
                testId="button-listen-nomic-reason"
                contentClassName="text-muted-foreground text-[10px] mt-2 leading-relaxed"
              >
                <p data-testid="text-nomic-reason">{copy.reason}: {noMicReason}</p>
              </TeacherSpeechMessage>
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
            <TeacherSpeechMessage
              spokenText={copy.offlineTitle}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-offline-title"
              contentClassName="text-foreground text-sm font-medium"
            >
              <p>{copy.offlineTitle}</p>
            </TeacherSpeechMessage>
            <TeacherSpeechMessage
              spokenText={copy.offlineBody}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-offline-body"
              contentClassName="text-muted-foreground text-xs mt-1"
            >
              <p>{copy.offlineBody}</p>
            </TeacherSpeechMessage>
            {advancedButton("button-advanced-offline")}
          </div>
        )}

        {phase === "limit" && (
          <div className="rounded-2xl border border-border p-5 text-center bg-card" data-testid="panel-limit">
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
            <TeacherSpeechMessage
              spokenText={`${copy.limitTitle} ${getDailyStatus().limit}`}
          language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-limit-title"
              contentClassName="text-foreground font-semibold text-sm"
            >
              <p>{copy.limitTitle}</p>
            </TeacherSpeechMessage>
            <TeacherSpeechMessage
              spokenText={copy.limitBody}
              language={teacherLanguage}
              listenLabel={copy.listen}
              testId="button-listen-limit-body"
              contentClassName="text-muted-foreground text-xs mt-1 leading-relaxed"
            >
              <p>{copy.limitBody}</p>
            </TeacherSpeechMessage>
            <Link href="/teacher"
              className="inline-block mt-3 px-5 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground border border-border bg-primary">
              {copy.backToDashboard}
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
                     <TeacherSpeechMessage
                       spokenText={copy.listening}
                       language={teacherLanguage}
                       listenLabel={copy.listen}
                       testId="button-listen-listening"
                       contentClassName="text-rose-300 text-sm font-medium mt-3"
                     >
                       <p data-testid="text-listening">{copy.listening}</p>
                     </TeacherSpeechMessage>
                     <TeacherSpeechMessage
                       spokenText={`${(recordMs / 1000).toFixed(1)} seconds. ${copy.recordingAutoStop}`}
                       language={teacherLanguage}
                       listenLabel={copy.listen}
                       testId="button-listen-recording-auto-stop"
                       contentClassName="text-muted-foreground text-[11px] mt-1"
                     >
                       <p>{(recordMs / 1000).toFixed(1)}s · {copy.recordingAutoStop}</p>
                     </TeacherSpeechMessage>
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
                      <TeacherSpeechMessage
                        spokenText={copy.checking}
                        language={teacherLanguage}
                        listenLabel={copy.listen}
                        testId="button-listen-checking"
                        contentClassName="text-muted-foreground text-xs mt-3"
                      >
                        <p>{copy.checking}</p>
                      </TeacherSpeechMessage>
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
                     <TeacherSpeechMessage
                       spokenText={copy.tapToRead}
                       language={teacherLanguage}
                       listenLabel={copy.listen}
                       testId="button-listen-tap-to-read"
                       contentClassName="text-muted-foreground text-xs mt-3"
                     >
                       <p>{copy.tapToRead}</p>
                     </TeacherSpeechMessage>
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
              {isPracticeMode ? (
                <Link
                  href="/teacher/practice"
                  className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-primary-foreground text-center bg-primary"
                  data-testid="link-back-to-practice"
                >
                  Back to Practice
                </Link>
              ) : revision ? (
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
