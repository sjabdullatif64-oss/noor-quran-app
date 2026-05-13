import { useState, useEffect, useRef, useCallback } from "react";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  useSurah, ALL_LANGUAGES, TRANSLATION_LABELS, TRANSLATION_ENGLISH_NAMES,
  TTS_LANG_CODES, RTL_LANGUAGES, TranslationLanguage,
} from "@/lib/api";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight,
  Heart, Pause, Play, Volume2, Mic, Repeat, Repeat1, Layers2,
  Loader2, WifiOff, RotateCcw, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBookmarks, saveBookmark, removeBookmark } from "@/lib/bookmarks";
import { getFavAyahs, toggleAyahFav } from "@/lib/favorites";
import { getLang } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { NativeTTS } from "@/lib/native-tts";

// ── Types ──────────────────────────────────────────────────────────────────────
type AudioMode  = "arabic" | "translation" | "both";
type PlayState  = "idle" | "loading" | "playing" | "paused" | "error";
type TTSPhase   = "tts" | "arabic";
/** manual = stop after each ayah · continuous = auto-advance · repeat = loop same ayah */
type PlayMode   = "manual" | "continuous" | "repeat";

// ── Constants ──────────────────────────────────────────────────────────────────
const AUTOPLAY_KEY      = "noor-autoplay";   // kept for migration only
const PLAY_MODE_KEY     = "noor-play-mode";
const AUDIO_MODE_KEY    = "noor-audio-mode";
const BETWEEN_AYAH_MS   = 400;               // smooth silence gap between auto-advance
const MAX_RETRIES     = 3;
const RETRY_BASE_MS   = 1200;
const PRELOAD_AHEAD   = 2;
const TTS_CHUNK_CHARS = 90; // max chars per TTS chunk

/**
 * Sindhi: text-only, no TTS audio.  Voice pack essentially never installed.
 * All other supported languages route through NativeTTSPlugin.kt which calls
 * android.speech.tts.TextToSpeech directly (no WebView speechSynthesis shim).
 */
const TTS_NO_AUDIO = new Set<TranslationLanguage>(["sindhi"]);

/** Split long text into browser-safe chunks at word boundaries.
 *  Critical: Chrome mobile silently drops utterances > ~100 chars on many devices. */
function chunkText(text: string): string[] {
  const t = text?.trim();
  if (!t) return [];
  if (t.length <= TTS_CHUNK_CHARS) return [t];

  const chunks: string[] = [];
  let start = 0;
  while (start < t.length) {
    if (start + TTS_CHUNK_CHARS >= t.length) {
      const tail = t.slice(start).trim();
      if (tail) chunks.push(tail);
      break;
    }
    let end = start + TTS_CHUNK_CHARS;
    while (end > start && t[end] !== " ") end--;
    if (end === start) end = start + TTS_CHUNK_CHARS; // no space — force cut
    const chunk = t.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end + (t[end] === " " ? 1 : 0);
  }
  return chunks;
}

/** Silently preload an audio URL into browser cache. */
function preloadAudioUrl(url: string) {
  try {
    const a    = new Audio();
    a.preload  = "auto";
    a.volume   = 0;
    a.src      = url;
    a.load();
  } catch { /* best-effort */ }
}

// ── SurahReader ────────────────────────────────────────────────────────────────
export function SurahReader() {
  const params = useParams();
  const number = Number(params.number);

  const [language, setLanguage]     = useState<TranslationLanguage>(() => getLang());
  const { data: surah, isLoading }  = useSurah(number, language);

  // Bookmarks / Favorites
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(new Set());
  const [favSet, setFavSet]               = useState<Set<string>>(new Set());
  const [favPopped, setFavPopped]         = useState<string | null>(null);

  // Audio state
  const [playState, setPlayState]     = useState<PlayState>("idle");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [audioMode, setAudioMode]     = useState<AudioMode>(() => {
    const s = localStorage.getItem(AUDIO_MODE_KEY);
    return s === "arabic" || s === "translation" || s === "both" ? s : "arabic";
  });
  const [playMode, _setPlayMode] = useState<PlayMode>(() => {
    const s = localStorage.getItem(PLAY_MODE_KEY);
    if (s === "manual" || s === "continuous" || s === "repeat") return s;
    // Migrate from old boolean autoplay key
    return localStorage.getItem(AUTOPLAY_KEY) === "false" ? "manual" : "continuous";
  });
  const [progress, setProgress]   = useState(0);
  const [retrying, setRetrying]   = useState(false);
  const [ttsPhase, setTtsPhase]   = useState<TTSPhase>("arabic"); // for "both" label

  const setPlayMode = useCallback((m: PlayMode) => {
    _setPlayMode(m);
    localStorage.setItem(PLAY_MODE_KEY, m);
  }, []);

  // Keep screen awake while reading or playing audio
  useWakeLock(playState === "playing" || playState === "loading" || playState === "idle");

  // ── Refs (read in event callbacks — never stale) ───────────────────────────
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const cancelledRef     = useRef(false);      // set true on stop — guards all callbacks
  /** Incremented on every new playAyah call. Every async callback captures its own
   *  gen and bails immediately if playGenRef.current !== gen — this is the PRIMARY
   *  guard against overlapping audio from stale retries / error events. */
  const playGenRef       = useRef(0);
  const currentPhaseRef  = useRef<TTSPhase>("arabic");
  const retryCountRef    = useRef(0);
  const retryTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingIndexRef  = useRef<number | null>(null);
  const playModeRef      = useRef(playMode);
  const surahRef         = useRef(surah);
  const languageRef      = useRef(language);
  const audioModeRef     = useRef(audioMode);
  const ayahRefs         = useRef<Map<number, HTMLDivElement>>(new Map());

  // Toast — stable ref avoids adding `toast` to deep useCallback deps
  const { toast } = useToast();
  const toastRef  = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  // Sync all refs
  useEffect(() => { playingIndexRef.current = playingIndex; }, [playingIndex]);
  useEffect(() => { playModeRef.current     = playMode;     }, [playMode]);
  useEffect(() => { surahRef.current        = surah;        }, [surah]);
  useEffect(() => { languageRef.current     = language;     }, [language]);
  useEffect(() => { audioModeRef.current    = audioMode;    }, [audioMode]);

  // Persist audio mode
  useEffect(() => { localStorage.setItem(AUDIO_MODE_KEY, audioMode); }, [audioMode]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const scrollToAyah = useCallback((index: number) => {
    ayahRefs.current.get(index)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // ── teardownAudio — W3C-correct audio element destruction ─────────────────
  // Do NOT use `src = ""` — that fires an error event which triggers stale retries.
  // removeAttribute("src") + load() aborts the network request silently.
  const teardownAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.removeAttribute("src");
    el.load();               // abort any pending network request
    audioRef.current = null;
  }, []);

  // ── stopAll — guaranteed-safe complete halt ────────────────────────────────
  const stopAll = useCallback(() => {
    playGenRef.current++;        // invalidate ALL pending callbacks immediately
    cancelledRef.current = true;
    teardownAudio();
    clearRetryTimer();
    retryCountRef.current = 0;
    NativeTTS.stop().catch(() => {}); // stop native TTS; fire-and-forget
    setPlayState("idle");
    setProgress(0);
    setRetrying(false);
  }, [teardownAudio, clearRetryTimer]);

  // Cleanup when surah changes or component unmounts
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      NativeTTS.stop().catch(() => {}); // stop any in-progress native TTS
      clearRetryTimer();
    };
  }, [number, clearRetryTimer]);

  // ── advanceOrStop — called when any phase finishes ─────────────────────────
  // Forward ref so recursive callers always get latest version
  const playAyahRef = useRef<(index: number) => void>(() => {});

  const advanceOrStop = useCallback((completedIndex: number, gen: number) => {
    // Stale generation → a newer playAyah is already running, do nothing
    if (cancelledRef.current || playGenRef.current !== gen) return;
    const mode = playModeRef.current;

    // Repeat one — replay same ayah after brief breathing gap
    if (mode === "repeat") {
      setTimeout(() => {
        if (!cancelledRef.current && playGenRef.current === gen)
          playAyahRef.current(completedIndex);
      }, BETWEEN_AYAH_MS);
      return;
    }

    const snap = surahRef.current;
    if (!snap) { setPlayState("idle"); return; }
    const next = completedIndex + 1;

    if (mode === "continuous" && next < snap.ayahs.length) {
      // Smooth 400 ms silence between ayahs — natural breathing room
      setTimeout(() => {
        if (!cancelledRef.current && playGenRef.current === gen) {
          scrollToAyah(next);
          playAyahRef.current(next);
        }
      }, BETWEEN_AYAH_MS);
    } else {
      setPlayState("idle");
      setPlayingIndex(null);
      playingIndexRef.current = null;
      setProgress(0);
    }
  }, [scrollToAyah]);

  // ── Arabic CDN phase ───────────────────────────────────────────────────────
  const playArabicPhaseRef = useRef<(idx: number, gen: number, onDone: () => void) => void>(() => {});

  const playArabicPhase = useCallback((index: number, gen: number, onDone: () => void) => {
    // Stale gen → another playAyah has taken over, abort silently
    if (cancelledRef.current || playGenRef.current !== gen) return;

    const cur  = surahRef.current;
    const ayah = cur?.ayahs[index];
    if (!ayah) { onDone(); return; }

    currentPhaseRef.current = "arabic";
    setTtsPhase("arabic");

    // Destroy previous audio — use removeAttribute("src")+load(), NOT src=""
    // src="" fires an error event that triggers stale retries (the overlap bug)
    teardownAudio();

    const audio   = new Audio();
    audio.preload = "auto";
    audio.src     = ayah.audioUrl;
    audioRef.current = audio;

    setPlayState("loading");
    setProgress(0);

    audio.addEventListener("playing", () => {
      if (cancelledRef.current || playGenRef.current !== gen) return;
      setPlayState("playing");
      setRetrying(false);
    });

    audio.addEventListener("timeupdate", () => {
      // Guard gen so stale audio doesn't clobber progress bar of new ayah
      if (playGenRef.current !== gen) return;
      if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
    });

    audio.addEventListener("ended", () => {
      if (cancelledRef.current || playGenRef.current !== gen) return;
      setProgress(1);
      retryCountRef.current = 0;
      onDone();
    });

    audio.addEventListener("error", () => {
      // CRITICAL: without gen guard, src teardown fires error → retry of OLD ayah → overlap
      if (cancelledRef.current || playGenRef.current !== gen) return;
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        setRetrying(true);
        setPlayState("loading");
        retryTimerRef.current = setTimeout(() => {
          if (!cancelledRef.current && playGenRef.current === gen)
            playArabicPhaseRef.current(index, gen, onDone);
        }, RETRY_BASE_MS * retryCountRef.current);
      } else {
        retryCountRef.current = 0;
        setRetrying(false);
        setPlayState("error");
      }
    });

    audio.load();
    audio.play().catch(() => {
      if (!cancelledRef.current && playGenRef.current === gen) setPlayState("paused");
    });
    scrollToAyah(index);

    // Silently preload upcoming ayahs
    if (cur) {
      for (let i = 1; i <= PRELOAD_AHEAD; i++) {
        const next = cur.ayahs[index + i];
        if (next) preloadAudioUrl(next.audioUrl);
      }
    }
  }, [scrollToAyah, teardownAudio]);

  useEffect(() => { playArabicPhaseRef.current = playArabicPhase; }, [playArabicPhase]);

  // ── TTS phase — native Android TextToSpeech via NativeTTSPlugin ──────────
  /**
   * WHY we replaced speechSynthesis with a native plugin
   * ────────────────────────────────────────────────────
   * Android Capacitor WebView does NOT reliably implement the Web Speech API:
   *   • getVoices() frequently returns [] (no voiceschanged event either)
   *   • speak() enqueues utterances but the engine never dequeues them
   *   • onstart never fires → the 6-second watchdog masked the failure
   * The root cause is that Chrome WebView ships without the TTS bridge enabled
   * on many Android builds/OEMs.
   *
   * Fix: NativeTTSPlugin.kt calls android.speech.tts.TextToSpeech directly,
   * bypassing the WebView layer entirely.  speak() returns a Promise that
   * resolves when the utterance finishes, so chunks are simply chained
   * sequentially.  The gen guard aborts the chain the moment the user stops
   * playback or moves to a different ayah.
   */
  const playTTSPhase = useCallback((index: number, gen: number, onDone: () => void) => {
    if (cancelledRef.current || playGenRef.current !== gen) { onDone(); return; }

    const ayah = surahRef.current?.ayahs[index];
    const text = ayah?.textTranslation ?? "";
    if (!text) { onDone(); return; }

    const lang   = languageRef.current;
    const code   = TTS_LANG_CODES[lang] ?? "en-US";
    const chunks = chunkText(text);
    if (!chunks.length) { onDone(); return; }

    currentPhaseRef.current = "tts";
    setTtsPhase("tts");
    teardownAudio();
    setPlayState("playing");
    setProgress(0);
    scrollToAyah(index);

    let chunkIdx = 0;

    function speakNext() {
      if (cancelledRef.current || playGenRef.current !== gen) return;

      if (chunkIdx >= chunks.length) {
        currentPhaseRef.current = "arabic";
        setTtsPhase("arabic");
        onDone();
        return;
      }

      const chunk = chunks[chunkIdx++];

      NativeTTS.speak({ text: chunk, lang: code, rate: 0.86, pitch: 1.0 })
        .then(() => {
          if (!cancelledRef.current && playGenRef.current === gen) speakNext();
        })
        .catch((err: unknown) => {
          if (cancelledRef.current || playGenRef.current !== gen) return;
          const msg = (err instanceof Error ? err.message : String(err)).toUpperCase();

          if (msg.includes("LANG_NOT_SUPPORTED") || msg.includes("LANG_MISSING")) {
            // Android TTS engine doesn't have a voice for this language.
            const label = TRANSLATION_ENGLISH_NAMES[lang] ?? lang;
            toastRef.current({
              title: `${label} voice not installed`,
              description:
                "Go to Android Settings → General Management → Language & Input → Text-to-Speech to install this voice.",
            });
            setPlayState("idle");
            setPlayingIndex(null);
            playingIndexRef.current = null;
          } else {
            // Non-language error (network, TTS engine hiccup) — skip chunk
            speakNext();
          }
        });
    }

    speakNext();
  }, [scrollToAyah, teardownAudio]);

  // ── Unified dispatcher ─────────────────────────────────────────────────────
  const playAyah = useCallback((index: number) => {
    // 1. Bump the generation counter FIRST — this instantly invalidates every
    //    pending callback (error handlers, retries, advance timers) from the
    //    previous ayah. This is the single source of truth for "is this playback
    //    still wanted?". All async paths check gen before acting.
    const gen = ++playGenRef.current;

    cancelledRef.current = false;
    clearRetryTimer();
    retryCountRef.current = 0;

    const cur = surahRef.current;
    if (!cur?.ayahs[index]) return;

    const mode = audioModeRef.current;
    const lang = languageRef.current;

    // 2. Tear down existing audio and native TTS cleanly
    teardownAudio();
    NativeTTS.stop().catch(() => {}); // fire-and-forget; gen guard prevents overlap

    setPlayingIndex(index);
    playingIndexRef.current = index;
    setRetrying(false);
    setProgress(0);

    // onComplete passes gen so advanceOrStop can verify the chain is still valid
    const onComplete   = () => advanceOrStop(index, gen);
    const ttsAvailable = !TTS_NO_AUDIO.has(lang); // false only for Sindhi

    if (mode === "arabic") {
      playArabicPhase(index, gen, onComplete);

    } else if (mode === "translation") {
      if (ttsAvailable) {
        playTTSPhase(index, gen, onComplete);
      } else {
        // Sindhi: text-only, no TTS — just stop cleanly
        setPlayState("idle");
        setPlayingIndex(null);
        playingIndexRef.current = null;
      }

    } else {
      // "both" — Arabic CDN first, THEN translation TTS
      playArabicPhase(index, gen, () => {
        if (!cancelledRef.current && playGenRef.current === gen) {
          if (ttsAvailable) {
            playTTSPhase(index, gen, onComplete);
          } else {
            onComplete();
          }
        }
      });
    }
  }, [advanceOrStop, playArabicPhase, playTTSPhase, teardownAudio, clearRetryTimer]);

  useEffect(() => { playAyahRef.current = playAyah; }, [playAyah]);

  // ── Playback controls ──────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (playState === "idle" || playState === "error") {
      playAyah(playingIndexRef.current ?? 0);
      return;
    }

    const mode  = audioModeRef.current;
    const phase = currentPhaseRef.current;
    const isTTSActive = mode === "translation" || (mode === "both" && phase === "tts");

    if (isTTSActive) {
      if (playState === "playing") {
        // Native TTS has no pause API — stop the chain and mark paused so
        // the user can tap play again to restart from the current ayah.
        playGenRef.current++;
        NativeTTS.stop().catch(() => {});
        setPlayState("paused");
      } else if (playState === "paused") {
        // Restart the current ayah (native TTS doesn't support mid-resume)
        playAyah(playingIndexRef.current ?? 0);
      }
    } else if (audioRef.current) {
      if (playState === "playing" || playState === "loading") {
        audioRef.current.pause();
        setPlayState("paused");
      } else if (playState === "paused") {
        audioRef.current.play().catch(() => {});
        setPlayState("playing");
      }
    }
  }, [playState, playAyah]);

  const handlePrev = useCallback(() => {
    const idx = playingIndexRef.current;
    if (idx === null || idx <= 0) return;
    playAyah(idx - 1);
  }, [playAyah]);

  const handleNext = useCallback(() => {
    const cur  = surahRef.current;
    if (!cur) return;
    const next = playingIndexRef.current === null ? 0 : playingIndexRef.current + 1;
    if (next < cur.ayahs.length) playAyah(next);
  }, [playAyah]);

  const handleModeChange = useCallback((mode: AudioMode) => {
    stopAll();
    setPlayingIndex(null);
    playingIndexRef.current = null;
    setAudioMode(mode);
  }, [stopAll]);

  const handleLanguageChange = useCallback((lang: TranslationLanguage) => {
    const mode = audioModeRef.current;
    if (mode === "translation" || mode === "both") stopAll();
    setLanguage(lang);
  }, [stopAll]);

  const handleRetry = useCallback(() => {
    retryCountRef.current = 0;
    playAyah(playingIndexRef.current ?? 0);
  }, [playAyah]);

  // ── Bookmarks & Favorites ──────────────────────────────────────────────────
  useEffect(() => {
    const stored = getBookmarks();
    setBookmarkedSet(new Set(stored.map((b) => `${b.surahNumber}-${b.ayahNumber}`)));
    const favs = getFavAyahs();
    setFavSet(new Set(
      favs.filter((a) => a.surahNumber === number).map((a) => `${a.surahNumber}-${a.ayahNumber}`)
    ));
  }, [number]);

  const toggleBookmark = useCallback((ayahIndex: number) => {
    if (!surah) return;
    const ayah = surah.ayahs[ayahIndex];
    const key  = `${number}-${ayah.numberInSurah}`;
    if (bookmarkedSet.has(key)) {
      removeBookmark(number, ayah.numberInSurah);
      setBookmarkedSet((p) => { const n = new Set(p); n.delete(key); return n; });
    } else {
      saveBookmark({
        surahNumber: number, surahName: surah.name, surahEnglishName: surah.englishName,
        ayahNumber:  ayah.numberInSurah, globalNumber: ayah.globalNumber,
        textAr: ayah.textAr, textTranslation: ayah.textTranslation, savedAt: Date.now(),
      });
      setBookmarkedSet((p) => new Set(p).add(key));
    }
  }, [surah, number, bookmarkedSet]);

  const toggleFavorite = useCallback((ayahIndex: number) => {
    if (!surah) return;
    const ayah  = surah.ayahs[ayahIndex];
    const key   = `${number}-${ayah.numberInSurah}`;
    const added = toggleAyahFav({
      surahNumber: number, surahEnglishName: surah.englishName, surahName: surah.name,
      ayahNumber:  ayah.numberInSurah, globalNumber: ayah.globalNumber,
      textAr: ayah.textAr, textTranslation: ayah.textTranslation,
    });
    setFavSet((p) => { const n = new Set(p); added ? n.add(key) : n.delete(key); return n; });
    if (added) { setFavPopped(key); setTimeout(() => setFavPopped(null), 800); }
  }, [surah, number]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isRtl       = RTL_LANGUAGES.has(language);
  const langShort   = TRANSLATION_LABELS[language] ?? language;
  const ttsEnabled  = !TTS_NO_AUDIO.has(language); // false only for Sindhi
  const isSindhi    = language === "sindhi";
  const isActive    = playState === "playing";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0 pb-48 md:pb-10 animate-in fade-in duration-500 max-w-4xl mx-auto">

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md -mx-4 px-4 pt-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground px-2 shrink-0">
            <Link href="/quran" data-testid="link-back-quran">
              <ArrowLeft className="w-4 h-4 mr-1" />Back
            </Link>
          </Button>

          {/* Scrollable language pills */}
          <div
            className="flex items-center gap-1 overflow-x-auto flex-1"
            data-testid="language-switcher"
            style={{ scrollbarWidth: "none" }}
          >
            {ALL_LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  language === lang
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground bg-muted/50"
                }`}
                data-testid={`button-lang-${lang}`}
              >
                {TRANSLATION_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center space-y-2">
            <Skeleton className="h-7 w-40 mx-auto" />
            <Skeleton className="h-4 w-28 mx-auto" />
          </div>
        ) : (
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-primary">{surah?.englishName}</h1>
            <p className="text-muted-foreground text-sm">
              {surah?.englishNameTranslation} · {surah?.revelationType} · {surah?.numberOfAyahs} Verses
            </p>
            <h2 dir="rtl" className="text-3xl font-arabic text-primary mt-1">{surah?.name}</h2>
          </div>
        )}
      </div>

      {/* ── Sindhi text-only notice ────────────────────────────────────── */}
      {isSindhi && !isLoading && (
        <div className="mx-4 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Sindhi translation is text-only — no audio playback available for this language.</span>
        </div>
      )}

      {/* ── Bismillah ─────────────────────────────────────────────────── */}
      {number !== 1 && number !== 9 && !isLoading && (
        <div className="text-center py-10 border-b border-border/50">
          <p dir="rtl" className="text-4xl md:text-5xl font-arabic text-primary leading-loose">
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
        </div>
      )}

      {/* ── Ayah list ─────────────────────────────────────────────────── */}
      <div className="space-y-0 mt-6">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-8 border-b border-border/40 space-y-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-6 w-4/5 ml-auto" />
              </div>
            ))
          : surah?.ayahs.map((ayah, index) => {
              const key       = `${number}-${ayah.numberInSurah}`;
              const bm        = bookmarkedSet.has(key);
              const isCurrent = playingIndex === index;

              return (
                <div
                  key={ayah.numberInSurah}
                  ref={(el) => {
                    if (el) ayahRefs.current.set(index, el);
                    else    ayahRefs.current.delete(index);
                  }}
                  className={`group relative flex flex-col gap-5 py-8 border-b border-border/40 last:border-0 transition-all duration-500 ${
                    isCurrent
                      ? "bg-primary/[0.07] dark:bg-primary/10 pl-5 pr-2 -mx-2"
                      : "px-2 hover:bg-muted/30"
                  }`}
                  data-testid={`ayah-${ayah.numberInSurah}`}
                >
                  {/* Left accent bar — only when this ayah is active */}
                  {isCurrent && (
                    <div className={`absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full transition-all duration-500 ${
                      isActive ? "bg-primary" : "bg-primary/40"
                    }`} />
                  )}
                  {/* Controls row */}
                  <div className="flex items-center justify-between">
                    {/* Ayah number badge */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0 ${
                        isCurrent && isActive
                          ? "bg-primary text-primary-foreground scale-110"
                          : isCurrent
                          ? "bg-primary/20 text-primary"
                          : "border-2 border-primary/20 text-primary"
                      }`}
                    >
                      {isCurrent && playState === "loading"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : ayah.numberInSurah}
                    </div>

                    {/* Animated waveform (current + playing) */}
                    {isCurrent && isActive && (
                      <div className="flex items-end gap-0.5 h-5 mx-2">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-0.5 rounded-full bg-primary"
                            style={{
                              height: `${10 + (i % 2 === 0 ? 8 : 4)}px`,
                              animation: "wave 0.8s ease-in-out infinite alternate",
                              animationDelay: `${i * 120}ms`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Per-ayah action buttons — always visible (mobile + desktop) */}
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        variant="ghost" size="icon"
                        className={`w-8 h-8 ${isCurrent && isActive ? "text-primary" : "text-muted-foreground"}`}
                        onClick={() => isCurrent ? handlePlayPause() : playAyah(index)}
                        data-testid={`button-play-ayah-${ayah.numberInSurah}`}
                      >
                        {isCurrent && isActive
                          ? <Pause className="w-4 h-4" />
                          : <Play  className="w-4 h-4" />}
                      </Button>

                      <Button
                        variant="ghost" size="icon"
                        className={`w-8 h-8 transition-all ${
                          favSet.has(key) ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"
                        }`}
                        onClick={() => toggleFavorite(index)}
                        data-testid={`button-fav-ayah-${ayah.numberInSurah}`}
                      >
                        <Heart className={`w-4 h-4 transition-transform ${
                          favPopped === key ? "scale-150" : "scale-100"
                        } ${favSet.has(key) ? "fill-rose-500" : ""}`} />
                      </Button>

                      <Button
                        variant="ghost" size="icon"
                        className={`w-8 h-8 ${bm ? "text-primary" : "text-muted-foreground"}`}
                        onClick={() => toggleBookmark(index)}
                        data-testid={`button-bookmark-ayah-${ayah.numberInSurah}`}
                      >
                        {bm ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Arabic text */}
                  <p dir="rtl" className="text-3xl md:text-4xl font-arabic leading-[2.2] text-foreground text-right">
                    {ayah.textAr}
                  </p>

                  {/* Transliteration (Roman script) — shown when available */}
                  {ayah.textTranslit && (
                    <p className="text-sm text-muted-foreground/70 italic leading-relaxed tracking-wide">
                      {ayah.textTranslit}
                    </p>
                  )}

                  {/* Translation text */}
                  {ayah.textTranslation ? (
                    <p
                      dir={isRtl ? "rtl" : "ltr"}
                      className={`text-lg md:text-xl leading-relaxed font-serif transition-colors duration-300 ${
                        isRtl ? "text-right" : "text-left"
                      } ${isCurrent ? "text-foreground/80" : "text-muted-foreground"}`}
                    >
                      {ayah.textTranslation}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic">
                      Translation unavailable for this language
                    </p>
                  )}
                </div>
              );
            })}
      </div>

      {/* ── Sticky audio player ────────────────────────────────────────── */}
      {surah && (
        <AudioPlayer
          playState={playState}
          audioMode={audioMode}
          ttsPhase={ttsPhase}
          playingIndex={playingIndex}
          surahName={surah.englishName}
          totalAyahs={surah.ayahs.length}
          progress={progress}
          playMode={playMode}
          language={language}
          langShort={langShort}
          ttsEnabled={ttsEnabled}
          isSindhi={isSindhi}
          retrying={retrying}
          onPlayPause={handlePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
          onModeChange={handleModeChange}
          onPlayModeChange={(m) => setPlayMode(m)}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}

// ── AudioPlayer ────────────────────────────────────────────────────────────────
interface AudioPlayerProps {
  playState:         PlayState;
  audioMode:         AudioMode;
  ttsPhase:          TTSPhase;
  playingIndex:      number | null;
  surahName:         string;
  totalAyahs:        number;
  progress:          number;
  playMode:          PlayMode;
  language:          TranslationLanguage;
  langShort:         string;
  ttsEnabled:        boolean;
  isSindhi:          boolean;
  retrying:          boolean;
  onPlayPause:       () => void;
  onPrev:            () => void;
  onNext:            () => void;
  onModeChange:      (m: AudioMode) => void;
  onPlayModeChange:  (m: PlayMode) => void;
  onRetry:           () => void;
}

function AudioPlayer({
  playState, audioMode, ttsPhase, playingIndex, surahName, totalAyahs,
  progress, playMode, langShort, ttsEnabled, isSindhi, retrying,
  onPlayPause, onPrev, onNext, onModeChange, onPlayModeChange, onRetry,
}: AudioPlayerProps) {
  const isPlaying   = playState === "playing";
  const isLoading   = playState === "loading";
  const isError     = playState === "error";
  const showPause   = isPlaying || isLoading;
  const progressPct = `${(progress * 100).toFixed(1)}%`;

  // Current phase label for "both" mode
  const phaseLabel  = audioMode === "both"
    ? ttsPhase === "tts" ? "Translation" : "Recitation"
    : null;

  // Track info line
  const trackLine = playingIndex !== null
    ? `${surahName} · Verse ${playingIndex + 1} of ${totalAyahs}${phaseLabel ? ` · ${phaseLabel}` : ""}`
    : audioMode === "arabic"
    ? "Al-Afasy recitation"
    : audioMode === "translation"
    ? `${langShort} translation`
    : "Recitation + Translation";

  const statusLine = retrying
    ? "Reconnecting…"
    : isLoading
    ? "Loading…"
    : isError
    ? "Tap retry to reload"
    : playState === "paused"
    ? "Paused"
    : isPlaying && audioMode === "arabic"
    ? "Arabic CDN · 128kbps"
    : isPlaying && audioMode === "translation"
    ? `${langShort} TTS`
    : isPlaying && audioMode === "both"
    ? ttsPhase === "arabic" ? `Arabic CDN · ${langShort} next` : `${langShort} TTS`
    : "";

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 border-t border-border bg-card/96 backdrop-blur-md shadow-2xl">

      {/* Progress bar */}
      <div className="h-1 bg-muted relative overflow-hidden">
        {isLoading || retrying ? (
          <div
            className="absolute inset-y-0 w-1/3 bg-primary/70 rounded-full"
            style={{ animation: "shimmer 1.4s ease-in-out infinite" }}
          />
        ) : (
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 ease-out"
            style={{ width: progressPct }}
          />
        )}
      </div>

      {/* Mode selector row */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2">
        <span className="text-[11px] text-muted-foreground shrink-0 font-medium">Mode:</span>

        <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
          {/* Arabic Recitation */}
          <ModeBtn
            active={audioMode === "arabic"}
            onClick={() => onModeChange("arabic")}
            testId="button-audio-mode-arabic"
            icon={<Volume2 className="w-3 h-3" />}
            label="Recitation"
          />

          {/* Translation TTS */}
          <ModeBtn
            active={audioMode === "translation"}
            onClick={() => onModeChange("translation")}
            testId="button-audio-mode-translation"
            disabled={!ttsEnabled}
            disabledTip={isSindhi ? "Text only" : "No voice installed"}
            icon={<Mic className="w-3 h-3" />}
            label={langShort}
          />

          {/* Both */}
          <ModeBtn
            active={audioMode === "both"}
            onClick={() => onModeChange("both")}
            testId="button-audio-mode-both"
            disabled={!ttsEnabled}
            disabledTip={isSindhi ? "Text only" : "No voice installed"}
            icon={<Layers2 className="w-3 h-3" />}
            label="Both"
          />
        </div>

        {/* Play-mode cycle button — Manual → Auto → Repeat One → Manual */}
        <button
          onClick={() => {
            const next: PlayMode = playMode === "manual" ? "continuous"
              : playMode === "continuous" ? "repeat" : "manual";
            onPlayModeChange(next);
          }}
          data-testid="button-audio-playmode"
          title={
            playMode === "manual"     ? "Manual — tap to enable Auto-play"
            : playMode === "continuous" ? "Auto — tap to enable Repeat One"
            : "Repeat One — tap to disable"
          }
          className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
            playMode === "manual"
              ? "text-muted-foreground border-border/40 hover:text-foreground"
              : playMode === "continuous"
              ? "bg-primary/10 text-primary border-primary/25"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
          }`}
        >
          {playMode === "repeat"
            ? <Repeat1 className="w-3 h-3" />
            : <Repeat  className="w-3 h-3" />}
          <span className="hidden sm:inline">
            {playMode === "manual" ? "Manual" : playMode === "continuous" ? "Auto" : "Repeat"}
          </span>
        </button>
      </div>

      {/* Playback controls row */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">

        {/* Status icon */}
        <div className="shrink-0 w-5 flex justify-center">
          {isLoading || retrying
            ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
            : isError
            ? <WifiOff className="w-4 h-4 text-destructive" />
            : <div className={`${isPlaying ? "text-primary" : "text-muted-foreground/50"}`}>
                {audioMode === "arabic" || (audioMode === "both" && ttsPhase === "arabic")
                  ? <Volume2 className="w-4 h-4" />
                  : <Mic className="w-4 h-4" />}
              </div>
          }
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isError ? "text-destructive" : "text-foreground"}`}>
            {trackLine}
          </p>
          {statusLine && (
            <p className={`text-xs mt-0.5 truncate ${
              isError ? "text-destructive/70"
              : retrying || isLoading ? "text-primary/70 animate-pulse"
              : "text-muted-foreground"
            }`}>
              {statusLine}
            </p>
          )}
        </div>

        {/* Prev / Play-Pause / Next */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost" size="icon"
            onClick={onPrev}
            disabled={playingIndex === null || playingIndex <= 0}
            data-testid="button-audio-prev"
            className="w-9 h-9"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {isError ? (
            <Button
              variant="default" size="icon"
              onClick={onRetry}
              data-testid="button-audio-retry"
              className="w-10 h-10 rounded-full bg-destructive hover:bg-destructive/90"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="default" size="icon"
              onClick={onPlayPause}
              data-testid="button-audio-play-pause"
              className="w-10 h-10 rounded-full"
            >
              {isLoading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : showPause
                ? <Pause className="w-5 h-5" />
                : <Play  className="w-5 h-5" />}
            </Button>
          )}

          <Button
            variant="ghost" size="icon"
            onClick={onNext}
            disabled={playingIndex === totalAyahs - 1}
            data-testid="button-audio-next"
            className="w-9 h-9"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── ModeBtn ────────────────────────────────────────────────────────────────────
function ModeBtn({
  active, onClick, icon, label, testId, disabled, disabledTip,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; testId?: string; disabled?: boolean; disabledTip?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      data-testid={testId}
      title={disabled ? disabledTip : undefined}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        disabled
          ? "opacity-35 cursor-not-allowed text-muted-foreground"
          : active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span className="max-w-[5.5rem] truncate">{label}</span>
    </button>
  );
}
