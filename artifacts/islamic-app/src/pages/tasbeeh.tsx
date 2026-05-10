import { useState, useRef, useCallback } from "react";
import { RotateCcw, ChevronLeft, Plus, Minus } from "lucide-react";
import { Link } from "wouter";

interface DhikrPreset {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  target: number;
  color: string;
}

const PRESETS: DhikrPreset[] = [
  {
    id: "subhanallah",
    arabic: "سُبْحَانَ اللّٰهِ",
    transliteration: "SubhanAllah",
    translation: "Glory be to Allah",
    target: 33,
    color: "#34d399",
  },
  {
    id: "alhamdulillah",
    arabic: "اَلْحَمْدُ لِلّٰهِ",
    transliteration: "Alhamdulillah",
    translation: "Praise be to Allah",
    target: 33,
    color: "#60a5fa",
  },
  {
    id: "allahuakbar",
    arabic: "اَللّٰهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    translation: "Allah is the Greatest",
    target: 34,
    color: "#f472b6",
  },
  {
    id: "astaghfirullah",
    arabic: "أَسْتَغْفِرُ اللّٰهَ",
    transliteration: "Astaghfirullah",
    translation: "I seek forgiveness from Allah",
    target: 100,
    color: "#a78bfa",
  },
  {
    id: "lailahaillallah",
    arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ",
    transliteration: "La ilaha illallah",
    translation: "There is no god but Allah",
    target: 100,
    color: "#fbbf24",
  },
  {
    id: "subhanallahi-wa-bihamdihi",
    arabic: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ",
    transliteration: "SubhanAllahi wa bihamdihi",
    translation: "Glory and Praise be to Allah",
    target: 100,
    color: "#34d399",
  },
  {
    id: "salawat",
    arabic: "اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ",
    transliteration: "Allahumma salli ala Muhammad",
    translation: "O Allah, send blessings upon Muhammad ﷺ",
    target: 100,
    color: "#fb923c",
  },
  {
    id: "hasbunallah",
    arabic: "حَسْبُنَا اللّٰهُ وَنِعْمَ الْوَكِيلُ",
    transliteration: "Hasbunallahu wa ni'mal wakeel",
    translation: "Allah is sufficient and He is the best Guardian",
    target: 40,
    color: "#38bdf8",
  },
  {
    id: "ya-rahman",
    arabic: "يَا رَحْمٰنُ",
    transliteration: "Ya Rahman",
    translation: "O The Most Gracious",
    target: 99,
    color: "#e879f9",
  },
  {
    id: "ya-raheem",
    arabic: "يَا رَحِيمُ",
    transliteration: "Ya Raheem",
    translation: "O The Most Merciful",
    target: 99,
    color: "#f43f5e",
  },
  {
    id: "bismillah",
    arabic: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ",
    transliteration: "Bismillah ir-Rahman ir-Raheem",
    translation: "In the name of Allah, the Most Gracious, the Most Merciful",
    target: 21,
    color: "#4ade80",
  },
  {
    id: "alhamdulillah-rabbil-alameen",
    arabic: "اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ",
    transliteration: "Alhamdulillahi Rabbil Alameen",
    translation: "All praise is due to Allah, Lord of all the worlds",
    target: 33,
    color: "#86efac",
  },
];

export function Tasbeeh() {
  const [activePreset, setActivePreset] = useState<DhikrPreset>(PRESETS[0]);
  const [count, setCount] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const tapRef = useRef<HTMLButtonElement>(null);

  const handleTap = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      if (next >= activePreset.target) {
        setCompleted(true);
        setTimeout(() => setCompleted(false), 2000);
      }
      return next;
    });
    setFlashing(true);
    setTimeout(() => setFlashing(false), 120);
  }, [activePreset.target]);

  const handleReset = () => {
    setCount(0);
    setCompleted(false);
  };

  const progress     = Math.min(count / activePreset.target, 1);
  const circumference = 2 * Math.PI * 108;
  const dashOffset   = circumference * (1 - progress);
  const accentColor  = completed ? "#34d399" : activePreset.color;

  return (
    <div
      className="min-h-screen flex flex-col pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(160deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Tasbeeh Counter</h1>
          <p className="text-emerald-800 text-xs">Scroll to choose your dhikr</p>
        </div>
      </div>

      {/* ── Preset pills ────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {PRESETS.map((preset) => {
            const isActive = activePreset.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => { setActivePreset(preset); setCount(0); setCompleted(false); }}
                className="shrink-0 snap-start flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl text-xs font-medium transition-all border"
                style={{
                  background: isActive
                    ? `rgba(${hexToRgb(preset.color)}, 0.18)`
                    : "rgba(255,255,255,0.03)",
                  borderColor: isActive
                    ? `rgba(${hexToRgb(preset.color)}, 0.5)`
                    : "rgba(52,211,153,0.12)",
                  color: isActive ? preset.color : "#6ee7b7",
                  minWidth: "88px",
                }}
                data-testid={`preset-${preset.id}`}
              >
                <span
                  dir="rtl"
                  className="font-arabic text-sm leading-relaxed text-center line-clamp-1"
                  style={{ color: isActive ? preset.color : "#34d399" }}
                >
                  {preset.arabic.split(" ").slice(0, 2).join(" ")}
                </span>
                <span className="truncate max-w-[80px] text-center">
                  {preset.transliteration.split(" ").slice(0, 2).join(" ")}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: isActive
                      ? `rgba(${hexToRgb(preset.color)}, 0.15)`
                      : "rgba(52,211,153,0.06)",
                    color: isActive ? preset.color : "#6ee7b7",
                  }}
                >
                  ×{preset.target}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main counter area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-4">

        {/* Arabic + meaning */}
        <div className="text-center space-y-1.5 px-4">
          <p
            dir="rtl"
            className="text-3xl font-arabic leading-loose"
            style={{ color: accentColor, transition: "color 0.4s" }}
          >
            {activePreset.arabic}
          </p>
          <p className="text-emerald-400 text-sm font-medium">{activePreset.transliteration}</p>
          <p className="text-emerald-700 text-xs leading-relaxed max-w-xs mx-auto">{activePreset.translation}</p>
        </div>

        {/* Circular progress + tap button */}
        <div className="relative flex items-center justify-center">
          {/* SVG ring */}
          <svg className="absolute" width="240" height="240" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="108" fill="none" stroke="rgba(52,211,153,0.08)" strokeWidth="7" />
            <circle
              cx="120" cy="120" r="108"
              fill="none"
              stroke={accentColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 120 120)"
              style={{ transition: "stroke-dashoffset 0.3s ease, stroke 0.4s ease" }}
            />
          </svg>

          {/* Tap button */}
          <button
            ref={tapRef}
            onClick={handleTap}
            className="w-52 h-52 rounded-full flex flex-col items-center justify-center gap-2 transition-all active:scale-95 select-none"
            style={{
              background: flashing
                ? "radial-gradient(circle, #065f46, #064e3b)"
                : "radial-gradient(circle, #052e16, #041f0f)",
              boxShadow: flashing
                ? `0 0 40px rgba(${hexToRgb(accentColor)},0.3), inset 0 0 30px rgba(${hexToRgb(accentColor)},0.05)`
                : "0 0 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)",
              border: `2px solid rgba(${hexToRgb(accentColor)},0.25)`,
              transition: "background 0.12s, box-shadow 0.3s, border-color 0.4s",
            }}
            data-testid="button-tasbeeh-tap"
          >
            <span
              className="font-serif font-bold transition-all"
              style={{
                fontSize: count > 999 ? "3rem" : "4rem",
                color: accentColor,
                lineHeight: 1,
                transition: "color 0.4s",
              }}
            >
              {count}
            </span>
            <span className="text-emerald-700 text-xs font-medium">
              {completed ? "✓ Complete!" : `of ${activePreset.target}`}
            </span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setCount((c) => Math.max(0, c - 1))}
            className="w-12 h-12 rounded-full border border-emerald-900/50 flex items-center justify-center text-emerald-600 hover:text-emerald-400 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }}
            data-testid="button-tasbeeh-minus"
          >
            <Minus className="w-5 h-5" />
          </button>

          <button
            onClick={handleReset}
            className="w-12 h-12 rounded-full border border-emerald-900/50 flex items-center justify-center text-emerald-600 hover:text-emerald-400 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }}
            data-testid="button-tasbeeh-reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handleTap}
            className="w-12 h-12 rounded-full border border-emerald-900/50 flex items-center justify-center text-emerald-600 hover:text-emerald-400 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }}
            data-testid="button-tasbeeh-plus"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <p className="text-emerald-800 text-xs text-center">
          Tap the circle to count
          {" · "}
          {activePreset.target - count > 0
            ? `${activePreset.target - count} remaining`
            : "Goal reached! 🌙"}
        </p>
      </div>
    </div>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
