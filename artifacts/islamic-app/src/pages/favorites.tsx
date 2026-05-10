import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, Search, Trash2, BookOpen, ChevronLeft } from "lucide-react";
import {
  FavoriteSurah,
  FavoriteAyah,
  getFavSurahs,
  getFavAyahs,
  removeFavSurah,
  removeFavAyah,
} from "@/lib/favorites";
import { Input } from "@/components/ui/input";

type Tab = "surahs" | "ayahs";

export function Favorites() {
  const [tab, setTab] = useState<Tab>("surahs");
  const [surahs, setSurahs] = useState<FavoriteSurah[]>([]);
  const [ayahs, setAyahs] = useState<FavoriteAyah[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSurahs(getFavSurahs().sort((a, b) => b.savedAt - a.savedAt));
    setAyahs(getFavAyahs().sort((a, b) => b.savedAt - a.savedAt));
  }, []);

  const handleRemoveSurah = (number: number) => {
    removeFavSurah(number);
    setSurahs((prev) => prev.filter((s) => s.number !== number));
  };

  const handleRemoveAyah = (surahNumber: number, ayahNumber: number) => {
    removeFavAyah(surahNumber, ayahNumber);
    setAyahs((prev) =>
      prev.filter((a) => !(a.surahNumber === surahNumber && a.ayahNumber === ayahNumber))
    );
  };

  const filteredSurahs = surahs.filter(
    (s) =>
      s.englishName.toLowerCase().includes(query.toLowerCase()) ||
      s.number.toString().includes(query)
  );

  const filteredAyahs = ayahs.filter(
    (a) =>
      a.surahEnglishName.toLowerCase().includes(query.toLowerCase()) ||
      a.textAr.includes(query) ||
      a.textTranslation.toLowerCase().includes(query.toLowerCase())
  );

  const isEmpty = tab === "surahs" ? filteredSurahs.length === 0 : filteredAyahs.length === 0;

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-rose-300">Favorites</h1>
          <p className="text-emerald-700 text-xs mt-0.5">
            {surahs.length} surah{surahs.length !== 1 ? "s" : ""} · {ayahs.length} ayah{ayahs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search favorites…"
            className="pl-9 bg-transparent border-emerald-900/50 text-white placeholder:text-emerald-800 focus-visible:ring-emerald-700"
            data-testid="input-favorites-search"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-5 flex gap-2">
        {(["surahs", "ayahs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
              tab === t
                ? "bg-rose-900/40 text-rose-300 border-rose-800/50"
                : "text-emerald-600 border-emerald-900/40 hover:border-emerald-700"
            }`}
            style={{ background: tab === t ? undefined : "rgba(255,255,255,0.02)" }}
            data-testid={`tab-${t}`}
          >
            {t === "surahs" ? `Surahs (${surahs.length})` : `Ayahs (${ayahs.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {isEmpty ? (
          <EmptyState tab={tab} hasQuery={!!query} />
        ) : tab === "surahs" ? (
          filteredSurahs.map((surah) => (
            <div
              key={surah.number}
              className="group flex items-center gap-4 p-4 rounded-2xl border border-emerald-900/40 hover:border-rose-900/40 transition-all"
              style={{ background: "rgba(255,255,255,0.04)" }}
              data-testid={`fav-surah-${surah.number}`}
            >
              <Link href={`/quran/${surah.number}`} className="flex-1 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-900/30 border border-rose-800/30 flex items-center justify-center text-rose-300 font-bold text-sm shrink-0">
                  {surah.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold">{surah.englishName}</p>
                  <p className="text-emerald-600 text-xs">{surah.englishNameTranslation} · {surah.numberOfAyahs} verses</p>
                </div>
                <p dir="rtl" className="font-arabic text-xl text-rose-300 shrink-0">{surah.name}</p>
              </Link>
              <button
                onClick={() => handleRemoveSurah(surah.number)}
                className="opacity-40 hover:opacity-100 active:opacity-100 transition-opacity w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-900/20 shrink-0"
                data-testid={`button-remove-fav-surah-${surah.number}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          filteredAyahs.map((ayah) => (
            <div
              key={`${ayah.surahNumber}-${ayah.ayahNumber}`}
              className="group flex gap-4 p-4 rounded-2xl border border-emerald-900/40 hover:border-rose-900/40 transition-all"
              style={{ background: "rgba(255,255,255,0.04)" }}
              data-testid={`fav-ayah-${ayah.surahNumber}-${ayah.ayahNumber}`}
            >
              <Link href={`/quran/${ayah.surahNumber}`} className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-rose-900/30 text-rose-300 rounded-full px-2.5 py-0.5 border border-rose-800/30">
                    {ayah.surahEnglishName}
                  </span>
                  <span className="text-xs text-emerald-700">Verse {ayah.ayahNumber}</span>
                </div>
                <p dir="rtl" className="font-arabic text-xl leading-loose text-white text-right">
                  {ayah.textAr}
                </p>
                {ayah.textTranslation && (
                  <p dir="rtl" className="text-sm text-emerald-600 leading-relaxed text-right font-serif line-clamp-2">
                    {ayah.textTranslation}
                  </p>
                )}
              </Link>
              <button
                onClick={() => handleRemoveAyah(ayah.surahNumber, ayah.ayahNumber)}
                className="opacity-40 hover:opacity-100 active:opacity-100 transition-opacity w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-900/20 shrink-0 self-start mt-1"
                data-testid={`button-remove-fav-ayah-${ayah.surahNumber}-${ayah.ayahNumber}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab, hasQuery }: { tab: Tab; hasQuery: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(244,63,94,0.1)" }}>
        <Heart className="w-8 h-8 text-rose-800" />
      </div>
      <div>
        <p className="text-white font-medium">
          {hasQuery ? "No results found" : tab === "surahs" ? "No favorite surahs yet" : "No favorite ayahs yet"}
        </p>
        <p className="text-emerald-700 text-sm mt-1 max-w-xs">
          {hasQuery
            ? "Try a different search term"
            : tab === "surahs"
            ? "Tap the heart icon on any surah to save it here"
            : "Tap the heart icon on any ayah while reading to save it here"}
        </p>
      </div>
      {!hasQuery && (
        <Link
          href="/quran"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-emerald-300 border border-emerald-700/40 hover:border-emerald-500 transition-colors"
          style={{ background: "rgba(52,211,153,0.07)" }}
          data-testid="link-go-quran"
        >
          <BookOpen className="w-4 h-4" />
          Open Quran
        </Link>
      )}
    </div>
  );
}
