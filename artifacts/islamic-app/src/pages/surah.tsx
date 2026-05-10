import { useState, useEffect, useRef, useCallback } from "react";
import { useSurah } from "@/lib/api";
import {
  ALL_LANGUAGES, TRANSLATION_LABELS, TTS_LANG_CODES,
  RTL_LANGUAGES, TranslationLanguage,
} from "@/lib/api";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight,
  Heart, Pause, Play, Volume2, Mic, Repeat, Repeat1,
  Loader2, WifiOff, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBookmarks, saveBookmark, removeBookmark } from "@/lib/bookmarks";
import { getFavAyahs, toggleAyahFav } from "@/lib/favorites";
import { getLang } from "@/lib/settings";

// ── Types ──────────────────────────────────────────────────────────────────────
type AudioMode = "arabic" | "tts";
type PlayState = "idle" | "loading" | "buffering" | "playing" | "paused" | "error";

// ── Constants ──────────────────────────────────────────────────────────────────
const AUTOPLAY_KEY  = "noor-autoplay";
const MAX_RETRIES   = 3;
const RETRY_BASE_MS = 1200;
const PRELOAD_AHEAD = 2;

// ── TTS helpers ────────────────────────────────────────────────────────────────
function isTTSSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Pick the best available voice for a BCP-47 lang code.
 *  Sindhi (sd-PK) is almost never installed → fall back to Urdu voice (same script). */
function findTTSVoice(langCode: string): SpeechSynthesisVoice | null {
  if (!isTTSSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefix = langCode.split("-")[0];
  return (
    voices.find((v) => v.lang === langCode) ??
    voices.find((v) => v.lang.startsWith(prefix)) ??
    // Sindhi shares Arabic script with Urdu — use Urdu voice as fallback
    (prefix === "sd" ? (voices.find((v) => v.lang.startsWith("ur")) ?? null) : null)
  );
}

/** Chrome has a bug where speechSynthesis silently stops after ~14s.
 *  Ping it every 10s to keep it alive. */
function startTTSWatchdog(): ReturnType<typeof setInterval> {
  return setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10_000);
}

/** Touch an audio URL so the browser fetches and caches it silently. */
function preloadAudioUrl(url: string) {
  try {
    const a = new Audio();
    a.preload = "auto";
    a.volume  = 0;
    a.src     = url;
    a.load();
  } catch {
    // Silently ignore — preload is best-effort
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export function SurahReader() {
  const params = useParams();
  const number = Number(params.number);

  const [language, setLanguage]   = useState<TranslationLanguage>(() => getLang());
  const { data: surah, isLoading } = useSurah(number, language);

  // Bookmarks / Favorites
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(new Set());
  const [favSet, setFavSet]               = useState<Set<string>>(new Set());
  const [favPopped, setFavPopped]         = useState<string | null>(null);

  // ── Audio state ────────────────────────────────────────────────────────────
  const [playState, setPlayState]     = useState<PlayState>("idle");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [audioMode, setAudioMode]     = useState<AudioMode>("arabic");
  const [autoPlay, _setAutoPlay]      = useState<boolean>(
    () => localStorage.getItem(AUTOPLAY_KEY) !== "false"
  );
  const [progress, setProgress]       = useState(0);
  const [retrying, setRetrying]       = useState(false);

  // Persist autoplay
  const setAutoPlay = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    _setAutoPlay((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      localStorage.setItem(AUTOPLAY_KEY, String(next));
      return next;
    });
  }, []);

  // ── Mutable refs (safe to read in event callbacks) ─────────────────────────
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const watchdogRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef    = useRef(0);
  const retryTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingIndexRef  = useRef<number | null>(null);
  const autoPlayRef      = useRef(autoPlay);
  const surahRef         = useRef(surah);
  const languageRef      = useRef(language);
  const audioModeRef     = useRef(audioMode);
  const ayahRefs         = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => { playingIndexRef.current = playingIndex; }, [playingIndex]);
  useEffect(() => { autoPlayRef.current     = autoPlay;     }, [autoPlay]);
  useEffect(() => { surahRef.current        = surah;        }, [surah]);
  useEffect(() => { languageRef.current     = language;     }, [language]);
  useEffect(() => { audioModeRef.current    = audioMode;    }, [audioMode]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const scrollToAyah = useCallback((index: number) => {
    ayahRefs.current.get(index)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) { clearInterval(watchdogRef.current); watchdogRef.current = null; }
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
  }, []);

  // ── stopAll — completely halt everything ───────────────────────────────────
  const stopAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current     = null;
    }
    clearRetryTimer();
    retryCountRef.current = 0;
    if (isTTSSupported()) window.speechSynthesis.cancel();
    clearWatchdog();
    setPlayState("idle");
    setProgress(0);
    setRetrying(false);
  }, [clearWatchdog, clearRetryTimer]);

  // Global cleanup when surah number changes or component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      if (isTTSSupported()) window.speechSynthesis.cancel();
      clearWatchdog();
      clearRetryTimer();
    };
  }, [number, clearWatchdog, clearRetryTimer]);

  // ── Arabic CDN audio engine ────────────────────────────────────────────────
  // Forward-declare so it can reference itself in retry & ended callbacks
  const playArabicRef = useRef<(index: number, isRetry?: boolean) => void>(() => {});

  const playArabic = useCallback((index: number, isRetry = false) => {
    const cur = surahRef.current;
    if (!cur) return;
    const ayah = cur.ayahs[index];
    if (!ayah) return;

    if (!isRetry) {
      retryCountRef.current = 0;
      clearRetryTimer();
    }

    // Tear down previous
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (isTTSSupported()) window.speechSynthesis.cancel();
    clearWatchdog();

    const audio = new Audio();
    audio.preload = "auto";
    audio.src     = ayah.audioUrl;
    audioRef.current = audio;

    setPlayingIndex(index);
    playingIndexRef.current = index;
    setPlayState("loading");
    setProgress(0);
    setRetrying(isRetry);

    // ── Event handlers ───────────────────────────────────────────────────────
    const onTimeUpdate = () => {
      if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
    };

    const onWaiting  = () => setPlayState("buffering");
    const onPlaying  = () => { setPlayState("playing"); setRetrying(false); };
    const onCanPlay  = () =>
      setPlayState((s) => (s === "loading" || s === "buffering" ? "playing" : s));

    const onEnded = () => {
      setProgress(1);
      const snapshot = surahRef.current;
      if (!snapshot) { setPlayState("idle"); return; }
      const next = (playingIndexRef.current ?? index) + 1;
      if (autoPlayRef.current && next < snapshot.ayahs.length) {
        scrollToAyah(next);
        playArabicRef.current(next);
      } else {
        setPlayState("idle");
        setPlayingIndex(null);
        playingIndexRef.current = null;
        setProgress(0);
      }
    };

    const onError = () => {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        setPlayState("buffering");
        setRetrying(true);
        retryTimerRef.current = setTimeout(
          () => playArabicRef.current(index, true),
          RETRY_BASE_MS * retryCountRef.current,
        );
      } else {
        retryCountRef.current = 0;
        setPlayState("error");
        setRetrying(false);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("waiting",    onWaiting);
    audio.addEventListener("playing",    onPlaying);
    audio.addEventListener("canplay",    onCanPlay);
    audio.addEventListener("ended",      onEnded);
    audio.addEventListener("error",      onError);

    audio.load();
    audio.play().catch(() => setPlayState("paused"));

    scrollToAyah(index);

    // Preload next N ayahs into browser cache
    for (let i = 1; i <= PRELOAD_AHEAD; i++) {
      const next = cur.ayahs[index + i];
      if (next) preloadAudioUrl(next.audioUrl);
    }
  }, [scrollToAyah, clearWatchdog, clearRetryTimer]);

  // Keep the forward-ref current
  useEffect(() => { playArabicRef.current = playArabic; }, [playArabic]);

  // ── TTS engine ─────────────────────────────────────────────────────────────
  // Same forward-declare pattern for self-referencing auto-advance
  const speakRef = useRef<(index: number) => void>(() => {});

  const speakTranslation = useCallback((index: number) => {
    if (!isTTSSupported()) return;
    const cur = surahRef.current;
    if (!cur) return;
    const ayah = cur.ayahs[index];
    if (!ayah?.textTranslation) {
      // Skip empty translation — auto-advance if enabled
      const next = index + 1;
      if (autoPlayRef.current && next < cur.ayahs.length) speakRef.current(next);
      return;
    }

    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    window.speechSynthesis.cancel();
    clearWatchdog();

    const langCode = TTS_LANG_CODES[languageRef.current] ?? "en-US";
    const voice    = findTTSVoice(langCode);

    const utter    = new SpeechSynthesisUtterance(ayah.textTranslation);
    if (voice) utter.voice = voice;
    utter.lang   = voice?.lang ?? langCode;
    utter.rate   = 0.88;
    utter.pitch  = 1;
    utter.volume = 1;

    setPlayingIndex(index);
    playingIndexRef.current = index;
    setPlayState("loading");
    setProgress(0);

    utter.onstart = () => {
      setPlayState("playing");
      watchdogRef.current = startTTSWatchdog();
    };

    utter.onend = () => {
      clearWatchdog();
      const snapshot = surahRef.current;
      if (!snapshot) { setPlayState("idle"); return; }
      const next = (playingIndexRef.current ?? index) + 1;
      if (autoPlayRef.current && next < snapshot.ayahs.length) {
        scrollToAyah(next);
        speakRef.current(next);
      } else {
        setPlayState("idle");
        setPlayingIndex(null);
        playingIndexRef.current = null;
        setProgress(0);
      }
    };

    utter.onerror = (e) => {
      // "interrupted" / "canceled" are normal on cancel — not real errors
      if (e.error === "interrupted" || e.error === "canceled") return;
      clearWatchdog();
      setPlayState("error");
    };

    window.speechSynthesis.speak(utter);
    scrollToAyah(index);
  }, [scrollToAyah, clearWatchdog]);

  useEffect(() => { speakRef.current = speakTranslation; }, [speakTranslation]);

  // ── Unified dispatcher ─────────────────────────────────────────────────────
  const playAyah = useCallback((index: number, modeOverride?: AudioMode) => {
    const mode = modeOverride ?? audioModeRef.current;
    if (mode === "arabic") playArabic(index);
    else speakTranslation(index);
  }, [playArabic, speakTranslation]);

  // ── Controls ────────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    const mode = audioModeRef.current;

    if (mode === "arabic") {
      if (!audioRef.current || playState === "idle" || playState === "error") {
        // Start fresh from beginning or last known position
        playArabic(playingIndexRef.current ?? 0);
        return;
      }
      if (playState === "playing" || playState === "buffering") {
        audioRef.current.pause();
        setPlayState("paused");
      } else if (playState === "paused") {
        audioRef.current.play().catch(() => {});
        setPlayState("playing");
      }
      return;
    }

    // TTS mode
    if (!isTTSSupported()) return;
    if (playState === "playing") {
      window.speechSynthesis.pause();
      clearWatchdog();
      setPlayState("paused");
    } else if (playState === "paused") {
      window.speechSynthesis.resume();
      watchdogRef.current = startTTSWatchdog();
      setPlayState("playing");
    } else {
      speakTranslation(playingIndexRef.current ?? 0);
    }
  }, [playState, playArabic, speakTranslation, clearWatchdog]);

  const handlePrev = useCallback(() => {
    const idx = playingIndexRef.current;
    if (idx === null || idx <= 0) return;
    playAyah(idx - 1);
  }, [playAyah]);

  const handleNext = useCallback(() => {
    const cur = surahRef.current;
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
    if (audioModeRef.current === "tts") stopAll();
    setLanguage(lang);
  }, [stopAll]);

  const handleRetry = useCallback(() => {
    const idx = playingIndexRef.current;
    if (idx === null) { playAyah(0); return; }
    retryCountRef.current = 0;
    playAyah(idx);
  }, [playAyah]);

  // ── Bookmarks & Favorites ──────────────────────────────────────────────────
  useEffect(() => {
    const stored = getBookmarks();
    setBookmarkedSet(new Set(stored.map((b) => `${b.surahNumber}-${b.ayahNumber}`)));
    const favs = getFavAyahs();
    setFavSet(new Set(
      favs.filter((a) => a.surahNumber === number)
          .map((a) => `${a.surahNumber}-${a.ayahNumber}`)
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
  const isRtl          = RTL_LANGUAGES.has(language);
  const ttsSupported   = isTTSSupported();
  const langShort      = TRANSLATION_LABELS[language] ?? language;
  const isActivePlaying = playState === "playing" || playState === "buffering";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0 pb-44 md:pb-8 animate-in fade-in duration-500 max-w-4xl mx-auto">

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md -mx-4 px-4 pt-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-3 mb-3">
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
                    else ayahRefs.current.delete(index);
                  }}
                  className={`group flex flex-col gap-5 py-8 px-2 border-b border-border/40 last:border-0 transition-all duration-300 rounded-xl ${
                    isCurrent
                      ? "bg-primary/5 border-primary/20 -mx-2 px-4"
                      : "hover:bg-muted/30"
                  }`}
                  data-testid={`ayah-${ayah.numberInSurah}`}
                >
                  {/* Controls row */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isCurrent && isActivePlaying
                          ? "bg-primary text-primary-foreground scale-110"
                          : isCurrent
                          ? "bg-primary/20 text-primary"
                          : "border-2 border-primary/20 text-primary"
                      }`}
                    >
                      {isCurrent && (playState === "loading" || playState === "buffering") ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        ayah.numberInSurah
                      )}
                    </div>

                    {/* Waveform bars — only on current playing ayah */}
                    {isCurrent && isActivePlaying && (
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

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity ml-auto">
                      <Button
                        variant="ghost" size="icon"
                        className={`w-8 h-8 ${isCurrent && isActivePlaying ? "text-primary" : "text-muted-foreground"}`}
                        onClick={() => isCurrent ? handlePlayPause() : playAyah(index)}
                        data-testid={`button-play-ayah-${ayah.numberInSurah}`}
                      >
                        {isCurrent && isActivePlaying
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
                        <Heart
                          className={`w-4 h-4 transition-transform ${
                            favPopped === key ? "scale-150" : "scale-100"
                          } ${favSet.has(key) ? "fill-rose-500" : ""}`}
                        />
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

                  {/* Translation text */}
                  {ayah.textTranslation ? (
                    <p
                      dir={isRtl ? "rtl" : "ltr"}
                      className={`text-lg md:text-xl leading-relaxed text-muted-foreground font-serif transition-colors duration-300 ${
                        isRtl ? "text-right" : "text-left"
                      } ${isCurrent ? "text-foreground/80" : ""}`}
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
          playingIndex={playingIndex}
          surahName={surah.englishName}
          totalAyahs={surah.ayahs.length}
          progress={progress}
          autoPlay={autoPlay}
          langShort={langShort}
          ttsSupported={ttsSupported}
          retrying={retrying}
          onPlayPause={handlePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
          onModeChange={handleModeChange}
          onAutoPlayToggle={() => setAutoPlay((p) => !p)}
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
  playingIndex:      number | null;
  surahName:         string;
  totalAyahs:        number;
  progress:          number;
  autoPlay:          boolean;
  langShort:         string;
  ttsSupported:      boolean;
  retrying:          boolean;
  onPlayPause:       () => void;
  onPrev:            () => void;
  onNext:            () => void;
  onModeChange:      (m: AudioMode) => void;
  onAutoPlayToggle:  () => void;
  onRetry:           () => void;
}

function AudioPlayer({
  playState, audioMode, playingIndex, surahName, totalAyahs,
  progress, autoPlay, langShort, ttsSupported, retrying,
  onPlayPause, onPrev, onNext, onModeChange, onAutoPlayToggle, onRetry,
}: AudioPlayerProps) {
  const isActivePlaying  = playState === "playing" || playState === "buffering";
  const isLoadingState   = playState === "loading"  || playState === "buffering";
  const showPlayIcon     = !isActivePlaying;
  const progressPct      = `${(progress * 100).toFixed(1)}%`;

  // ── Verse label ────────────────────────────────────────────────────────────
  const verseLabel = playingIndex !== null
    ? `${surahName} · Verse ${playingIndex + 1} of ${totalAyahs}`
    : audioMode === "arabic"
    ? "Arabic recitation by Al-Afasy"
    : `${langShort} translation (TTS)`;

  const subLabel = retrying
    ? "Reconnecting…"
    : isLoadingState
    ? "Buffering…"
    : playState === "error"
    ? "Failed to load — tap to retry"
    : playState === "paused"
    ? "Paused"
    : playState === "playing"
    ? audioMode === "arabic" ? "Al-Afasy CDN · 128kbps" : `${langShort} TTS voice`
    : "";

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md shadow-2xl">

      {/* Progress bar */}
      <div className="h-1 bg-muted relative overflow-hidden">
        {isLoadingState || retrying ? (
          // Indeterminate shimmer
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

      {/* Mode selector + AutoPlay toggle */}
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2">
        <span className="text-xs text-muted-foreground shrink-0">Audio:</span>

        <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
          <AudioModeBtn
            active={audioMode === "arabic"}
            onClick={() => onModeChange("arabic")}
            testId="button-audio-mode-arabic"
            icon={<Volume2 className="w-3 h-3" />}
            label="Arabic"
          />
          <AudioModeBtn
            active={audioMode === "tts"}
            onClick={() => onModeChange("tts")}
            testId="button-audio-mode-tts"
            disabled={!ttsSupported}
            icon={<Mic className="w-3 h-3" />}
            label={langShort}
          />
        </div>

        {audioMode === "tts" && !ttsSupported && (
          <span className="text-xs text-destructive">TTS not available</span>
        )}

        {/* AutoPlay toggle — right side */}
        <button
          onClick={onAutoPlayToggle}
          className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
            autoPlay
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-transparent text-muted-foreground border-border/40 hover:text-foreground"
          }`}
          data-testid="button-audio-autoplay"
          title={autoPlay ? "Auto-play ON — click to turn off" : "Auto-play OFF — click to turn on"}
        >
          {autoPlay
            ? <Repeat1 className="w-3 h-3" />
            : <Repeat  className="w-3 h-3" />}
          <span className="hidden sm:inline">{autoPlay ? "Auto" : "Manual"}</span>
        </button>
      </div>

      {/* Main controls row */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">

        {/* Mode icon / loading indicator */}
        <div className="shrink-0">
          {isLoadingState || retrying ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : playState === "error" ? (
            <WifiOff className="w-4 h-4 text-destructive" />
          ) : (
            <div className={`text-primary ${isActivePlaying ? "" : "opacity-50"}`}>
              {audioMode === "arabic"
                ? <Volume2 className="w-4 h-4" />
                : <Mic    className="w-4 h-4" />}
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate transition-colors ${
            playState === "error" ? "text-destructive" : "text-foreground"
          }`}>
            {verseLabel}
          </p>
          {subLabel && (
            <p className={`text-xs mt-0.5 truncate ${
              playState === "error"
                ? "text-destructive/70"
                : retrying || isLoadingState
                ? "text-primary/70 animate-pulse"
                : "text-muted-foreground"
            }`}>
              {subLabel}
            </p>
          )}
        </div>

        {/* Playback controls */}
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

          {playState === "error" ? (
            <Button
              variant="default" size="icon"
              onClick={onRetry}
              data-testid="button-audio-retry"
              className="w-10 h-10 rounded-full bg-destructive hover:bg-destructive/90"
              title="Retry"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="default" size="icon"
              onClick={onPlayPause}
              data-testid="button-audio-play-pause"
              className="w-10 h-10 rounded-full relative overflow-hidden"
            >
              {isLoadingState ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : showPlayIcon ? (
                <Play  className="w-5 h-5" />
              ) : (
                <Pause className="w-5 h-5" />
              )}
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

// ── AudioModeBtn ───────────────────────────────────────────────────────────────
function AudioModeBtn({
  active, onClick, icon, label, testId, disabled,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; testId?: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        disabled
          ? "opacity-40 cursor-not-allowed text-muted-foreground"
          : active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span className="max-w-[5rem] truncate">{label}</span>
    </button>
  );
}
