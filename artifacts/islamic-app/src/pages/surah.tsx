import { useState, useEffect, useRef, useCallback } from "react";
import { useSurah } from "@/lib/api";
import {
  ALL_LANGUAGES, TRANSLATION_LABELS, TTS_LANG_CODES, RTL_LANGUAGES, TranslationLanguage,
} from "@/lib/api";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight,
  Heart, Pause, Play, Volume2, Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBookmarks, saveBookmark, removeBookmark } from "@/lib/bookmarks";
import { getFavAyahs, toggleAyahFav } from "@/lib/favorites";
import { getLang } from "@/lib/settings";

type AudioMode = "arabic" | "tts";

function isTTSSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function SurahReader() {
  const params = useParams();
  const number = Number(params.number);

  const [language, setLanguage] = useState<TranslationLanguage>(() => getLang());
  const { data: surah, isLoading } = useSurah(number, language);

  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(new Set());
  const [favSet, setFavSet]               = useState<Set<string>>(new Set());
  const [favPopped, setFavPopped]         = useState<string | null>(null);
  const [playingIndex, setPlayingIndex]   = useState<number | null>(null);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioMode, setAudioMode]         = useState<AudioMode>("arabic");

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const ayahRefs    = useRef<Map<number, HTMLDivElement>>(new Map());
  const surahRef    = useRef(surah);
  const languageRef = useRef(language);
  useEffect(() => { surahRef.current    = surah;    }, [surah]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // ── Bookmarks / Favorites ─────────────────────────────────────────────────
  useEffect(() => {
    const stored = getBookmarks();
    setBookmarkedSet(new Set(stored.map((b) => `${b.surahNumber}-${b.ayahNumber}`)));
    const favs = getFavAyahs();
    setFavSet(new Set(
      favs.filter((a) => a.surahNumber === number)
          .map((a) => `${a.surahNumber}-${a.ayahNumber}`)
    ));
  }, [number]);

  // ── Scroll helper ─────────────────────────────────────────────────────────
  const scrollToAyah = useCallback((index: number) => {
    ayahRefs.current.get(index)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // ── Stop all audio ────────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (isTTSSupported()) window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsAudioLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      if (isTTSSupported()) window.speechSynthesis.cancel();
    };
  }, [number]);

  // ── Arabic CDN playback ───────────────────────────────────────────────────
  const playArabic = useCallback((index: number) => {
    const s = surahRef.current;
    if (!s) return;
    const ayah = s.ayahs[index];
    if (!ayah) return;

    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (isTTSSupported()) window.speechSynthesis.cancel();

    const audio = new Audio(ayah.audioUrl);
    audioRef.current = audio;
    setPlayingIndex(index);
    setIsPlaying(true);
    setIsAudioLoading(true);

    audio.addEventListener("canplaythrough", () => setIsAudioLoading(false));
    audio.addEventListener("ended", () => {
      const cur = surahRef.current;
      if (!cur) return;
      const next = index + 1;
      if (next < cur.ayahs.length) { scrollToAyah(next); playArabic(next); }
      else { setIsPlaying(false); setPlayingIndex(null); }
    });
    audio.addEventListener("error", () => { setIsPlaying(false); setIsAudioLoading(false); });
    audio.play().catch(() => { setIsPlaying(false); setIsAudioLoading(false); });
    scrollToAyah(index);
  }, [scrollToAyah]);

  // ── TTS playback ──────────────────────────────────────────────────────────
  const speakTranslation = useCallback((index: number) => {
    if (!isTTSSupported()) return;
    const s = surahRef.current;
    if (!s) return;
    const ayah = s.ayahs[index];
    if (!ayah?.textTranslation) return;

    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(ayah.textTranslation);
    utter.lang   = TTS_LANG_CODES[languageRef.current] ?? "en-US";
    utter.rate   = 0.88;
    utter.pitch  = 1;
    utter.volume = 1;

    setPlayingIndex(index);
    setIsPlaying(true);
    setIsAudioLoading(false);

    utter.onend = () => {
      const cur = surahRef.current;
      if (!cur) return;
      const next = index + 1;
      if (next < cur.ayahs.length) { scrollToAyah(next); speakTranslation(next); }
      else { setIsPlaying(false); setPlayingIndex(null); }
    };
    utter.onerror = () => { setIsPlaying(false); setPlayingIndex(null); };

    window.speechSynthesis.speak(utter);
    scrollToAyah(index);
  }, [scrollToAyah]);

  // ── Unified play dispatcher ───────────────────────────────────────────────
  const playAyah = useCallback((index: number, modeOverride?: AudioMode) => {
    const mode = modeOverride ?? audioMode;
    if (mode === "arabic") playArabic(index);
    else speakTranslation(index);
  }, [audioMode, playArabic, speakTranslation]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (audioMode === "arabic") {
      if (!audioRef.current) { playArabic(0); return; }
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play().catch(() => {}); setIsPlaying(true); }
    } else {
      if (!isTTSSupported()) return;
      if (!isPlaying) speakTranslation(playingIndex ?? 0);
      else { window.speechSynthesis.cancel(); setIsPlaying(false); }
    }
  }, [audioMode, isPlaying, playingIndex, playArabic, speakTranslation]);

  const handlePrev = useCallback(() => {
    if (playingIndex === null || playingIndex <= 0) return;
    playAyah(playingIndex - 1);
  }, [playingIndex, playAyah]);

  const handleNext = useCallback(() => {
    if (!surah) return;
    const next = playingIndex === null ? 0 : playingIndex + 1;
    if (next < surah.ayahs.length) playAyah(next);
  }, [playingIndex, surah, playAyah]);

  const handleModeChange = (mode: AudioMode) => {
    stopAll(); setPlayingIndex(null); setAudioMode(mode);
  };

  const handleLanguageChange = (lang: TranslationLanguage) => {
    if (audioMode === "tts") stopAll();
    setLanguage(lang);
  };

  // ── Bookmarks & Favorites ─────────────────────────────────────────────────
  const toggleBookmark = (ayahIndex: number) => {
    if (!surah) return;
    const ayah = surah.ayahs[ayahIndex];
    const key  = `${number}-${ayah.numberInSurah}`;
    if (bookmarkedSet.has(key)) {
      removeBookmark(number, ayah.numberInSurah);
      setBookmarkedSet((p) => { const n = new Set(p); n.delete(key); return n; });
    } else {
      saveBookmark({
        surahNumber: number, surahName: surah.name, surahEnglishName: surah.englishName,
        ayahNumber: ayah.numberInSurah, globalNumber: ayah.globalNumber,
        textAr: ayah.textAr, textTranslation: ayah.textTranslation, savedAt: Date.now(),
      });
      setBookmarkedSet((p) => new Set(p).add(key));
    }
  };

  const toggleFavorite = (ayahIndex: number) => {
    if (!surah) return;
    const ayah = surah.ayahs[ayahIndex];
    const key  = `${number}-${ayah.numberInSurah}`;
    const added = toggleAyahFav({
      surahNumber: number, surahEnglishName: surah.englishName, surahName: surah.name,
      ayahNumber: ayah.numberInSurah, globalNumber: ayah.globalNumber,
      textAr: ayah.textAr, textTranslation: ayah.textTranslation,
    });
    setFavSet((p) => { const n = new Set(p); added ? n.add(key) : n.delete(key); return n; });
    if (added) { setFavPopped(key); setTimeout(() => setFavPopped(null), 800); }
  };

  const isRtl      = RTL_LANGUAGES.has(language);
  const ttsSupported = isTTSSupported();

  // Label shown in the audio bar for current lang
  const langShort = TRANSLATION_LABELS[language] ?? language;

  return (
    <div className="space-y-0 pb-44 md:pb-8 animate-in fade-in duration-500 max-w-4xl mx-auto">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md -mx-4 px-4 pt-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground px-2 shrink-0">
            <Link href="/quran" data-testid="link-back-quran">
              <ArrowLeft className="w-4 h-4 mr-1" />Back
            </Link>
          </Button>

          {/* Scrollable language pills */}
          <div
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1"
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

      {/* ── Bismillah ── */}
      {number !== 1 && number !== 9 && !isLoading && (
        <div className="text-center py-10 border-b border-border/50">
          <p dir="rtl" className="text-4xl md:text-5xl font-arabic text-primary leading-loose">
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
        </div>
      )}

      {/* ── Ayah list ── */}
      <div className="space-y-0 mt-6">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-8 border-b border-border/40 space-y-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-6 w-4/5 ml-auto" />
              </div>
            ))
          : surah?.ayahs.map((ayah, index) => {
              const key = `${number}-${ayah.numberInSurah}`;
              const bm  = bookmarkedSet.has(key);
              const isCurrent = playingIndex === index;

              return (
                <div
                  key={ayah.numberInSurah}
                  ref={(el) => { if (el) ayahRefs.current.set(index, el); else ayahRefs.current.delete(index); }}
                  className={`group flex flex-col gap-5 py-8 px-2 border-b border-border/40 last:border-0 transition-all duration-300 rounded-xl ${
                    isCurrent ? "bg-primary/5 border-primary/20 -mx-2 px-4" : "hover:bg-muted/30"
                  }`}
                  data-testid={`ayah-${ayah.numberInSurah}`}
                >
                  {/* Controls row */}
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isCurrent ? "bg-primary text-primary-foreground" : "border-2 border-primary/20 text-primary"
                    }`}>
                      {ayah.numberInSurah}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon"
                        className={`w-8 h-8 ${isCurrent && isPlaying ? "text-primary" : "text-muted-foreground"}`}
                        onClick={() => isCurrent ? handlePlayPause() : playAyah(index)}
                        data-testid={`button-play-ayah-${ayah.numberInSurah}`}
                      >
                        {isCurrent && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>

                      <Button
                        variant="ghost" size="icon"
                        className={`w-8 h-8 transition-all ${favSet.has(key) ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"}`}
                        onClick={() => toggleFavorite(index)}
                        data-testid={`button-fav-ayah-${ayah.numberInSurah}`}
                      >
                        <Heart className={`w-4 h-4 transition-transform ${favPopped === key ? "scale-150" : "scale-100"} ${favSet.has(key) ? "fill-rose-500" : ""}`} />
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

                  {/* Arabic text — always shown */}
                  <p dir="rtl" className="text-3xl md:text-4xl font-arabic leading-[2.2] text-foreground text-right">
                    {ayah.textAr}
                  </p>

                  {/* Translation text */}
                  {ayah.textTranslation ? (
                    <p
                      dir={isRtl ? "rtl" : "ltr"}
                      className={`text-lg md:text-xl leading-relaxed text-muted-foreground font-serif ${isRtl ? "text-right" : "text-left"}`}
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

      {/* ── Sticky audio player ── */}
      {surah && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md shadow-xl">
          {/* Audio mode bar */}
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2">
            <span className="text-xs text-muted-foreground shrink-0">Audio:</span>
            <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
              <AudioModeBtn
                active={audioMode === "arabic"}
                onClick={() => handleModeChange("arabic")}
                testId="button-audio-mode-arabic"
                icon={<Volume2 className="w-3 h-3" />}
                label="Arabic"
              />
              <AudioModeBtn
                active={audioMode === "tts"}
                onClick={() => handleModeChange("tts")}
                testId="button-audio-mode-tts"
                disabled={!ttsSupported}
                icon={<Mic className="w-3 h-3" />}
                label={langShort}
              />
            </div>
            {audioMode === "tts" && ttsSupported && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Reads translation aloud
              </span>
            )}
            {audioMode === "tts" && !ttsSupported && (
              <span className="text-xs text-destructive">TTS not supported</span>
            )}
          </div>

          {/* Playback controls */}
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-1 text-primary shrink-0">
              {audioMode === "arabic" ? <Volume2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0">
              {playingIndex !== null ? (
                <p className="text-sm font-medium text-foreground truncate">
                  {surah.englishName} · Verse {surah.ayahs[playingIndex]?.numberInSurah}
                  {audioMode === "tts" && <span className="text-muted-foreground text-xs ml-1">(TTS)</span>}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {audioMode === "arabic"
                    ? "Arabic recitation by Al-Afasy"
                    : `${langShort} translation voice`}
                </p>
              )}
              {isAudioLoading && (
                <p className="text-xs text-muted-foreground animate-pulse">Loading audio…</p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrev}
                disabled={playingIndex === null || playingIndex <= 0}
                data-testid="button-audio-prev" className="w-9 h-9">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="default" size="icon" onClick={handlePlayPause}
                data-testid="button-audio-play-pause" className="w-10 h-10 rounded-full">
                {isPlaying && !isAudioLoading ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNext}
                disabled={!surah || playingIndex === surah.ayahs.length - 1}
                data-testid="button-audio-next" className="w-9 h-9">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AudioModeBtn ──────────────────────────────────────────────────────────────
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
