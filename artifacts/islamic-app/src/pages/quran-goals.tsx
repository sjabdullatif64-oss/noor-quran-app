import { useState, useEffect } from "react";
import { ChevronLeft, Target, Trophy, BookOpen, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Link } from "wouter";
import { addCoins, COIN_EVENTS } from "@/lib/coins";
import { useToast } from "@/hooks/use-toast";

interface GoalRecord {
  month: string;       // "YYYY-MM"
  targetPages: number; // user-chosen monthly target
  readPages: number;   // pages ticked so far
  readSurahs: number[]; // surah IDs completed
}

const STORE_KEY = "noor-goals-v1";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function loadGoal(): GoalRecord {
  try {
    const all: GoalRecord[] = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    return all.find(g => g.month === currentMonth()) ?? {
      month: currentMonth(), targetPages: 30, readPages: 0, readSurahs: [],
    };
  } catch {
    return { month: currentMonth(), targetPages: 30, readPages: 0, readSurahs: [] };
  }
}

function saveGoal(goal: GoalRecord) {
  try {
    const all: GoalRecord[] = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]").filter(
      (g: GoalRecord) => g.month !== goal.month
    );
    localStorage.setItem(STORE_KEY, JSON.stringify([...all, goal].slice(-12)));
  } catch { /* ignore */ }
}

const PAGE_PRESETS = [10, 20, 30, 60, 100, 200, 300, 604];

// 30 popular surahs for quick tracking
const POPULAR_SURAHS = [
  { n: 1,  name: "Al-Fatiha",    pages: 1  },
  { n: 2,  name: "Al-Baqarah",  pages: 49 },
  { n: 3,  name: "Ali 'Imran",  pages: 20 },
  { n: 18, name: "Al-Kahf",     pages: 12 },
  { n: 36, name: "Ya-Sin",      pages: 8  },
  { n: 55, name: "Ar-Rahman",   pages: 4  },
  { n: 56, name: "Al-Waqi'ah",  pages: 4  },
  { n: 67, name: "Al-Mulk",     pages: 3  },
  { n: 73, name: "Al-Muzzammil",pages: 2  },
  { n: 78, name: "An-Naba'",    pages: 2  },
  { n: 112, name: "Al-Ikhlas",  pages: 1  },
  { n: 113, name: "Al-Falaq",   pages: 1  },
  { n: 114, name: "An-Nas",     pages: 1  },
  { n: 4,  name: "An-Nisa'",    pages: 24 },
  { n: 5,  name: "Al-Ma'idah",  pages: 24 },
];

export function QuranGoals() {
  const [goal, setGoal]         = useState<GoalRecord>(loadGoal);
  const [showTarget, setShowTarget] = useState(false);
  const [showSurahs, setShowSurahs] = useState(false);
  const { toast } = useToast();

  const pct      = Math.min(100, Math.round((goal.readPages / goal.targetPages) * 100));
  const achieved = goal.readPages >= goal.targetPages;

  function updateGoal(updates: Partial<GoalRecord>) {
    const next = { ...goal, ...updates };
    setGoal(next);
    saveGoal(next);
  }

  function addPages(n: number) {
    const newPages = Math.max(0, goal.readPages + n);
    const wasAchieved = goal.readPages >= goal.targetPages;
    updateGoal({ readPages: newPages });
    const nowAchieved = newPages >= goal.targetPages;
    if (nowAchieved && !wasAchieved) {
      const earned = addCoins(COIN_EVENTS.goal_complete);
      toast({ title: "🏆 Goal Achieved!", description: `MashaAllah! Monthly goal complete! +${COIN_EVENTS.goal_complete} coins. Total: ${earned} 🪙` });
    } else if (n > 0) {
      const earned = addCoins(COIN_EVENTS.goal_progress);
      toast({ title: "📖 Progress saved!", description: `+${n} pages. ${newPages}/${goal.targetPages} pages this month. +${COIN_EVENTS.goal_progress} coins 🪙` });
    }
  }

  function toggleSurah(surahN: number, pages: number) {
    const already = goal.readSurahs.includes(surahN);
    const newSurahs = already
      ? goal.readSurahs.filter(s => s !== surahN)
      : [...goal.readSurahs, surahN];
    const pagesDelta = already ? -pages : pages;
    const newPages = Math.max(0, goal.readPages + pagesDelta);
    const wasAchieved = goal.readPages >= goal.targetPages;
    updateGoal({ readSurahs: newSurahs, readPages: newPages });
    if (!already) {
      addCoins(COIN_EVENTS.goal_progress);
      const nowAchieved = newPages >= goal.targetPages;
      if (nowAchieved && !wasAchieved) {
        addCoins(COIN_EVENTS.goal_complete);
        toast({ title: "🏆 Goal Achieved!", description: "MashaAllah! Monthly Quran goal complete!" });
      } else {
        toast({ title: "📖 Surah recorded!", description: `${POPULAR_SURAHS.find(s => s.n === surahN)?.name} — ${newPages}/${goal.targetPages} pages` });
      }
    }
  }

  const monthLabel = new Date(goal.month + "-01").toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Quran Reading Goals</h1>
          <p className="text-emerald-700 text-xs mt-0.5">{monthLabel}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,92,56,0.25)" }}>
          <Target className="w-5 h-5 text-emerald-400" />
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Progress card */}
        <div className="rounded-3xl border border-emerald-900/40 overflow-hidden"
          style={{ background: achieved ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)" }}>
          <div className="h-1 w-full"
            style={{ background: `linear-gradient(90deg, #1a5c38, ${achieved ? "#34d399" : "#1a5c38"}, #1a5c38)` }} />

          <div className="p-5 space-y-4">
            {achieved && (
              <div className="flex items-center gap-2 justify-center">
                <Trophy className="w-5 h-5 text-amber-400" />
                <p className="text-amber-300 font-bold text-sm">Monthly Goal Achieved! MashaAllah 🌟</p>
              </div>
            )}

            {/* Big number */}
            <div className="text-center space-y-1">
              <p className="text-5xl font-bold" style={{ color: "#34d399" }}>{goal.readPages}</p>
              <p className="text-emerald-700 text-sm">of <span className="text-emerald-400 font-semibold">{goal.targetPages}</span> pages read</p>
            </div>

            {/* Progress bar */}
            <div className="rounded-full overflow-hidden" style={{ height: 10, background: "rgba(26,92,56,0.25)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: achieved
                    ? "linear-gradient(90deg, #34d399, #10b981)"
                    : "linear-gradient(90deg, #1a5c38, #34d399)",
                }}
              />
            </div>
            <p className="text-center text-emerald-500 text-sm font-semibold">{pct}% complete</p>

            {/* +/- controls */}
            <div className="flex items-center justify-center gap-3">
              {[-5, -1].map(n => (
                <button key={n} onClick={() => addPages(n)}
                  className="w-11 h-11 rounded-xl border border-emerald-900/40 text-emerald-400 font-bold text-base transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  {n}
                </button>
              ))}
              <BookOpen className="w-5 h-5 text-emerald-700 mx-1" />
              {[1, 5, 10].map(n => (
                <button key={n} onClick={() => addPages(n)}
                  className="w-11 h-11 rounded-xl border border-emerald-700/40 text-emerald-300 font-bold text-base transition-all active:scale-95"
                  style={{ background: "rgba(52,211,153,0.1)" }}>
                  +{n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Set target */}
        <button onClick={() => setShowTarget(!showTarget)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-emerald-900/40 transition-all active:scale-[0.98]"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <span className="text-emerald-400 text-sm font-semibold">📐 Change Monthly Target</span>
          {showTarget ? <ChevronUp className="w-4 h-4 text-emerald-700" /> : <ChevronDown className="w-4 h-4 text-emerald-700" />}
        </button>

        {showTarget && (
          <div className="grid grid-cols-4 gap-2 animate-in fade-in duration-200">
            {PAGE_PRESETS.map(p => (
              <button key={p} onClick={() => { updateGoal({ targetPages: p }); setShowTarget(false); }}
                className={`py-3 rounded-2xl border text-sm font-bold transition-all active:scale-95 ${
                  goal.targetPages === p ? "border-emerald-500 text-emerald-300" : "border-emerald-900/40 text-emerald-700"
                }`}
                style={{ background: goal.targetPages === p ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)" }}>
                {p === 604 ? "Full\nQuran" : `${p} pg`}
              </button>
            ))}
          </div>
        )}

        {/* Mark surahs as read */}
        <button onClick={() => setShowSurahs(!showSurahs)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-emerald-900/40 transition-all active:scale-[0.98]"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <span className="text-emerald-400 text-sm font-semibold">📖 Track by Surah ({goal.readSurahs.length} done)</span>
          {showSurahs ? <ChevronUp className="w-4 h-4 text-emerald-700" /> : <ChevronDown className="w-4 h-4 text-emerald-700" />}
        </button>

        {showSurahs && (
          <div className="space-y-2 animate-in fade-in duration-200">
            {POPULAR_SURAHS.map(s => {
              const done = goal.readSurahs.includes(s.n);
              return (
                <button key={s.n} onClick={() => toggleSurah(s.n, s.pages)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                    done ? "border-emerald-700/50" : "border-emerald-900/40"
                  }`}
                  style={{ background: done ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)" }}>
                  <span className="text-emerald-800 text-xs w-5 shrink-0">{s.n}.</span>
                  <span className={`flex-1 text-sm font-semibold ${done ? "text-emerald-300" : "text-white"}`}>{s.name}</span>
                  <span className="text-emerald-800 text-xs">{s.pages} pg{s.pages > 1 ? "s" : ""}</span>
                  {done
                    ? <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                    : <div className="w-5 h-5 rounded-full border border-emerald-900/40 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Motivational quote */}
        <div className="rounded-2xl px-4 py-4 border border-emerald-900/30 text-center"
          style={{ background: "rgba(26,92,56,0.06)" }}>
          <p className="text-emerald-400 text-sm font-arabic" style={{ fontFamily: "'Amiri', serif" }}>
            خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
          </p>
          <p className="text-emerald-700 text-xs mt-2">"The best of you are those who learn the Quran and teach it." — Prophet ﷺ</p>
        </div>
      </div>
    </div>
  );
}
