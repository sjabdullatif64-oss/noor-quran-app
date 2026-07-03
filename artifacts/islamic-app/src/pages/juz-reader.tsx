import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Loader2, AlertCircle, BookOpen,
  Play, Pause, Bookmark, BookmarkCheck, Heart,
  Volume2, Mic, Layers2, Repeat, Repeat1,
  ChevronLeft, ChevronRight, WifiOff, RotateCcw,
} from "lucide-react";
import { JUZ_DATA } from "@/lib/juz-data";
import { getLang } from "@/lib/settings";
import {
  TRANSLATION_EDITIONS,
  RTL_LANGUAGES,
  TTS_LANG_CODES,
  TRANSLATION_ENGLISH_NAMES,
  TRANSLATION_LABELS,
  sanitizeTranslation,
  getAudioUrl,
  type TranslationLanguage,
} from "@/lib/api";
import { getBookmarks, saveBookmark, removeBookmark } from "@/lib/bookmarks";
import { getFavAyahs, toggleAyahFav } from "@/lib/favorites";
import { NativeTTS } from "@/lib/native-tts";
import { useToast } from "@/hooks/use-toast";
import { useWakeLock } from "@/hooks/useWakeLock";
import { AyahActionsMenu } from "@/components/ayah-actions-menu";
import { useAyahDisplaySettings, applyExplanatorySetting } from "@/lib/ayah-display";

// ── Types ──────────────────────────────────────────────────────────────────────
type AudioMode = "arabic" | "translation" | "both";
type PlayState = "idle" | "loading" | "playing" | "paused" | "error";
type TTSPhase  = "tts" | "arabic";
type PlayMode  = "manual" | "continuous" | "repeat";

// ── Constants ──────────────────────────────────────────────────────────────────
const PLAY_MODE_KEY   = "noor-play-mode";
const AUDIO_MODE_KEY  = "noor-audio-mode";
const BETWEEN_AYAH_MS = 400;
const MAX_RETRIES     = 3;
const RETRY_BASE_MS   = 1200;
const PRELOAD_AHEAD   = 2;
const TTS_CHUNK_CHARS = 90;
const TTS_NO_AUDIO    = new Set<TranslationLanguage>(["sindhi"]);

// ── Helpers (mirrors surah.tsx) ────────────────────────────────────────────────
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
    if (end === start) end = start + TTS_CHUNK_CHARS;
    const chunk = t.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end + (t[end] === " " ? 1 : 0);
  }
  return chunks;
}

function preloadAudioUrl(url: string) {
  try {
    const a = new Audio();
    a.preload = "auto";
    a.volume  = 0;
    a.src     = url;
    a.load();
  } catch { /* best-effort */ }
}

// ── Data types ─────────────────────────────────────────────────────────────────
const SURAH_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6,
];

interface JuzAyah {
  numberInSurah: number;
  globalNumber: number;
  textAr: string;
  textTranslation: string;
}

interface JuzSection {
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  surahEnglishNameTranslation: string;
  ayahs: JuzAyah[];
}

interface FlatAyah {
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  numberInSurah: number;
  globalNumber: number;
  textAr: string;
  textTranslation: string;
  audioUrl: string;
}

// ── API fetch ──────────────────────────────────────────────────────────────────
async function safeFetch(url: string): Promise<unknown> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

async function fetchSurahRange(
  surahNumber: number,
  lang: TranslationLanguage,
  fromAyah: number,
  toAyah: number
): Promise<JuzSection | null> {
  const edition = TRANSLATION_EDITIONS[lang];
  const [arData, trData] = await Promise.all([
    safeFetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`),
    safeFetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${edition}`),
  ]);

  type RawAyah = { number: number; numberInSurah: number; text: string };
  const ar = arData as {
    data: {
      name: string;
      englishName: string;
      englishNameTranslation: string;
      ayahs: RawAyah[];
    };
  } | null;
  if (!ar?.data?.ayahs) return null;

  const trAyahs =
    (trData as { data?: { ayahs?: { text: string }[] } } | null)?.data?.ayahs ?? [];

  const ayahs: JuzAyah[] = ar.data.ayahs
    .filter((a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah)
    .map((a) => ({
      numberInSurah: a.numberInSurah,
      globalNumber: a.number,
      textAr: a.text,
      textTranslation: sanitizeTranslation(lang, trAyahs[a.numberInSurah - 1]?.text ?? ""),
    }));

  if (ayahs.length === 0) return null;

  return {
    surahNumber,
    surahName: ar.data.name,
    surahEnglishName: ar.data.englishName,
    surahEnglishNameTranslation: ar.data.englishNameTranslation,
    ayahs,
  };
}

// ── JuzReader ──────────────────────────────────────────────────────────────────
export function JuzReader() {
  const { number } = useParams<{ number: string }>();
  const [, navigate] = useLocation();
  const juzNumber = parseInt(number ?? "1", 10);

  // Parse ?surah=S&ayah=A query params — set by bookmark/favorite navigation
  const { targetSurahNum, targetAyahNum } = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const s = parseInt(p.get("surah") ?? "", 10);
      const a = parseInt(p.get("ayah")  ?? "", 10);
      return {
        targetSurahNum: Number.isFinite(s) && s >= 1 ? s : null,
        targetAyahNum:  Number.isFinite(a) && a >= 1 ? a : null,
      };
    } catch { return { targetSurahNum: null, targetAyahNum: null }; }
  }, []); // intentionally empty — URL params don't change while page is mounted

  // ── Data loading ───────────────────────────────────────────────────────────
  const [sections, setSections] = useState<JuzSection[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const cancelLoadRef           = useRef<() => void>(() => {});
  const juzInfo                 = JUZ_DATA[juzNumber - 1];

  // Language is fixed at page-load time (no switcher in Juz view)
  const [language] = useState<TranslationLanguage>(() => getLang());
  const languageRef = useRef(language);
  useEffect(() => { languageRef.current = language; }, [language]);

  // ── Flat ayah list (sequential index for audio) ────────────────────────────
  const flatAyahs = useMemo<FlatAyah[]>(() =>
    sections.flatMap((section) =>
      section.ayahs.map((ayah) => ({
        surahNumber:     section.surahNumber,
        surahName:       section.surahName,
        surahEnglishName: section.surahEnglishName,
        numberInSurah:   ayah.numberInSurah,
        globalNumber:    ayah.globalNumber,
        textAr:          ayah.textAr,
        textTranslation: ayah.textTranslation,
        audioUrl:        getAudioUrl(ayah.globalNumber),
      }))
    ),
    [sections]
  );
  const flatAyahsRef = useRef(flatAyahs);
  useEffect(() => { flatAyahsRef.current = flatAyahs; }, [flatAyahs]);

  // Section start offsets in flat list (used to map section+ayah → flat index)
  const sectionOffsets = useMemo(() => {
    const offs: number[] = [];
    let o = 0;
    for (const s of sections) { offs.push(o); o += s.ayahs.length; }
    return offs;
  }, [sections]);

  // ── Audio state ────────────────────────────────────────────────────────────
  const [playState, setPlayState]       = useState<PlayState>("idle");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [audioMode, setAudioMode]       = useState<AudioMode>(() => {
    const s = localStorage.getItem(AUDIO_MODE_KEY);
    return s === "arabic" || s === "translation" || s === "both" ? s : "arabic";
  });
  const [playMode, _setPlayMode] = useState<PlayMode>(() => {
    const s = localStorage.getItem(PLAY_MODE_KEY);
    return s === "manual" || s === "continuous" || s === "repeat" ? s : "continuous";
  });
  const [progress, setProgress]   = useState(0);
  const [retrying, setRetrying]   = useState(false);
  const [ttsPhase, setTtsPhase]   = useState<TTSPhase>("arabic");

  const setPlayMode = useCallback((m: PlayMode) => {
    _setPlayMode(m);
    localStorage.setItem(PLAY_MODE_KEY, m);
  }, []);

  // ── Bookmark / Favorite state ──────────────────────────────────────────────
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(new Set());
  const [favSet, setFavSet]               = useState<Set<string>>(new Set());
  const [favPopped, setFavPopped]         = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Keep screen awake while this screen is open
  useWakeLock(playState === "playing" || playState === "loading" || playState === "idle");

  // ── Audio refs (read in event callbacks — never stale) ─────────────────────
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const cancelledRef    = useRef(false);
  const playGenRef      = useRef(0);
  const currentPhaseRef = useRef<TTSPhase>("arabic");
  const retryCountRef   = useRef(0);
  const retryTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingIndexRef = useRef<number | null>(null);
  const playModeRef     = useRef(playMode);
  const audioModeRef    = useRef(audioMode);
  const ayahRefs        = useRef<Map<number, HTMLDivElement>>(new Map());

  const { toast } = useToast();
  const toastRef  = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  // Ayah display settings — text zoom + show/hide explanatory words (persisted)
  const { scale: ayahScale } = useAyahDisplaySettings();

  // Sync mutable refs
  useEffect(() => { playingIndexRef.current = playingIndex; }, [playingIndex]);
  useEffect(() => { playModeRef.current    = playMode;    }, [playMode]);
  useEffect(() => { audioModeRef.current   = audioMode;   }, [audioMode]);
  useEffect(() => { localStorage.setItem(AUDIO_MODE_KEY, audioMode); }, [audioMode]);

  // ── Scroll helper ──────────────────────────────────────────────────────────
  const scrollToAyah = useCallback((index: number) => {
    ayahRefs.current.get(index)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // ── Load Juz data ──────────────────────────────────────────────────────────
  function load() {
    if (!juzInfo) return;
    cancelLoadRef.current();
    let cancelled = false;
    cancelLoadRef.current = () => { cancelled = true; };

    setLoading(true);
    setError(false);
    setSections([]);

    const lang        = getLang();
    const startSurah  = juzInfo.surahNumber;
    const startAyah   = juzInfo.startAyah;
    const nextJuz     = JUZ_DATA[juzNumber];
    const endSurah    = nextJuz ? nextJuz.surahNumber : 114;
    const endAyahExc  = nextJuz ? nextJuz.startAyah : SURAH_AYAH_COUNTS[113] + 1;

    type Range = { surah: number; from: number; to: number };
    const ranges: Range[] = [];
    for (let s = startSurah; s <= endSurah; s++) {
      const from = s === startSurah ? startAyah : 1;
      const to   = s === endSurah ? endAyahExc - 1 : SURAH_AYAH_COUNTS[s - 1];
      if (to >= from) ranges.push({ surah: s, from, to });
    }

    Promise.all(ranges.map((r) => fetchSurahRange(r.surah, lang, r.from, r.to)))
      .then((results) => {
        if (cancelled) return;
        const valid = results.filter(Boolean) as JuzSection[];
        valid.length === 0 ? setError(true) : setSections(valid);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
  }

  useEffect(() => {
    load();
    return () => cancelLoadRef.current();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juzNumber]);

  // ── Load bookmarks + favorites once flat ayahs are ready ──────────────────
  useEffect(() => {
    if (flatAyahs.length === 0) return;
    const juzKeys = new Set(flatAyahs.map((a) => `${a.surahNumber}-${a.numberInSurah}`));

    const bms = getBookmarks();
    setBookmarkedSet(new Set(
      bms
        .filter((b) => juzKeys.has(`${b.surahNumber}-${b.ayahNumber}`))
        .map((b) => `${b.surahNumber}-${b.ayahNumber}`)
    ));

    const favs = getFavAyahs();
    setFavSet(new Set(
      favs
        .filter((f) => juzKeys.has(`${f.surahNumber}-${f.ayahNumber}`))
        .map((f) => `${f.surahNumber}-${f.ayahNumber}`)
    ));
  }, [flatAyahs]);

  // ── Scroll-to-target after navigation from bookmark/favorite ───────────────
  const didScrollRef = useRef(false);
  useEffect(() => {
    if (flatAyahs.length === 0 || didScrollRef.current) return;
    if (!targetSurahNum || !targetAyahNum) return;
    const flatIdx = flatAyahs.findIndex(
      (a) => a.surahNumber === targetSurahNum && a.numberInSurah === targetAyahNum
    );
    if (flatIdx === -1) return;
    didScrollRef.current = true;
    const t = setTimeout(() => {
      scrollToAyah(flatIdx);
      setHighlightedIndex(flatIdx);
      const clear = setTimeout(() => setHighlightedIndex(null), 2500);
      return () => clearTimeout(clear);
    }, 400);
    return () => clearTimeout(t);
  }, [flatAyahs, targetSurahNum, targetAyahNum, scrollToAyah]);

  // ── Audio teardown helpers ─────────────────────────────────────────────────
  const teardownAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.removeAttribute("src");
    el.load();
    audioRef.current = null;
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    playGenRef.current++;
    cancelledRef.current = true;
    teardownAudio();
    clearRetryTimer();
    retryCountRef.current = 0;
    NativeTTS.stop().catch(() => {});
    setPlayState("idle");
    setProgress(0);
    setRetrying(false);
  }, [teardownAudio, clearRetryTimer]);

  // Cleanup on juz change or unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      NativeTTS.stop().catch(() => {});
      clearRetryTimer();
    };
  }, [juzNumber, clearRetryTimer]);

  // ── Forward refs for recursive callbacks ───────────────────────────────────
  const playAyahRef        = useRef<(index: number) => void>(() => {});
  const playArabicPhaseRef = useRef<(idx: number, gen: number, onDone: () => void) => void>(() => {});

  // ── advanceOrStop ──────────────────────────────────────────────────────────
  const advanceOrStop = useCallback((completedIndex: number, gen: number) => {
    if (cancelledRef.current || playGenRef.current !== gen) return;
    const mode = playModeRef.current;

    if (mode === "repeat") {
      setTimeout(() => {
        if (!cancelledRef.current && playGenRef.current === gen)
          playAyahRef.current(completedIndex);
      }, BETWEEN_AYAH_MS);
      return;
    }

    const snap = flatAyahsRef.current;
    const next = completedIndex + 1;

    if (mode === "continuous" && next < snap.length) {
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
  const playArabicPhase = useCallback((index: number, gen: number, onDone: () => void) => {
    if (cancelledRef.current || playGenRef.current !== gen) return;

    const ayah = flatAyahsRef.current[index];
    if (!ayah) { onDone(); return; }

    currentPhaseRef.current = "arabic";
    setTtsPhase("arabic");
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

    const cur = flatAyahsRef.current;
    for (let i = 1; i <= PRELOAD_AHEAD; i++) {
      const next = cur[index + i];
      if (next) preloadAudioUrl(next.audioUrl);
    }
  }, [scrollToAyah, teardownAudio]);

  useEffect(() => { playArabicPhaseRef.current = playArabicPhase; }, [playArabicPhase]);

  // ── TTS phase (native Android TTS — same as surah.tsx) ────────────────────
  const playTTSPhase = useCallback((index: number, gen: number, onDone: () => void) => {
    if (cancelledRef.current || playGenRef.current !== gen) { onDone(); return; }

    const ayah = flatAyahsRef.current[index];
    const text  = ayah?.textTranslation ?? "";
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
            speakNext();
          }
        });
    }
    speakNext();
  }, [scrollToAyah, teardownAudio]);

  // ── Unified playAyah dispatcher ────────────────────────────────────────────
  const playAyah = useCallback((index: number) => {
    const gen = ++playGenRef.current;
    cancelledRef.current  = false;
    clearRetryTimer();
    retryCountRef.current = 0;

    const cur  = flatAyahsRef.current;
    if (!cur[index]) return;

    const mode = audioModeRef.current;
    const lang = languageRef.current;

    teardownAudio();
    NativeTTS.stop().catch(() => {});

    setPlayingIndex(index);
    playingIndexRef.current = index;
    setRetrying(false);
    setProgress(0);

    const onComplete   = () => advanceOrStop(index, gen);
    const ttsAvailable = !TTS_NO_AUDIO.has(lang);

    if (mode === "arabic") {
      playArabicPhase(index, gen, onComplete);
    } else if (mode === "translation") {
      if (ttsAvailable) {
        playTTSPhase(index, gen, onComplete);
      } else {
        setPlayState("idle");
        setPlayingIndex(null);
        playingIndexRef.current = null;
      }
    } else {
      // "both" — Arabic CDN first, then TTS
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
        playGenRef.current++;
        NativeTTS.stop().catch(() => {});
        setPlayState("paused");
      } else if (playState === "paused") {
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
    const cur  = flatAyahsRef.current;
    if (!cur.length) return;
    const next = playingIndexRef.current === null ? 0 : playingIndexRef.current + 1;
    if (next < cur.length) playAyah(next);
  }, [playAyah]);

  const handleModeChange = useCallback((mode: AudioMode) => {
    stopAll();
    setPlayingIndex(null);
    playingIndexRef.current = null;
    setAudioMode(mode);
  }, [stopAll]);

  const handleRetry = useCallback(() => {
    retryCountRef.current = 0;
    playAyah(playingIndexRef.current ?? 0);
  }, [playAyah]);

  // ── Bookmark toggle ────────────────────────────────────────────────────────
  const toggleBookmark = useCallback((flatIdx: number) => {
    const ayah = flatAyahsRef.current[flatIdx];
    if (!ayah) return;
    const key = `${ayah.surahNumber}-${ayah.numberInSurah}`;
    if (bookmarkedSet.has(key)) {
      removeBookmark(ayah.surahNumber, ayah.numberInSurah);
      setBookmarkedSet((p) => { const n = new Set(p); n.delete(key); return n; });
    } else {
      saveBookmark({
        surahNumber:      ayah.surahNumber,
        surahName:        ayah.surahName,
        surahEnglishName: ayah.surahEnglishName,
        ayahNumber:       ayah.numberInSurah,
        globalNumber:     ayah.globalNumber,
        textAr:           ayah.textAr,
        textTranslation:  ayah.textTranslation,
        savedAt:          Date.now(),
        juzNumber,
      });
      setBookmarkedSet((p) => new Set(p).add(key));
    }
  }, [bookmarkedSet, juzNumber]);

  // ── Favorite toggle ────────────────────────────────────────────────────────
  const toggleFavorite = useCallback((flatIdx: number) => {
    const ayah = flatAyahsRef.current[flatIdx];
    if (!ayah) return;
    const key   = `${ayah.surahNumber}-${ayah.numberInSurah}`;
    const added = toggleAyahFav({
      surahNumber:      ayah.surahNumber,
      surahEnglishName: ayah.surahEnglishName,
      surahName:        ayah.surahName,
      ayahNumber:       ayah.numberInSurah,
      globalNumber:     ayah.globalNumber,
      textAr:           ayah.textAr,
      textTranslation:  ayah.textTranslation,
      juzNumber,
    });
    setFavSet((p) => { const n = new Set(p); added ? n.add(key) : n.delete(key); return n; });
    if (added) { setFavPopped(key); setTimeout(() => setFavPopped(null), 800); }
  }, [juzNumber]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isRTL      = RTL_LANGUAGES.has(language);
  const langShort  = TRANSLATION_LABELS[language] ?? language;
  const ttsEnabled = !TTS_NO_AUDIO.has(language);
  const isActive   = playState === "playing";

  if (!juzInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}>
        <p className="text-emerald-500">Invalid Juz number</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-52"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b border-emerald-900/50"
        style={{ background: "rgba(7,26,14,0.97)", backdropFilter: "blur(8px)" }}>
        <button
          onClick={() => navigate("/quran")}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-emerald-900/50 text-emerald-400 shrink-0 active:scale-95 transition-transform">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-emerald-300 font-bold text-base">Juz {juzNumber}</p>
          <p className="text-emerald-700 text-xs truncate">
            {juzInfo.surahName} · Ayah {juzInfo.startAyah}
            {sections.length > 1 && ` — ${sections[sections.length - 1].surahEnglishName}`}
          </p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-900/40 bg-emerald-950/40">
          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-emerald-600 text-xs font-medium">{juzNumber} / 30</span>
        </div>
      </div>

      {/* ── Loading / error / content ──────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-emerald-700 text-sm">Loading Juz {juzNumber}…</p>
          <p className="text-emerald-900 text-xs">Fetching all surahs in this Juz</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 px-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500/60" />
          <p className="text-emerald-500 text-sm">Failed to load. Check your internet connection.</p>
          <button
            onClick={load}
            className="px-5 py-2 rounded-xl bg-emerald-800/40 border border-emerald-800/50 text-emerald-400 text-sm active:scale-95 transition-transform">
            Retry
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-8">
          {sections.map((section, sectionIdx) => (
            <div key={section.surahNumber}>
              {/* Surah header */}
              <div
                className="flex items-center justify-between mb-4 py-3 px-4 rounded-2xl border border-emerald-800/40"
                style={{ background: "rgba(10,30,18,0.7)" }}>
                <div>
                  <p className="text-emerald-300 font-bold">{section.surahEnglishName}</p>
                  <p className="text-emerald-600 text-xs">{section.surahEnglishNameTranslation}</p>
                </div>
                <p dir="rtl" className="font-arabic text-2xl text-emerald-400">{section.surahName}</p>
              </div>

              <div className="space-y-3" style={{ "--ayah-scale": ayahScale } as CSSProperties}>
                {section.ayahs.map((ayah, ayahIdx) => {
                  const flatIdx      = sectionOffsets[sectionIdx] + ayahIdx;
                  const cardKey      = `${section.surahNumber}-${ayah.numberInSurah}`;
                  const isCurrent    = playingIndex === flatIdx;
                  const isBm         = bookmarkedSet.has(cardKey);
                  const isFav        = favSet.has(cardKey);
                  const isHighlighted = highlightedIndex === flatIdx;

                  return (
                    <div
                      key={cardKey}
                      ref={(el) => {
                        if (el) ayahRefs.current.set(flatIdx, el);
                        else    ayahRefs.current.delete(flatIdx);
                      }}
                      className={`rounded-xl p-4 border transition-all duration-500 ${
                        isCurrent
                          ? "border-emerald-600/60"
                          : isHighlighted
                          ? "border-amber-500/70"
                          : "border-emerald-900/30"
                      }`}
                      style={{
                        background: isCurrent
                          ? "rgba(20,80,40,0.45)"
                          : isHighlighted
                          ? "rgba(80,60,10,0.35)"
                          : "rgba(10,30,18,0.5)",
                      }}
                    >
                      {/* Controls row */}
                      <div className="flex items-center justify-between mb-3">
                        {/* Ayah number badge */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 transition-all ${
                          isCurrent && isActive
                            ? "bg-emerald-500 text-white border-emerald-400 scale-110"
                            : isCurrent
                            ? "bg-emerald-900/50 text-emerald-400 border-emerald-600/50"
                            : "border-emerald-800/50 text-emerald-600"
                        }`}>
                          {isCurrent && playState === "loading"
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : ayah.numberInSurah}
                        </div>

                        {/* Waveform animation when playing */}
                        {isCurrent && isActive && (
                          <div className="flex items-end gap-0.5 h-4 mx-2">
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="w-0.5 rounded-full bg-emerald-500"
                                style={{
                                  height: `${8 + (i % 2 === 0 ? 6 : 3)}px`,
                                  animation: "wave 0.8s ease-in-out infinite alternate",
                                  animationDelay: `${i * 120}ms`,
                                }}
                              />
                            ))}
                          </div>
                        )}

                        {/* Play / Heart / Bookmark — always visible */}
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            onClick={() => isCurrent ? handlePlayPause() : playAyah(flatIdx)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
                              isCurrent && isActive ? "text-emerald-400" : "text-emerald-700 hover:text-emerald-400"
                            }`}
                          >
                            {isCurrent && isActive
                              ? <Pause className="w-4 h-4" />
                              : <Play  className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => toggleFavorite(flatIdx)}
                            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95"
                          >
                            <Heart className={`w-4 h-4 transition-transform ${
                              favPopped === cardKey ? "scale-150" : "scale-100"
                            } ${isFav ? "fill-rose-500 text-rose-500" : "text-emerald-700"}`} />
                          </button>

                          <button
                            onClick={() => toggleBookmark(flatIdx)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 ${
                              isBm ? "text-emerald-400" : "text-emerald-700 hover:text-emerald-400"
                            }`}
                          >
                            {isBm
                              ? <BookmarkCheck className="w-4 h-4" />
                              : <Bookmark      className="w-4 h-4" />}
                          </button>

                          <AyahActionsMenu
                            surahEnglishName={section.surahEnglishName}
                            surahName={section.surahName}
                            ayahNumber={ayah.numberInSurah}
                            textAr={ayah.textAr}
                            displayedTranslation={applyExplanatorySetting(ayah.textTranslation ?? "")}
                            triggerClassName="w-8 h-8 rounded-full flex items-center justify-center text-emerald-700 hover:text-emerald-400 transition-colors active:scale-95"
                            testId={`button-more-ayah-${ayah.numberInSurah}`}
                          />
                        </div>
                      </div>

                      {/* Arabic text */}
                      <p dir="rtl"
                        className="font-arabic text-[calc(1.25rem*var(--ayah-scale))] text-right text-emerald-100 leading-loose mb-3">
                        {ayah.textAr}
                        <span className="text-emerald-500 mr-2"> ﴿{ayah.numberInSurah}﴾</span>
                      </p>

                      {/* Translation */}
                      {ayah.textTranslation && (
                        <p
                          className={`text-emerald-400 text-[calc(0.875rem*var(--ayah-scale))] leading-relaxed pt-2 border-t border-emerald-900/30 ${
                            isRTL ? "text-right" : "text-left"
                          }`}
                          dir={isRTL ? "rtl" : "ltr"}>
                          {applyExplanatorySetting(ayah.textTranslation)}
                        </p>
                      )}

                      {/* Surah:Ayah reference badge */}
                      <div className="flex justify-end mt-2">
                        <span className="text-[10px] text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-900/40">
                          {section.surahNumber}:{ayah.numberInSurah}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sticky audio player ────────────────────────────────────────────── */}
      {!loading && !error && flatAyahs.length > 0 && (
        <JuzAudioPlayer
          playState={playState}
          audioMode={audioMode}
          ttsPhase={ttsPhase}
          playingIndex={playingIndex}
          totalAyahs={flatAyahs.length}
          progress={progress}
          playMode={playMode}
          langShort={langShort}
          ttsEnabled={ttsEnabled}
          retrying={retrying}
          onPlayPause={handlePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
          onModeChange={handleModeChange}
          onPlayModeChange={setPlayMode}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}

// ── JuzAudioPlayer ─────────────────────────────────────────────────────────────
interface JuzAudioPlayerProps {
  playState:        PlayState;
  audioMode:        AudioMode;
  ttsPhase:         TTSPhase;
  playingIndex:     number | null;
  totalAyahs:       number;
  progress:         number;
  playMode:         PlayMode;
  langShort:        string;
  ttsEnabled:       boolean;
  retrying:         boolean;
  onPlayPause:      () => void;
  onPrev:           () => void;
  onNext:           () => void;
  onModeChange:     (m: AudioMode) => void;
  onPlayModeChange: (m: PlayMode) => void;
  onRetry:          () => void;
}

function JuzAudioPlayer({
  playState, audioMode, ttsPhase, playingIndex, totalAyahs,
  progress, playMode, langShort, ttsEnabled, retrying,
  onPlayPause, onPrev, onNext, onModeChange, onPlayModeChange, onRetry,
}: JuzAudioPlayerProps) {
  const isPlaying   = playState === "playing";
  const isLoading   = playState === "loading";
  const isError     = playState === "error";
  const showPause   = isPlaying || isLoading;
  const progressPct = `${(progress * 100).toFixed(1)}%`;

  const phaseLabel = audioMode === "both"
    ? ttsPhase === "tts" ? "Translation" : "Recitation"
    : null;

  const trackLine = playingIndex !== null
    ? `Ayah ${playingIndex + 1} of ${totalAyahs}${phaseLabel ? ` · ${phaseLabel}` : ""}`
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
    <div
      className="fixed bottom-16 left-0 right-0 z-30 border-t border-emerald-900/60"
      style={{ background: "rgba(5,18,10,0.97)", backdropFilter: "blur(12px)" }}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-emerald-950 relative overflow-hidden">
        {isLoading || retrying ? (
          <div
            className="absolute inset-y-0 w-1/3 bg-emerald-600/60 rounded-full"
            style={{ animation: "shimmer 1.4s ease-in-out infinite" }}
          />
        ) : (
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: progressPct }}
          />
        )}
      </div>

      {/* Mode selector row */}
      <div className="flex items-center gap-2 border-b border-emerald-900/40 px-4 py-2">
        <span className="text-[11px] text-emerald-800 shrink-0 font-medium">Mode:</span>

        <div className="flex items-center gap-1 rounded-full p-0.5 border border-emerald-900/40"
          style={{ background: "rgba(5,18,10,0.7)" }}>
          <JuzModeBtn active={audioMode === "arabic"} onClick={() => onModeChange("arabic")}
            icon={<Volume2 className="w-3 h-3" />} label="Recitation" />
          <JuzModeBtn active={audioMode === "translation"} onClick={() => onModeChange("translation")}
            disabled={!ttsEnabled} disabledTip="No voice installed"
            icon={<Mic className="w-3 h-3" />} label={langShort} />
          <JuzModeBtn active={audioMode === "both"} onClick={() => onModeChange("both")}
            disabled={!ttsEnabled} disabledTip="No voice installed"
            icon={<Layers2 className="w-3 h-3" />} label="Both" />
        </div>

        {/* Play-mode cycle button */}
        <button
          onClick={() => {
            const next: PlayMode =
              playMode === "manual" ? "continuous"
              : playMode === "continuous" ? "repeat"
              : "manual";
            onPlayModeChange(next);
          }}
          className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
            playMode === "manual"
              ? "text-emerald-700 border-emerald-900/40"
              : playMode === "continuous"
              ? "bg-emerald-900/40 text-emerald-400 border-emerald-700/30"
              : "bg-amber-900/30 text-amber-400 border-amber-700/30"
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
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Status icon */}
        <div className="shrink-0 w-5 flex justify-center">
          {isLoading || retrying
            ? <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
            : isError
            ? <WifiOff className="w-4 h-4 text-red-400" />
            : <div className={isPlaying ? "text-emerald-400" : "text-emerald-900"}>
                {audioMode === "arabic" || (audioMode === "both" && ttsPhase === "arabic")
                  ? <Volume2 className="w-4 h-4" />
                  : <Mic    className="w-4 h-4" />}
              </div>
          }
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isError ? "text-red-400" : "text-emerald-300"}`}>
            {trackLine}
          </p>
          {statusLine && (
            <p className={`text-xs mt-0.5 truncate ${
              isError ? "text-red-400/70"
              : retrying || isLoading ? "text-emerald-600 animate-pulse"
              : "text-emerald-700"
            }`}>
              {statusLine}
            </p>
          )}
        </div>

        {/* Prev / Play-Pause / Next */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onPrev}
            disabled={playingIndex === null || playingIndex <= 0}
            className="w-9 h-9 rounded-full flex items-center justify-center text-emerald-600 disabled:opacity-30 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {isError ? (
            <button
              onClick={onRetry}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-red-700/60 text-white active:scale-95 transition-transform border border-red-600/40"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-700/70 text-white active:scale-95 transition-transform border border-emerald-600/40"
            >
              {isLoading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : showPause
                ? <Pause className="w-5 h-5" />
                : <Play  className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={onNext}
            disabled={playingIndex !== null && playingIndex >= totalAyahs - 1}
            className="w-9 h-9 rounded-full flex items-center justify-center text-emerald-600 disabled:opacity-30 active:scale-95 transition-transform"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── JuzModeBtn ─────────────────────────────────────────────────────────────────
function JuzModeBtn({
  active, onClick, icon, label, disabled, disabledTip,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; disabled?: boolean; disabledTip?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledTip : undefined}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        disabled
          ? "opacity-35 cursor-not-allowed text-emerald-800"
          : active
          ? "bg-emerald-700/60 text-emerald-200 border border-emerald-600/30"
          : "text-emerald-700 hover:text-emerald-400"
      }`}
    >
      {icon}
      <span className="max-w-[5.5rem] truncate">{label}</span>
    </button>
  );
}
