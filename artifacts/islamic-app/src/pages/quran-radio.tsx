import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Play, Pause, Volume2, Radio, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface Station {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  url: string;
  website: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

const STATIONS: Station[] = [
  {
    id: "alquran_1",
    name: "Holy Quran Radio",
    nameAr: "إذاعة القرآن الكريم",
    description: "Egyptian Radio Quran channel — continuous recitation 24/7",
    url: "https://stream.radiojar.com/0tpy1h0kxtzuv",
    website: "https://radiojar.com",
    emoji: "🎙️",
    color: "text-emerald-300", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)",
  },
  {
    id: "makkah_radio",
    name: "Makkah Live Recitation",
    nameAr: "بث مكة المكرمة",
    description: "Live audio from Masjid Al-Haram, Makkah",
    url: "https://n01.radiojar.com/8s5u5tpdtwkuv?rj-ttl=5&rj-tok=AAABi3chTbMAjgxEBuEY_Qkq4Q",
    website: "https://www.youtube.com/watch?v=XiA_JKPBFGA",
    emoji: "🕋",
    color: "text-amber-300", bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.35)",
  },
  {
    id: "mishary",
    name: "Mishary Alafasy",
    nameAr: "قناة مشاري العفاسي",
    description: "Beautiful recitation by Sheikh Mishary Rashid Al-Afasy",
    url: "https://stream.radioways.com/MakkahTV/live/chunklist.m3u8",
    website: "https://www.youtube.com/@MisharyAlafasyOfficial",
    emoji: "🎵",
    color: "text-purple-300", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.35)",
  },
  {
    id: "radio_quran",
    name: "Radio Quran Kareem",
    nameAr: "راديو القرآن الكريم",
    description: "Continuous recitation of the Holy Quran from Saudi Arabia",
    url: "https://n06.radiojar.com/saudi-quran?rj-ttl=5",
    website: "https://quran.gov.sa",
    emoji: "🌙",
    color: "text-sky-300", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.35)",
  },
  {
    id: "islamic_nasheeds",
    name: "Islamic Nasheeds",
    nameAr: "أناشيد إسلامية",
    description: "Beautiful Islamic nasheeds — spiritual songs without music",
    url: "https://n01.radiojar.com/nasheeds.mp3",
    website: "https://www.youtube.com/results?search_query=islamic+nasheeds",
    emoji: "🎶",
    color: "text-pink-300", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.35)",
  },
];

type PlayState = "idle" | "loading" | "playing" | "error";

export function QuranRadio() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  function playStation(station: Station) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === station.id) {
      setPlayingId(null);
      setPlayState("idle");
      return;
    }

    setPlayingId(station.id);
    setPlayState("loading");

    const audio = new Audio(station.url);
    audioRef.current = audio;

    audio.addEventListener("canplay", () => {
      setPlayState("playing");
      audio.play().catch(() => {
        setPlayState("error");
        setPlayingId(null);
      });
    });

    audio.addEventListener("error", () => {
      setPlayState("error");
      setTimeout(() => {
        if (playingId === station.id) {
          setPlayingId(null);
          setPlayState("idle");
        }
      }, 3000);
    });

    audio.load();
  }

  function stopAll() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
    setPlayState("idle");
  }

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Quran Radio</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Islamic audio streams — live recitation & nasheeds</p>
        </div>
        <Radio className="w-6 h-6 text-emerald-700" />
      </div>

      {/* Now playing banner */}
      {playingId && (
        <div className="mx-4 mb-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-emerald-700/40 px-4 py-3 flex items-center gap-3"
            style={{ background: "rgba(52,211,153,0.1)" }}>
            {playState === "loading"
              ? <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
              : playState === "error"
              ? <span className="text-base shrink-0">⚠️</span>
              : (
                <div className="flex gap-0.5 items-end shrink-0">
                  {[3,5,7,4,6].map((h, i) => (
                    <div key={i} className="w-1 rounded-full bg-emerald-400 animate-pulse"
                      style={{ height: h * 3, animationDelay: `${i * 120}ms` }} />
                  ))}
                </div>
              )
            }
            <div className="flex-1 min-w-0">
              <p className="text-emerald-300 text-sm font-semibold truncate">
                {playState === "loading" ? "Connecting…"
                  : playState === "error" ? "Stream unavailable — try YouTube link"
                  : `Now Playing: ${STATIONS.find(s => s.id === playingId)?.name}`}
              </p>
              {playState === "playing" && (
                <p className="text-emerald-700 text-xs mt-0.5">Tap station again to stop</p>
              )}
            </div>
            <button onClick={stopAll} className="shrink-0 text-emerald-700 hover:text-emerald-400 text-xs font-medium transition-colors">
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mx-4 mb-4 flex items-start gap-2.5 px-4 py-3 rounded-2xl border border-emerald-900/40"
        style={{ background: "rgba(52,211,153,0.04)" }}>
        <Volume2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-emerald-800 text-xs leading-relaxed">
          Live streams require internet. If a stream fails, use the YouTube link to watch online. Turn up your volume for the best experience.
        </p>
      </div>

      <div className="px-4 space-y-3">
        {STATIONS.map((station) => {
          const isPlaying = playingId === station.id;
          const isLoading = isPlaying && playState === "loading";
          const isError   = isPlaying && playState === "error";

          return (
            <div
              key={station.id}
              className="rounded-3xl border overflow-hidden transition-all"
              style={{
                background: isPlaying ? station.bg : "rgba(255,255,255,0.04)",
                borderColor: isPlaying ? station.border.replace("0.35", "0.6") : "rgba(26,92,56,0.25)",
              }}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Emoji icon */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: station.bg, border: `1.5px solid ${station.border}` }}>
                  {station.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-base ${station.color}`}>{station.name}</p>
                  <p className="text-emerald-800 text-xs" dir="rtl">{station.nameAr}</p>
                  <p className="text-emerald-700 text-xs mt-0.5 truncate">{station.description}</p>
                  {isError && <p className="text-red-400 text-xs mt-1">⚠️ Stream failed — tap YouTube link</p>}
                </div>

                {/* Play button */}
                <button
                  onClick={() => playStation(station)}
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95"
                  style={{ background: station.bg, border: `1.5px solid ${station.border}` }}
                  aria-label={isPlaying ? "Stop" : "Play"}
                >
                  {isLoading
                    ? <Loader2 className={`w-5 h-5 animate-spin ${station.color}`} />
                    : isPlaying && playState === "playing"
                    ? <Pause className={`w-5 h-5 ${station.color}`} />
                    : <Play className={`w-5 h-5 ml-0.5 ${station.color}`} />}
                </button>
              </div>

              {/* YouTube fallback link */}
              <a
                href={station.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 pb-3 text-xs transition-opacity hover:opacity-80"
                style={{ color: station.color.replace("text-", "").includes("emerald") ? "#34d39980" : undefined, opacity: 0.6 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                Open on YouTube / Website
              </a>
            </div>
          );
        })}
      </div>

      <p className="text-center text-emerald-900 text-xs mt-6 px-6 pb-4 leading-relaxed">
        Streams may vary by region. Use the YouTube links for guaranteed access.
      </p>
    </div>
  );
}
