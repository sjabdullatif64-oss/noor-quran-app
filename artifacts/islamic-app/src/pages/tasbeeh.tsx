import { useState, useRef, useCallback } from "react";
import { RotateCcw, ChevronLeft, Plus, Minus } from "lucide-react";
import { Link } from "wouter";

interface DhikrPreset {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  target: number;
}

const PRESETS: DhikrPreset[] = [
  { id: "subhanallah", arabic: "سُبْحَانَ اللّٰهِ", transliteration: "SubhanAllah", translation: "Glory be to Allah", target: 33 },
  { id: "alhamdulillah", arabic: "اَلْحَمْدُ لِلّٰهِ", transliteration: "Alhamdulillah", translation: "Praise be to Allah", target: 33 },
  { id: "allahuakbar", arabic: "اَللّٰهُ أَكْبَرُ", transliteration: "Allahu Akbar", translation: "Allah is the Greatest", target: 33 },
  { id: "astaghfirullah", arabic: "أَسْتَغْفِرُ اللّٰهَ", transliteration: "Astaghfirullah", translation: "I seek forgiveness from Allah", target: 100 },
  { id: "lailahaillallah", arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ", transliteration: "La ilaha illallah", translation: "There is no god but Allah", target: 100 },
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
        return next;
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

  const progress = Math.min(count / activePreset.target, 1);
  const circumference = 2 * Math.PI * 108;
  const dashOffset = circumference * (1 - progress);

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
        <h1 className="text-2xl font-serif font-bold text-emerald-300">Tasbeeh Counter</h1>
      </div>

      {/* Presets */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => { setActivePreset(preset); setCount(0); setCompleted(false); }}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              activePreset.id === preset.id
                ? "bg-emerald-700 text-white border-emerald-600"
                : "text-emerald-600 border-emerald-900/50 hover:border-emerald-700"
            }`}
            style={{ background: activePreset.id === preset.id ? undefined : "rgba(255,255,255,0.03)" }}
            data-testid={`preset-${preset.id}`}
          >
            {preset.transliteration}
          </button>
        ))}
      </div>

      {/* Main counter */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-8">

        {/* Arabic text */}
        <div className="text-center space-y-1">
          <p dir="rtl" className="text-4xl font-arabic text-emerald-200 leading-loose">
            {activePreset.arabic}
          </p>
          <p className="text-emerald-500 text-sm">{activePreset.transliteration}</p>
          <p className="text-emerald-700 text-xs">{activePreset.translation}</p>
        </div>

        {/* Circular progress + tap button */}
        <div className="relative flex items-center justify-center">
          {/* SVG ring */}
          <svg className="absolute" width="240" height="240" viewBox="0 0 240 240">
            {/* Track */}
            <circle cx="120" cy="120" r="108" fill="none" stroke="rgba(52,211,153,0.1)" strokeWidth="6" />
            {/* Progress */}
            <circle
              cx="120" cy="120" r="108"
              fill="none"
              stroke={completed ? "#34d399" : "#059669"}
              strokeWidth="6"
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
                ? "0 0 40px rgba(52,211,153,0.3), inset 0 0 30px rgba(52,211,153,0.05)"
                : "0 0 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)",
              border: "2px solid rgba(52,211,153,0.2)",
              transition: "background 0.12s, box-shadow 0.3s",
            }}
            data-testid="button-tasbeeh-tap"
          >
            <span
              className="font-serif font-bold transition-all"
              style={{
                fontSize: count > 999 ? "3rem" : "4rem",
                color: completed ? "#34d399" : "#6ee7b7",
                lineHeight: 1,
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
          Tap the circle to count · {activePreset.target - count > 0 ? `${activePreset.target - count} remaining` : "Goal reached!"}
        </p>
      </div>
    </div>
  );
}
