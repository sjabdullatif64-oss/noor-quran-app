import { useState } from "react";
import { ChevronLeft, BookOpen, Shuffle, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Link } from "wouter";
import { HADITH_COLLECTION, getDailyHadith, getRandomHadith, type Hadith } from "@/lib/hadith-data";
import { awardCoins, COIN_EVENTS } from "@/lib/coins";

const TOPIC_COLORS: Record<string, { text: string; bg: string }> = {
  "Intentions":  { text: "text-purple-300",  bg: "rgba(168,85,247,0.15)"  },
  "Character":   { text: "text-pink-300",    bg: "rgba(236,72,153,0.15)"  },
  "Brotherhood": { text: "text-sky-300",     bg: "rgba(56,189,248,0.15)"  },
  "Speech":      { text: "text-amber-300",   bg: "rgba(217,119,6,0.15)"   },
  "Knowledge":   { text: "text-blue-300",    bg: "rgba(96,165,250,0.15)"  },
  "Quran":       { text: "text-emerald-300", bg: "rgba(52,211,153,0.15)"  },
  "Prayer":      { text: "text-teal-300",    bg: "rgba(45,212,191,0.15)"  },
  "Charity":     { text: "text-lime-300",    bg: "rgba(132,204,22,0.15)"  },
  "Worship":     { text: "text-violet-300",  bg: "rgba(139,92,246,0.15)"  },
  "Purity":      { text: "text-cyan-300",    bg: "rgba(34,211,238,0.15)"  },
  "Taqwa":       { text: "text-emerald-400", bg: "rgba(52,211,153,0.18)"  },
  "Ramadan":     { text: "text-orange-300",  bg: "rgba(249,115,22,0.15)"  },
  "Gratitude":   { text: "text-yellow-300",  bg: "rgba(234,179,8,0.15)"   },
  "Unity":       { text: "text-indigo-300",  bg: "rgba(99,102,241,0.15)"  },
  "Patience":    { text: "text-rose-300",    bg: "rgba(244,63,94,0.15)"   },
  "Salawat":     { text: "text-amber-400",   bg: "rgba(251,191,36,0.15)"  },
};

function topicStyle(topic: string) {
  return TOPIC_COLORS[topic] ?? { text: "text-emerald-300", bg: "rgba(52,211,153,0.12)" };
}

function HadithCard({ hadith, large = false }: { hadith: Hadith; large?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const tc = topicStyle(hadith.topic);

  return (
    <div
      className="rounded-3xl border border-emerald-900/40 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {/* Top accent */}
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, transparent, #1a5c38, transparent)" }} />

      <div className="p-5 space-y-4">
        {/* Topic badge */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tc.text}`}
            style={{ background: tc.bg }}>
            {hadith.topic}
          </span>
          <span className="text-emerald-900 text-xs">#{hadith.id}</span>
        </div>

        {/* Arabic text */}
        <p
          className={`leading-relaxed text-right font-arabic ${large ? "text-2xl" : "text-xl"}`}
          style={{ color: "#e8f5ee", fontFamily: "'Amiri', 'Scheherazade New', serif", direction: "rtl" }}
        >
          {hadith.arabic}
        </p>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1" style={{ background: "rgba(26,92,56,0.4)" }} />
          <Star className="w-3 h-3 text-emerald-800" />
          <div className="h-px flex-1" style={{ background: "rgba(26,92,56,0.4)" }} />
        </div>

        {/* English text */}
        <p className="text-sm leading-relaxed" style={{ color: "rgba(200,230,215,0.9)" }}>
          "{hadith.english}"
        </p>

        {/* Source row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <p className="text-emerald-400 text-xs font-semibold">{hadith.source}</p>
            <p className="text-emerald-700 text-xs mt-0.5">Narrated by {hadith.narrator}</p>
          </div>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-emerald-800" />
            : <ChevronDown className="w-4 h-4 text-emerald-800" />}
        </button>

        {expanded && (
          <div className="rounded-2xl border border-emerald-900/40 p-4 space-y-2 animate-in fade-in duration-200"
            style={{ background: "rgba(26,92,56,0.08)" }}>
            <p className="text-emerald-400 text-xs font-semibold">Source Details</p>
            <p className="text-emerald-300 text-sm">{hadith.source}</p>
            <p className="text-emerald-600 text-xs">Narrator: {hadith.narrator}</p>
            <p className="text-emerald-600 text-xs">Topic: {hadith.topic}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function HadithPage() {
  const dailyHadith  = getDailyHadith();
  const [viewed, setViewed] = useState<Hadith | null>(null);
  const [coinMsg, setCoinMsg]  = useState(false);
  const [showAll, setShowAll]  = useState(false);
  const displayHadith = viewed ?? dailyHadith;

  function handleRandom() {
    const h = getRandomHadith();
    setViewed(h);
    const earned = awardCoins("hadith_read", COIN_EVENTS.hadith_read);
    if (earned > 0) { setCoinMsg(true); setTimeout(() => setCoinMsg(false), 2000); }
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
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Hadith of the Day</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Authentic sayings of the Prophet ﷺ</p>
        </div>
        <button
          onClick={handleRandom}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-amber-300 border border-amber-800/40 transition-all active:scale-95"
          style={{ background: "rgba(217,119,6,0.1)" }}
        >
          <Shuffle className="w-3.5 h-3.5" />
          Random
        </button>
      </div>

      {/* Coin earned message */}
      {coinMsg && (
        <div className="mx-5 mb-3 flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-amber-700/40 animate-in fade-in duration-200"
          style={{ background: "rgba(217,119,6,0.12)" }}>
          <span className="text-base">🪙</span>
          <p className="text-amber-300 text-sm font-semibold">+{COIN_EVENTS.hadith_read} coins earned!</p>
        </div>
      )}

      <div className="px-4 space-y-5">
        {/* Bismillah header */}
        <div className="text-center py-4">
          <p className="text-2xl text-emerald-400" style={{ fontFamily: "'Amiri', serif" }}>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ</p>
          <p className="text-emerald-800 text-xs mt-1">In the name of Allah, the Most Gracious, the Most Merciful</p>
        </div>

        {/* Featured daily hadith */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <p className="text-emerald-600 text-xs font-semibold uppercase tracking-wider">
              {viewed ? "Random Hadith" : "Today's Hadith"}
            </p>
          </div>
          <HadithCard hadith={displayHadith} large />
        </div>

        {/* All hadith */}
        <div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-emerald-900/40 transition-all active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <span className="text-emerald-400 text-sm font-semibold">All Hadith ({HADITH_COLLECTION.length})</span>
            {showAll ? <ChevronUp className="w-4 h-4 text-emerald-700" /> : <ChevronDown className="w-4 h-4 text-emerald-700" />}
          </button>

          {showAll && (
            <div className="mt-3 space-y-3 animate-in fade-in duration-300">
              {HADITH_COLLECTION.map((h) => (
                <HadithCard key={h.id} hadith={h} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
