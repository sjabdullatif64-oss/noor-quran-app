import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Bookmark as BookmarkType, getBookmarks, removeBookmark } from "@/lib/bookmarks";
import { FavoriteSurah, getFavSurahs, removeFavSurah } from "@/lib/favorites";
import { Trash2, BookOpen, BookmarkX, Search, BookMarked } from "lucide-react";
import { Input } from "@/components/ui/input";

type Tab = "surahs" | "ayahs";

export function Bookmarks() {
  const [tab, setTab] = useState<Tab>("surahs");
  const [surahs, setSurahs] = useState<FavoriteSurah[]>([]);
  const [ayahs, setAyahs] = useState<BookmarkType[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSurahs(getFavSurahs().sort((a, b) => b.savedAt - a.savedAt));
    setAyahs(getBookmarks().sort((a, b) => b.savedAt - a.savedAt));
  }, []);

  const handleRemoveSurah = (num: number) => {
    removeFavSurah(num);
    setSurahs((p) => p.filter((s) => s.number !== num));
  };

  const handleRemoveAyah = (surahNum: number, ayahNum: number) => {
    removeBookmark(surahNum, ayahNum);
    setAyahs((p) => p.filter((b) => !(b.surahNumber === surahNum && b.ayahNumber === ayahNum)));
  };

  const filteredSurahs = surahs.filter(
    (s) => s.englishName.toLowerCase().includes(query.toLowerCase()) || s.number.toString().includes(query)
  );
  const filteredAyahs = ayahs.filter(
    (b) =>
      b.surahEnglishName.toLowerCase().includes(query.toLowerCase()) ||
      b.textAr.includes(query) ||
      b.textTranslation.toLowerCase().includes(query.toLowerCase())
  );

  const isEmpty = tab === "surahs" ? filteredSurahs.length === 0 : filteredAyahs.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-28 md:pb-8">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary flex items-center gap-3">
          <BookMarked className="w-8 h-8" />
          Bookmarks
        </h1>
        <p className="text-muted-foreground">
          {surahs.length} saved surah{surahs.length !== 1 ? "s" : ""} · {ayahs.length} reading mark{ayahs.length !== 1 ? "s" : ""}
        </p>
      </header>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bookmarks…"
          className="pl-9 bg-card border-border"
          data-testid="input-bookmarks-search"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["surahs", "ayahs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "text-muted-foreground border-border hover:border-primary/40"
            }`}
            data-testid={`tab-bookmarks-${t}`}
          >
            {t === "surahs" ? `Saved Surahs (${surahs.length})` : `Reading Marks (${ayahs.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {isEmpty ? (
        <EmptyState tab={tab} hasQuery={!!query} />
      ) : tab === "surahs" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSurahs.map((surah) => (
            <div
              key={surah.number}
              className="group flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/40 transition-all shadow-sm"
              data-testid={`bm-surah-${surah.number}`}
            >
              <Link href={`/quran/${surah.number}`} className="flex-1 flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {surah.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{surah.englishName}</p>
                  <p className="text-muted-foreground text-xs truncate">
                    {surah.englishNameTranslation} · {surah.numberOfAyahs} verses
                  </p>
                </div>
                <p dir="rtl" className="font-arabic text-xl text-primary shrink-0">{surah.name}</p>
              </Link>
              <button
                onClick={() => handleRemoveSurah(surah.number)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-destructive opacity-40 hover:opacity-100 active:opacity-100 transition-opacity hover:bg-destructive/10 shrink-0"
                data-testid={`button-remove-bm-surah-${surah.number}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAyahs.map((bm) => (
            <div
              key={`${bm.surahNumber}-${bm.ayahNumber}`}
              className="group bg-card border border-border rounded-2xl p-5 space-y-3 hover:border-primary/40 transition-all shadow-sm"
              data-testid={`bm-ayah-${bm.surahNumber}-${bm.ayahNumber}`}
            >
              <div className="flex items-start justify-between gap-4">
                <Link
                  href={`/quran/${bm.surahNumber}`}
                  className="flex-1 space-y-2 hover:opacity-80 transition-opacity"
                  data-testid={`link-bm-surah-${bm.surahNumber}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
                      {bm.surahEnglishName}
                    </span>
                    <span className="text-xs text-muted-foreground">Verse {bm.ayahNumber}</span>
                  </div>
                  <p dir="rtl" className="text-2xl font-arabic leading-loose text-foreground text-right">
                    {bm.textAr}
                  </p>
                  {bm.textTranslation && (
                    <p dir="rtl" className="text-base text-muted-foreground leading-relaxed text-right font-serif line-clamp-3">
                      {bm.textTranslation}
                    </p>
                  )}
                </Link>
                <button
                  onClick={() => handleRemoveAyah(bm.surahNumber, bm.ayahNumber)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-destructive opacity-40 hover:opacity-100 active:opacity-100 transition-opacity hover:bg-destructive/10 shrink-0"
                  data-testid={`button-remove-bm-ayah-${bm.surahNumber}-${bm.ayahNumber}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ tab, hasQuery }: { tab: Tab; hasQuery: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
        <BookmarkX className="w-10 h-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-lg font-medium text-foreground">
          {hasQuery
            ? "No results found"
            : tab === "surahs"
            ? "No saved surahs yet"
            : "No reading marks yet"}
        </p>
        <p className="text-muted-foreground text-sm max-w-xs">
          {hasQuery
            ? "Try a different search term"
            : tab === "surahs"
            ? "Tap the heart icon on any surah to save it here."
            : "Tap the bookmark icon while reading an ayah to save your place."}
        </p>
      </div>
      <Link
        href="/quran"
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        data-testid="link-go-quran"
      >
        <BookOpen className="w-4 h-4" />
        Open Quran
      </Link>
    </div>
  );
}
