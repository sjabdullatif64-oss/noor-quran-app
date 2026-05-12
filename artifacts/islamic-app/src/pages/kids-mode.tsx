import { useState } from "react";
import { ChevronLeft, Star, Volume2 } from "lucide-react";
import { Link } from "wouter";

interface Section {
  id: string;
  emoji: string;
  title: string;
  color: string;
  bg: string;
  border: string;
}

const SECTIONS: Section[] = [
  { id: "alphabet", emoji: "🔤", title: "Arabic Alphabet", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  { id: "surahs",   emoji: "📖", title: "Short Surahs",    color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" },
  { id: "dhikr",    emoji: "📿", title: "Easy Dhikr",      color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)" },
  { id: "names",    emoji: "✨", title: "99 Names",         color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)" },
  { id: "stories",  emoji: "🌟", title: "Prophet Stories", color: "#f472b6", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.3)" },
  { id: "dua",      emoji: "🤲", title: "Daily Duas",       color: "#fb923c", bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.3)" },
];

const ARABIC_LETTERS = [
  { letter: "ا", name: "Alif" }, { letter: "ب", name: "Ba" },   { letter: "ت", name: "Ta" },
  { letter: "ث", name: "Tha" },  { letter: "ج", name: "Jim" },  { letter: "ح", name: "Ha" },
  { letter: "خ", name: "Kha" },  { letter: "د", name: "Dal" },  { letter: "ذ", name: "Dhal" },
  { letter: "ر", name: "Ra" },   { letter: "ز", name: "Zay" },  { letter: "س", name: "Sin" },
  { letter: "ش", name: "Shin" }, { letter: "ص", name: "Sad" },  { letter: "ض", name: "Dad" },
  { letter: "ط", name: "Ta'" },  { letter: "ظ", name: "Zha" },  { letter: "ع", name: "'Ayn" },
  { letter: "غ", name: "Ghayn"},{ letter: "ف", name: "Fa" },   { letter: "ق", name: "Qaf" },
  { letter: "ك", name: "Kaf" },  { letter: "ل", name: "Lam" },  { letter: "م", name: "Mim" },
  { letter: "ن", name: "Nun" },  { letter: "ه", name: "Ha'" },  { letter: "و", name: "Waw" },
  { letter: "ي", name: "Ya" },
];

const SHORT_SURAHS = [
  { n: 112, name: "Al-Ikhlas",  arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", meaning: "Say: He is Allah, the One. Allah, the Eternal. He neither begets nor was born, nor is there to Him any equivalent.", stars: 5 },
  { n: 113, name: "Al-Falaq",   arabic: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ", meaning: "Say: I seek refuge in the Lord of daybreak, from the evil of what He has created...", stars: 5 },
  { n: 114, name: "An-Nas",     arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ", meaning: "Say: I seek refuge in the Lord of humanity, the King of humanity, the God of humanity...", stars: 5 },
  { n: 108, name: "Al-Kawthar", arabic: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ ۝ فَصَلِّ لِرَبِّكَ وَانْحَرْ ۝ إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ", meaning: "Indeed, We have given you the Abundance. So pray to your Lord and sacrifice. Indeed, your enemy is the one cut off.", stars: 4 },
  { n: 107, name: "Al-Ma'un",   arabic: "أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ ۝ فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ ۝ وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ", meaning: "Have you seen the one who denies the Day of Judgment? That is the one who pushes away the orphan...", stars: 4 },
];

const EASY_DHIKR = [
  { arabic: "سُبْحَانَ اللّٰهِ", trans: "SubhanAllah", meaning: "Glory to Allah", count: 33, color: "#34d399" },
  { arabic: "اَلْحَمْدُ لِلّٰهِ", trans: "Alhamdulillah", meaning: "Praise be to Allah", count: 33, color: "#60a5fa" },
  { arabic: "اَللّٰهُ أَكْبَرُ", trans: "Allahu Akbar", meaning: "Allah is the Greatest", count: 34, color: "#f472b6" },
  { arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ", trans: "La ilaha illallah", meaning: "There is no god but Allah", count: 100, color: "#fbbf24" },
  { arabic: "أَسْتَغْفِرُ اللّٰهَ", trans: "Astaghfirullah", meaning: "I seek forgiveness from Allah", count: 100, color: "#a78bfa" },
];

const DAILY_DUAS_KIDS = [
  { emoji: "🌅", when: "Before sleeping", arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", trans: "Bismika Allahumma amutu wa ahya", meaning: "In Your name O Allah, I die and I live" },
  { emoji: "🌄", when: "When waking up",  arabic: "الحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا", trans: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana", meaning: "All praise to Allah Who gave us life after death" },
  { emoji: "🍽️", when: "Before eating",  arabic: "بِسْمِ اللّٰهِ", trans: "Bismillah", meaning: "In the name of Allah" },
  { emoji: "🚗", when: "In a vehicle",   arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا", trans: "Subhanal-ladhi sakhkhara lana hadha", meaning: "Glory to the One Who made this for us" },
];

const PROPHET_STORIES = [
  { prophet: "Adam (AS)", emoji: "🌱", story: "Adam was the first human being created by Allah. He was placed in the beautiful Garden of Paradise and was taught the names of all things. After being sent to Earth, he repented to Allah and was forgiven.", lesson: "Allah loves those who repent sincerely." },
  { prophet: "Ibrahim (AS)", emoji: "🔥", story: "Ibrahim was thrown into a huge fire by those who rejected Allah, but the fire did not burn him! Allah commanded the fire: 'Be cool and safe for Ibrahim.' His complete trust in Allah saved him.", lesson: "Trust in Allah completely and He will protect you." },
  { prophet: "Yunus (AS)", emoji: "🐳", story: "Yunus was swallowed by a giant whale! In the darkness of the ocean, he called out: 'There is no god but You! I was wrong!' Allah heard his prayer and the whale gently released him on the shore.", lesson: "Never give up calling to Allah, even in the darkest times." },
  { prophet: "Musa (AS)", emoji: "🌊", story: "Musa split the Red Sea with his staff! When Pharaoh's army chased the Israelites, Allah commanded Musa to strike the sea, and it parted, creating a dry path for them to cross safely.", lesson: "Allah helps those who trust Him, even in impossible situations." },
  { prophet: "Isa (AS)", emoji: "🕊️", story: "Isa was born miraculously to Maryam without a father. He could speak from the cradle as a baby! He healed the sick and blind by Allah's permission. He was given the Injeel (Gospel) as guidance.", lesson: "All miracles happen only by the permission of Allah." },
];

const NAMES_OF_ALLAH = [
  { name: "Ar-Rahman", arabic: "الرَّحْمٰنُ", meaning: "The Most Gracious" },
  { name: "Ar-Rahim",  arabic: "الرَّحِيمُ",  meaning: "The Most Merciful" },
  { name: "Al-Malik",  arabic: "الْمَلِكُ",   meaning: "The King" },
  { name: "As-Salam",  arabic: "السَّلَامُ",  meaning: "The Source of Peace" },
  { name: "Al-Khaliq", arabic: "الْخَالِقُ",  meaning: "The Creator" },
  { name: "Al-'Alim",  arabic: "الْعَلِيمُ",  meaning: "The All-Knowing" },
  { name: "Al-Qadir",  arabic: "الْقَادِرُ",  meaning: "The All-Powerful" },
  { name: "Al-Ghafur", arabic: "الْغَفُورُ",  meaning: "The Most Forgiving" },
  { name: "Al-Wadud",  arabic: "الْوَدُودُ",  meaning: "The Most Loving" },
  { name: "As-Samad",  arabic: "الصَّمَدُ",   meaning: "The Eternal" },
  { name: "Al-Hayy",   arabic: "الْحَيُّ",    meaning: "The Ever-Living" },
  { name: "Al-Qayyum", arabic: "الْقَيُّومُ", meaning: "The Self-Sustaining" },
];

export function KidsMode() {
  const [active, setActive] = useState<string | null>(null);
  const [dhikrCounts, setDhikrCounts] = useState<Record<string, number>>({});

  function bumpDhikr(trans: string) {
    setDhikrCounts(c => ({ ...c, [trans]: (c[trans] ?? 0) + 1 }));
  }

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #071a0e 100%)" }}
    >
      {/* Kid-friendly header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" style={{ color: "#34d399" }}>🧒 Kids Islamic Mode</h1>
            <p className="text-emerald-700 text-xs mt-0.5">Learn Islam with fun!</p>
          </div>
        </div>

        {/* Section picker */}
        {active === null && (
          <div className="grid grid-cols-2 gap-3">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className="flex flex-col items-center justify-center py-7 rounded-3xl border text-center transition-all active:scale-[0.96]"
                style={{ background: s.bg, borderColor: s.border }}
              >
                <span className="text-4xl mb-2">{s.emoji}</span>
                <span className="font-bold text-sm" style={{ color: s.color }}>{s.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section content */}
      {active && (
        <div className="px-4 space-y-4">
          <button onClick={() => setActive(null)}
            className="flex items-center gap-2 text-emerald-500 hover:text-emerald-300 text-sm transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to sections
          </button>

          {/* ── Arabic Alphabet ── */}
          {active === "alphabet" && (
            <>
              <h2 className="text-xl font-bold text-amber-300 mb-4">🔤 Arabic Alphabet</h2>
              <div className="grid grid-cols-4 gap-2.5">
                {ARABIC_LETTERS.map(l => (
                  <div key={l.letter}
                    className="flex flex-col items-center justify-center py-4 rounded-2xl border border-amber-900/30"
                    style={{ background: "rgba(245,158,11,0.08)" }}>
                    <span className="text-3xl font-bold" style={{ color: "#f59e0b", fontFamily: "'Amiri', serif" }}>{l.letter}</span>
                    <span className="text-amber-700 text-xs mt-1">{l.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Short Surahs ── */}
          {active === "surahs" && (
            <>
              <h2 className="text-xl font-bold text-emerald-300 mb-4">📖 Short Surahs</h2>
              <div className="space-y-4">
                {SHORT_SURAHS.map(s => (
                  <div key={s.n} className="rounded-3xl border border-emerald-900/40 p-5 space-y-3"
                    style={{ background: "rgba(52,211,153,0.06)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-emerald-300 font-bold text-base">Surah {s.name}</p>
                      <div className="flex gap-0.5">{Array.from({length: s.stars}).map((_,i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ))}</div>
                    </div>
                    <p className="text-right text-lg leading-loose" dir="rtl"
                      style={{ color: "#e8f5ee", fontFamily: "'Amiri', serif" }}>{s.arabic}</p>
                    <p className="text-emerald-600 text-sm italic">{s.meaning}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Easy Dhikr ── */}
          {active === "dhikr" && (
            <>
              <h2 className="text-xl font-bold text-purple-300 mb-4">📿 Easy Dhikr Counter</h2>
              <div className="space-y-3">
                {EASY_DHIKR.map(d => {
                  const cnt = dhikrCounts[d.trans] ?? 0;
                  const done = cnt >= d.count;
                  return (
                    <button key={d.trans} onClick={() => bumpDhikr(d.trans)}
                      className="w-full flex items-center gap-4 p-4 rounded-3xl border text-left transition-all active:scale-[0.97]"
                      style={{ background: done ? `${d.color}22` : "rgba(255,255,255,0.04)", borderColor: done ? d.color + "80" : "rgba(26,92,56,0.3)" }}>
                      <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border"
                        style={{ background: `${d.color}18`, borderColor: `${d.color}40` }}>
                        <span className="text-lg font-bold" style={{ color: d.color }}>{cnt}</span>
                        <span className="text-xs" style={{ color: d.color + "80" }}>/{d.count}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-right text-xl" style={{ color: d.color, fontFamily: "'Amiri', serif" }}>{d.arabic}</p>
                        <p className="text-white text-sm font-semibold mt-1">{d.trans}</p>
                        <p className="text-emerald-700 text-xs">{d.meaning}</p>
                      </div>
                      {done && <span className="text-2xl shrink-0">⭐</span>}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setDhikrCounts({})}
                className="w-full py-3 rounded-2xl border border-emerald-900/40 text-emerald-700 text-sm transition-all active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                Reset all counters
              </button>
            </>
          )}

          {/* ── 99 Names ── */}
          {active === "names" && (
            <>
              <h2 className="text-xl font-bold text-sky-300 mb-4">✨ Names of Allah</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {NAMES_OF_ALLAH.map(n => (
                  <div key={n.name} className="rounded-2xl border border-sky-900/30 p-4 text-center"
                    style={{ background: "rgba(56,189,248,0.06)" }}>
                    <p className="text-xl text-sky-300" style={{ fontFamily: "'Amiri', serif" }}>{n.arabic}</p>
                    <p className="text-white text-xs font-bold mt-2">{n.name}</p>
                    <p className="text-sky-700 text-xs mt-0.5">{n.meaning}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-emerald-800 text-xs">Allah has 99 beautiful names. Learn them all!</p>
            </>
          )}

          {/* ── Prophet Stories ── */}
          {active === "stories" && (
            <>
              <h2 className="text-xl font-bold text-pink-300 mb-4">🌟 Prophet Stories</h2>
              <div className="space-y-4">
                {PROPHET_STORIES.map(s => (
                  <div key={s.prophet} className="rounded-3xl border border-pink-900/30 overflow-hidden"
                    style={{ background: "rgba(244,114,182,0.05)" }}>
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{s.emoji}</span>
                        <p className="text-pink-300 font-bold text-lg">Prophet {s.prophet}</p>
                      </div>
                      <p className="text-emerald-200/80 text-sm leading-relaxed">{s.story}</p>
                      <div className="flex items-start gap-2 rounded-2xl px-3 py-2"
                        style={{ background: "rgba(244,114,182,0.1)" }}>
                        <Star className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-amber-300 text-sm italic">{s.lesson}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Daily Duas ── */}
          {active === "dua" && (
            <>
              <h2 className="text-xl font-bold text-orange-300 mb-4">🤲 Duas for Kids</h2>
              <div className="space-y-4">
                {DAILY_DUAS_KIDS.map(d => (
                  <div key={d.when} className="rounded-3xl border border-orange-900/30 p-5 space-y-3"
                    style={{ background: "rgba(251,146,60,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{d.emoji}</span>
                      <p className="text-orange-300 font-bold text-sm">{d.when}</p>
                    </div>
                    <p className="text-right text-lg leading-loose" dir="rtl"
                      style={{ color: "#e8f5ee", fontFamily: "'Amiri', serif" }}>{d.arabic}</p>
                    <p className="text-emerald-500 text-sm italic">{d.trans}</p>
                    <p className="text-emerald-700 text-sm">{d.meaning}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
