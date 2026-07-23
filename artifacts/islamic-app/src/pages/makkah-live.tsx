import { useState } from "react";
import { ChevronLeft, Tv, ExternalLink, Play, Wifi } from "lucide-react";
import { Link } from "wouter";

interface Stream {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  youtubeId: string;
  color: string;
  bg: string;
  emoji: string;
  directUrl: string;
}

const STREAMS: Stream[] = [
  {
    id: "makkah",
    name: "Makkah Al-Mukarramah",
    nameAr: "مكة المكرمة",
    description: "Live 24/7 from Masjid Al-Haram, Makkah",
    youtubeId: "XiA_JKPBFGA",
     color: "text-primary",
     bg: "bg-primary/10",
    emoji: "🕋",
    directUrl: "https://www.youtube.com/watch?v=XiA_JKPBFGA",
  },
  {
    id: "madinah",
    name: "Madinah Al-Munawwarah",
    nameAr: "المدينة المنورة",
    description: "Live 24/7 from Masjid An-Nabawi, Madinah",
    youtubeId: "rQEBJOmeLCE",
     color: "text-primary",
     bg: "bg-primary/10",
    emoji: "🌙",
    directUrl: "https://www.youtube.com/watch?v=rQEBJOmeLCE",
  },
  {
    id: "aqsa",
    name: "Al-Masjid Al-Aqsa",
    nameAr: "المسجد الأقصى",
    description: "Live stream from Masjid Al-Aqsa, Jerusalem",
    youtubeId: "f8yDSCIkfMI",
     color: "text-primary",
     bg: "bg-primary/10",
    emoji: "🕌",
    directUrl: "https://www.youtube.com/watch?v=f8yDSCIkfMI",
  },
];

export function MakkahLive() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500 bg-background"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link href="/more" className="text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-primary">Live Islamic Streams</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Makkah · Madinah · Al-Aqsa — live 24/7</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-border bg-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-foreground text-xs font-bold">LIVE</span>
        </div>
      </div>

      {/* Info banner */}
      <div className="mx-5 mt-3 mb-5 flex items-start gap-2.5 px-4 py-3 rounded-2xl border border-border bg-primary/10">
        <Wifi className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Streams require an internet connection. Tap a card to watch live, or open in YouTube for the best experience.
        </p>
      </div>

      <div className="px-4 space-y-4">
        {STREAMS.map((s) => (
          <div key={s.id} className="rounded-3xl overflow-hidden border border-border bg-card">

            {/* Stream player / thumbnail */}
            {active === s.id ? (
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${s.youtubeId}?autoplay=1&mute=0&rel=0`}
                  title={s.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
                <button
                onClick={() => setActive(s.id)}
                className="w-full relative flex items-center justify-center transition-all active:opacity-80"
                  style={{ height: 200 }}
              >
                {/* Emoji watermark */}
                <span className="absolute right-6 top-4 text-5xl opacity-30">{s.emoji}</span>
                {/* Play button */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-border bg-background/80 backdrop-blur-sm">
                    <Play className="w-7 h-7 text-foreground fill-foreground ml-1" />
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-bold text-sm">Tap to Watch Live</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{s.description}</p>
                  </div>
                </div>
                {/* Live badge */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-primary-foreground text-xs font-bold">LIVE</span>
                </div>
              </button>
            )}

            {/* Info row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.emoji}</span>
                  <p className={`font-bold text-base ${s.color}`}>{s.name}</p>
                </div>
                <p className="text-muted-foreground text-sm mt-0.5" dir="rtl">{s.nameAr}</p>
              </div>
              <div className="flex gap-2">
                {active === s.id && (
                  <button onClick={() => setActive(null)}
                    className="px-3 py-1.5 rounded-xl text-xs text-primary border border-border bg-primary/10">
                    Close
                  </button>
                )}
                <a href={s.directUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border bg-primary/10 text-primary">
                  <ExternalLink className="w-3 h-3" />
                  YouTube
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TV icon footer */}
      <div className="flex flex-col items-center gap-2 mt-8 mb-4 px-6 text-center">
        <Tv className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Streams are provided via YouTube. Noor Quran is not affiliated with any broadcasting authority.
        </p>
      </div>
    </div>
  );
}
