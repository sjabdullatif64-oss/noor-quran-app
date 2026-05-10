import { ChevronLeft, Gift } from "lucide-react";
import { Link } from "wouter";

const CARDS = [
  { id: "eid", title: "Eid Mubarak", arabic: "عِيدٌ مُبَارَكٌ", color: "from-amber-900/40 to-amber-800/20", border: "border-amber-700/30", accent: "text-amber-300" },
  { id: "ramadan", title: "Ramadan Kareem", arabic: "رَمَضَانُ كَرِيمٌ", color: "from-emerald-900/40 to-emerald-800/20", border: "border-emerald-700/30", accent: "text-emerald-300" },
  { id: "jumma", title: "Jumma Mubarak", arabic: "جُمُعَةٌ مُبَارَكَةٌ", color: "from-teal-900/40 to-teal-800/20", border: "border-teal-700/30", accent: "text-teal-300" },
  { id: "hajj", title: "Hajj Mabroor", arabic: "حَجٌّ مَبْرُورٌ", color: "from-sky-900/40 to-sky-800/20", border: "border-sky-700/30", accent: "text-sky-300" },
  { id: "birthday", title: "Islamic Birthday", arabic: "بَارَكَ اللّٰهُ فِيكَ", color: "from-purple-900/40 to-purple-800/20", border: "border-purple-700/30", accent: "text-purple-300" },
  { id: "newborn", title: "New Baby", arabic: "مَاشَاءَ اللّٰهُ", color: "from-rose-900/40 to-rose-800/20", border: "border-rose-700/30", accent: "text-rose-300" },
];

export function IslamicGifts() {
  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      <div className="flex items-center gap-3 px-5 pt-6 pb-6">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Islamic Gifts</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Greeting cards & duas</p>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {CARDS.map((card) => (
          <button
            key={card.id}
            className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-5 flex flex-col items-center gap-3 text-center active:scale-95 transition-transform`}
            data-testid={`gift-card-${card.id}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${card.accent}`}
              style={{ background: "rgba(255,255,255,0.06)" }}>
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{card.title}</p>
              <p dir="rtl" className={`font-arabic text-lg mt-1 ${card.accent}`}>{card.arabic}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mx-4 mt-4 rounded-2xl p-4 border border-emerald-900/30 text-center"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-emerald-700 text-sm">Shareable cards coming soon</p>
      </div>
    </div>
  );
}
