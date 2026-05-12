import { useState, useEffect } from "react";
import { ChevronLeft, CheckCircle2, Circle, Flame, Trophy, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { addCoins, COIN_EVENTS } from "@/lib/coins";
import { useToast } from "@/hooks/use-toast";

interface Habit {
  id: string;
  emoji: string;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
}

const HABITS: Habit[] = [
  { id: "fajr",        emoji: "🌅", label: "Fajr Prayer",       sublabel: "Prayed Fajr on time",              color: "text-blue-300",   bg: "rgba(96,165,250,0.15)"  },
  { id: "dhuhr",       emoji: "☀️", label: "Dhuhr Prayer",      sublabel: "Prayed Dhuhr on time",             color: "text-yellow-300", bg: "rgba(234,179,8,0.15)"   },
  { id: "asr",         emoji: "🌤️", label: "Asr Prayer",        sublabel: "Prayed Asr on time",               color: "text-orange-300", bg: "rgba(249,115,22,0.15)"  },
  { id: "maghrib",     emoji: "🌅", label: "Maghrib Prayer",    sublabel: "Prayed Maghrib on time",           color: "text-rose-300",   bg: "rgba(244,63,94,0.15)"   },
  { id: "isha",        emoji: "🌙", label: "Isha Prayer",       sublabel: "Prayed Isha on time",              color: "text-indigo-300", bg: "rgba(99,102,241,0.15)"  },
  { id: "quran",       emoji: "📖", label: "Quran Reading",     sublabel: "Read at least 1 page of Quran",    color: "text-emerald-300",bg: "rgba(52,211,153,0.15)"  },
  { id: "morning_azk", emoji: "🌿", label: "Morning Azkar",     sublabel: "Completed morning remembrance",    color: "text-teal-300",   bg: "rgba(45,212,191,0.15)"  },
  { id: "evening_azk", emoji: "🌌", label: "Evening Azkar",     sublabel: "Completed evening remembrance",    color: "text-violet-300", bg: "rgba(139,92,246,0.15)"  },
  { id: "sadaqah",     emoji: "💝", label: "Sadaqah",           sublabel: "Gave in charity today",            color: "text-pink-300",   bg: "rgba(236,72,153,0.15)"  },
  { id: "dhikr",       emoji: "📿", label: "100 Dhikr",         sublabel: "SubhanAllah/Alhamdulillah/Akbar",  color: "text-amber-300",  bg: "rgba(217,119,6,0.15)"   },
  { id: "duaa",        emoji: "🤲", label: "Personal Dua",      sublabel: "Made dua with intention",          color: "text-sky-300",    bg: "rgba(56,189,248,0.15)"  },
  { id: "sleep_early", emoji: "💤", label: "Sleep Early",       sublabel: "Slept before midnight",            color: "text-slate-300",  bg: "rgba(148,163,184,0.15)" },
];

interface DayRecord {
  date: string;
  done: Record<string, boolean>;
}

const STORE_KEY = "noor-habits-v1";
const STREAK_KEY = "noor-habit-streak-v1";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadRecords(): DayRecord[] {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]"); }
  catch { return []; }
}

function loadStreak(): number {
  try { return parseInt(localStorage.getItem(STREAK_KEY) ?? "0", 10) || 0; }
  catch { return 0; }
}

function saveRecords(records: DayRecord[]) {
  // Keep last 30 days only
  const trimmed = records.slice(-30);
  localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
}

export function HabitTracker() {
  const today = todayStr();
  const [records, setRecords] = useState<DayRecord[]>(loadRecords);
  const [streak, setStreak]   = useState(loadStreak);
  const { toast } = useToast();

  const todayRecord = records.find(r => r.date === today) ?? { date: today, done: {} };
  const done = todayRecord.done;
  const completedCount = Object.values(done).filter(Boolean).length;
  const totalCount     = HABITS.length;
  const pct            = Math.round((completedCount / totalCount) * 100);

  function toggle(habitId: string) {
    const prev = done[habitId] ?? false;
    const newDone = { ...done, [habitId]: !prev };
    const newRecord: DayRecord = { date: today, done: newDone };
    const rest = records.filter(r => r.date !== today);
    const next = [...rest, newRecord];
    setRecords(next);
    saveRecords(next);

    if (!prev) {
      // Just checked — award coins
      const earned = addCoins(COIN_EVENTS.habit_complete);
      toast({ title: "🌟 Habit done!", description: `+${COIN_EVENTS.habit_complete} coins earned. Total: ${earned} 🪙` });

      // Check if all habits done for streak
      const allDone = HABITS.every(h => newDone[h.id]);
      if (allDone) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem(STREAK_KEY, String(newStreak));
        toast({ title: `🔥 Streak: ${newStreak} days!`, description: "MashaAllah! All habits completed for today!" });
      }
    }
  }

  function resetToday() {
    const rest = records.filter(r => r.date !== today);
    setRecords(rest);
    saveRecords(rest);
  }

  // Past 7 days (for mini calendar)
  const past7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const rec = records.find(r => r.date === dateStr);
    const cnt = rec ? Object.values(rec.done).filter(Boolean).length : 0;
    const isToday = dateStr === today;
    const dayLabel = isToday ? "Today" : d.toLocaleDateString("en", { weekday: "short" });
    return { dateStr, cnt, isToday, dayLabel };
  });

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
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Islamic Habit Tracker</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Build your daily Islamic routine</p>
        </div>
        <button onClick={resetToday}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-emerald-900/40 text-emerald-700 hover:text-emerald-500 transition-colors"
          style={{ background: "rgba(255,255,255,0.03)" }}
          title="Reset today">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* Progress ring + streak */}
        <div className="rounded-3xl border border-emerald-900/40 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, transparent, #1a5c38, transparent)" }} />
          <div className="p-5 flex items-center gap-5">
            {/* Circle progress */}
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(26,92,56,0.25)" strokeWidth="7" />
                <circle cx="40" cy="40" r="33" fill="none" stroke="#34d399" strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 33}`}
                  strokeDashoffset={`${2 * Math.PI * 33 * (1 - pct / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold text-lg leading-none">{pct}%</span>
                <span className="text-emerald-700 text-[9px]">{completedCount}/{totalCount}</span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-white font-bold text-base">
                {pct === 100 ? "MashaAllah! All done 🌟" : pct >= 50 ? "Great progress! 🔥" : "Keep going! 💪"}
              </p>
              <p className="text-emerald-600 text-sm mt-0.5">{completedCount} of {totalCount} habits completed</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-300 font-bold text-sm">{streak} day streak</span>
                </div>
                {streak >= 7 && (
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400 text-xs font-bold">Champion</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 7-day view */}
          <div className="px-5 pb-5">
            <div className="grid grid-cols-7 gap-1.5">
              {past7.map((day) => (
                <div key={day.dateStr} className="flex flex-col items-center gap-1">
                  <span className="text-emerald-800 text-[9px]">{day.dayLabel}</span>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border"
                    style={day.isToday
                      ? { background: "rgba(52,211,153,0.2)", borderColor: "#34d399", color: "#34d399" }
                      : day.cnt >= HABITS.length
                      ? { background: "rgba(52,211,153,0.15)", borderColor: "rgba(52,211,153,0.4)", color: "#34d399" }
                      : day.cnt > 0
                      ? { background: "rgba(26,92,56,0.15)", borderColor: "rgba(26,92,56,0.4)", color: "#1a5c38" }
                      : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(26,92,56,0.15)", color: "#0a1f12" }
                    }
                  >
                    {day.cnt > 0 ? day.cnt : "·"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Habit list */}
        <div className="space-y-2.5">
          {HABITS.map((habit) => {
            const isDone = !!done[habit.id];
            return (
              <button
                key={habit.id}
                onClick={() => toggle(habit.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  isDone ? "border-emerald-700/50" : "border-emerald-900/40"
                }`}
                style={{
                  background: isDone
                    ? "linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(26,92,56,0.1) 100%)"
                    : "rgba(255,255,255,0.03)",
                }}
              >
                {/* Habit icon */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: isDone ? "rgba(52,211,153,0.15)" : habit.bg }}>
                  {isDone ? "✅" : habit.emoji}
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isDone ? "text-emerald-300 line-through decoration-emerald-700" : "text-white"}`}>
                    {habit.label}
                  </p>
                  <p className="text-emerald-700 text-xs mt-0.5 truncate">{habit.sublabel}</p>
                </div>

                {/* Check */}
                {isDone
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  : <Circle className="w-6 h-6 text-emerald-900 shrink-0" />
                }
              </button>
            );
          })}
        </div>

        <p className="text-center text-emerald-900 text-xs pt-2 pb-4">
          Habits reset daily at midnight. Each completed habit earns 🪙 coins.
        </p>
      </div>
    </div>
  );
}
