import { useState } from "react";
import { ChevronLeft, Shield, Copy, Check, Search } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Dua {
  id: string;
  title: string;
  category: string;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
}

const DUAS: Dua[] = [
  { id: "distress",    category: "Distress",    title: "Relief from Distress",           arabic: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ وَأَصْلِحْ لِي شَأْنِي كُلَّهُ لَا إِلَهَ إِلَّا أَنْتَ", transliteration: "Allahumma rahmataka arju fala takilni ila nafsi tarfata 'aynin wa aslih li sha'ni kullahu la ilaha illa anta", translation: "O Allah, I hope for Your mercy. Do not leave me to myself even for the blink of an eye. Set all my affairs right. There is no god but You.", source: "Sunan Abu Dawud 5090" },
  { id: "anxiety",     category: "Anxiety",     title: "Dua for Anxiety & Worry",        arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ", transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazan, wa a'udhu bika minal-'ajzi wal-kasal", translation: "O Allah, I seek refuge in You from worry and grief, I seek refuge in You from incapacity and laziness.", source: "Sahih Al-Bukhari 6369" },
  { id: "debt",        category: "Hardship",    title: "Relief from Debt & Hardship",    arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ", transliteration: "Allahumma-kfini bihalalika 'an haramika wa aghnini bifadlika 'amman siwak", translation: "O Allah, suffice me with what You have allowed instead of what You have forbidden, and make me independent of all others besides You.", source: "Sunan At-Tirmidhi 3563" },
  { id: "protection",  category: "Protection",  title: "Protection from All Harm",       arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", transliteration: "Bismillahil-ladhi la yadurru ma'a ismihi shay'un fil-ardi wa la fis-sama'i wa huwas-sami'ul-'alim", translation: "In the name of Allah, with Whose name nothing can cause harm in the earth or the heavens, and He is the All-Hearing, All-Knowing.", source: "Sunan Abu Dawud 5088" },
  { id: "illness",     category: "Health",      title: "Cure from Illness",              arabic: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ اشْفِ أَنْتَ الشَّافِي لَا شِفَاءَ إِلَّا شِفَاؤُكَ شِفَاءً لَا يُغَادِرُ سَقَمًا", transliteration: "Allahumma Rabban-nas, adh-hibil-ba's, ishfi antash-shafi, la shifa'a illa shifa'uk, shifa'an la yughadiru saqama", translation: "O Allah, Lord of humanity, remove the harm. Cure, for You are the Healer. There is no cure except Your cure — a cure that leaves no illness behind.", source: "Sahih Al-Bukhari 5675" },
  { id: "fear",        category: "Fear",        title: "When Facing Fear",               arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", transliteration: "Hasbunallahu wa ni'mal-wakil", translation: "Allah is sufficient for us, and He is the best Disposer of affairs.", source: "Quran 3:173 | Sahih Al-Bukhari 4563" },
  { id: "sadness",     category: "Grief",       title: "Dua for Sadness & Grief",        arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", transliteration: "La ilaha illa anta subhanaka inni kuntu minaz-zalimin", translation: "There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.", source: "Quran 21:87 — Dua of Prophet Yunus (AS)" },
  { id: "guidance",    category: "Guidance",    title: "Seeking Allah's Guidance",       arabic: "اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي", transliteration: "Allahumma-hdini wa saddidni", translation: "O Allah, guide me and keep me on the straight path.", source: "Sahih Muslim 2725" },
  { id: "forgiveness", category: "Forgiveness", title: "Sayyidul Istighfar",             arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ", transliteration: "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduk, wa ana 'ala 'ahdika wa wa'dika mas-tata't, a'udhu bika min sharri ma sana't, abu'u laka bini'matika 'alayya wa abu'u bidhanbi faghfir li fa'innahu la yaghfirudh-dhunuba illa ant", translation: "O Allah, You are my Lord, there is no god but You. You created me and I am Your slave. I am upon Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessing upon me and I confess my sin, so forgive me, for none forgives sins but You.", source: "Sahih Al-Bukhari 6306" },
  { id: "travel",      category: "Travel",      title: "Dua Before Travelling",          arabic: "اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ", transliteration: "Allahu Akbar (x3), Subhana-llathi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina lamunqalibun", translation: "Allah is the Greatest (×3). Glory be to the One Who has made this (conveyance) serviceable to us, for we could not have done it ourselves, and indeed to our Lord we shall return.", source: "Sahih Muslim 1342" },
  { id: "night",       category: "Night Dua",   title: "Dua When Waking at Night",       arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa 'ala kulli shay'in qadir", translation: "There is no god but Allah alone, Who has no partner. His is the Dominion and His is the Praise, and He is Able to do all things.", source: "Sahih Al-Bukhari 1154" },
  { id: "hardship-2",  category: "Hardship",    title: "When Affairs Are Difficult",     arabic: "اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا", transliteration: "Allahumma la sahla illa ma ja'altahu sahla, wa anta taj'alul-hazna idha shi'ta sahla", translation: "O Allah, there is no ease except in that which You have made easy, and You make the difficult easy if You wish.", source: "Ibn Hibban 974" },
  { id: "quran-dua",   category: "Quran",       title: "Dua of Prophet Ibrahim (AS)",    arabic: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ", transliteration: "Rabbij'alni muqimas-salati wa min dhurriyyati, Rabbana wa taqabbal du'a'", translation: "My Lord, make me an establisher of prayer, and from my descendants. Our Lord, and accept my supplication.", source: "Quran 14:40" },
  { id: "morning",     category: "Morning",     title: "Morning Protection Dua",         arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", transliteration: "Asbahna wa asbahal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah", translation: "We have reached the morning and at this very time the sovereignty belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah, alone, without any partner.", source: "Sunan Abu Dawud 5078" },
  { id: "dua-qunut",   category: "Prayer",      title: "Dua al-Qunut",                   arabic: "اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ وَعَافِنِي فِيمَنْ عَافَيْتَ وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ وَبَارِكْ لِي فِيمَا أَعْطَيْتَ وَقِنِي شَرَّ مَا قَضَيْتَ", transliteration: "Allahumma-hdini fiman hadayt, wa 'afini fiman 'afayt, wa tawallani fiman tawallayt, wa barik li fima a'tayt, wa qini sharra ma qadayt", translation: "O Allah, guide me along with those whom You have guided. Grant me health along with those whom You have granted health. Be my guardian along with those who You have taken as guardians. Bless me in what You have given me. Protect me from the evil of what You have decreed.", source: "Sunan Abu Dawud 1425" },
];

const CATEGORIES = ["All", ...Array.from(new Set(DUAS.map(d => d.category)))];

const CAT_COLORS: Record<string, string> = {
  Distress: "#f59e0b", Anxiety: "#8b5cf6", Hardship: "#ef4444", Protection: "#1a5c38",
  Health: "#06b6d4", Fear: "#f97316", Grief: "#6366f1", Guidance: "#34d399",
  Forgiveness: "#a855f7", Travel: "#0ea5e9", "Night Dua": "#1e40af", Quran: "#16a34a",
  Morning: "#d97706", Prayer: "#059669",
};

export function EmergencyDuas() {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");
  const [copied, setCopied]     = useState<string | null>(null);
  const { toast } = useToast();

  const filtered = DUAS.filter((d) => {
    const matchCat = category === "All" || d.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || d.translation.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  async function copyDua(dua: Dua) {
    const text = `${dua.arabic}\n\n${dua.translation}\n\n— ${dua.source}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(dua.id);
    toast({ title: "Dua copied!", description: dua.title });
    setTimeout(() => setCopied(null), 2000);
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
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Emergency Duas</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Authentic duas for every situation</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,92,56,0.3)" }}>
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-emerald-900/40"
          style={{ background: "rgba(255,255,255,0.04)" }}>
          <Search className="w-4 h-4 text-emerald-700 shrink-0" />
          <input
            type="text"
            placeholder="Search duas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-emerald-200 placeholder-emerald-800 text-sm outline-none"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 mb-5 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              category === cat
                ? "text-white border-emerald-600"
                : "text-emerald-600 border-emerald-900/40 hover:border-emerald-700"
            }`}
            style={category === cat
              ? { background: "rgba(26,92,56,0.5)" }
              : { background: "rgba(255,255,255,0.03)" }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dua cards */}
      <div className="px-4 space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-emerald-800 text-sm">No duas found for "{search}"</p>
          </div>
        )}
        {filtered.map((dua) => {
          const accentColor = CAT_COLORS[dua.category] ?? "#1a5c38";
          return (
            <div key={dua.id}
              className="rounded-3xl border border-emerald-900/40 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

              <div className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white/80"
                      style={{ background: `${accentColor}33` }}>
                      {dua.category}
                    </span>
                    <h3 className="text-white font-bold text-base mt-2">{dua.title}</h3>
                  </div>
                  <button
                    onClick={() => copyDua(dua)}
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border border-emerald-900/40 transition-all active:scale-95"
                    style={{ background: "rgba(52,211,153,0.08)" }}
                    aria-label="Copy dua"
                  >
                    {copied === dua.id
                      ? <Check className="w-4 h-4 text-emerald-400" />
                      : <Copy className="w-4 h-4 text-emerald-600" />}
                  </button>
                </div>

                {/* Arabic */}
                <p className="text-right leading-loose text-xl"
                  style={{ color: "#e8f5ee", fontFamily: "'Amiri', 'Scheherazade New', serif", direction: "rtl" }}>
                  {dua.arabic}
                </p>

                {/* Transliteration */}
                <p className="text-emerald-500 text-sm italic leading-relaxed">
                  {dua.transliteration}
                </p>

                {/* Translation */}
                <div className="rounded-2xl px-4 py-3 border border-emerald-900/30"
                  style={{ background: "rgba(26,92,56,0.08)" }}>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(200,230,215,0.9)" }}>
                    {dua.translation}
                  </p>
                </div>

                {/* Source */}
                <p className="text-emerald-700 text-xs">📖 {dua.source}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-emerald-900 text-xs mt-8 px-6 pb-4 leading-relaxed">
        All duas are sourced from authentic hadith collections and the Holy Quran.
      </p>
    </div>
  );
}
