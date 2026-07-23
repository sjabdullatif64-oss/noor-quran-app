import { useState, useEffect } from "react";
import { useSurahList } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { Search, Heart, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toggleSurahFav, isSurahFav } from "@/lib/favorites";
import { JUZ_DATA } from "@/lib/juz-data";
import { useI18n } from "@/lib/i18n-context";

export function Quran() {
  const { t } = useI18n();
  const { data: surahs, isLoading } = useSurahList();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [favSet, setFavSet] = useState<Set<number>>(new Set());
  const [popSurah, setPopSurah] = useState<number | null>(null);

  useEffect(() => {
    if (!surahs) return;
    const favs = new Set(surahs.map((s) => s.number).filter((n) => isSurahFav(n)));
    setFavSet(favs);
  }, [surahs]);

  const filteredSurahs = surahs?.filter(
    (s) =>
      s.englishName.toLowerCase().includes(search.toLowerCase()) ||
      s.number.toString().includes(search)
  );

  const handleFav = (e: React.MouseEvent, surah: NonNullable<typeof surahs>[0]) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleSurahFav({
      number: surah.number,
      name: surah.name,
      englishName: surah.englishName,
      englishNameTranslation: surah.englishNameTranslation,
      numberOfAyahs: surah.numberOfAyahs,
    });
    setFavSet((prev) => {
      const next = new Set(prev);
      added ? next.add(surah.number) : next.delete(surah.number);
      return next;
    });
    if (added) {
      setPopSurah(surah.number);
      setTimeout(() => setPopSurah(null), 900);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">{t("quran_title")}</h1>
      </header>

      <Tabs defaultValue="surah">
        <TabsList className="w-full mb-2 bg-muted/60">
          <TabsTrigger value="surah" className="flex-1">{t("quran_tab_surah")}</TabsTrigger>
          <TabsTrigger value="juz" className="flex-1">{t("quran_tab_juz")}</TabsTrigger>
        </TabsList>

        {/* ── Surah Tab ──────────────────────────────────────────── */}
        <TabsContent value="surah" className="mt-0 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder={t("quran_search_placeholder")}
              className="pl-10 bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-quran-search"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSurahs?.map((surah) => {
                const isFav = favSet.has(surah.number);
                const popped = popSurah === surah.number;
                return (
                  <div key={surah.number} className="relative group" data-testid={`surah-card-${surah.number}`}>
                    <Link href={`/quran/${surah.number}`} data-testid={`link-surah-${surah.number}`}>
                      <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer pr-12">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                            {surah.number}
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground">{surah.englishName}</h3>
                            <p className="text-xs text-muted-foreground">{surah.englishNameTranslation}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p dir="rtl" className="font-arabic text-xl text-primary">{surah.name}</p>
                            <p className="text-xs text-muted-foreground">{surah.numberOfAyahs} {t("quran_verses_count")}</p>
                        </div>
                      </div>
                    </Link>

                    {/* Heart button — always visible on mobile */}
                    <button
                      onClick={(e) => handleFav(e, surah)}
                      className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-all
                        ${isFav
                          ? "text-rose-500 opacity-100"
                          : "text-muted-foreground opacity-40 hover:opacity-100 hover:text-rose-400"
                        }`}
                      data-testid={`button-fav-surah-${surah.number}`}
                    >
                      <Heart
                        className={`w-4 h-4 transition-all ${popped ? "scale-150" : "scale-100"} ${isFav ? "fill-rose-500" : ""}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Juz Tab ────────────────────────────────────────────── */}
        <TabsContent value="juz" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {JUZ_DATA.map((juz) => (
              <button
                key={juz.juz}
                onClick={() => navigate(`/juz/${juz.juz}`)}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all text-left w-full"
                data-testid={`juz-card-${juz.juz}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex flex-col items-center justify-center shrink-0 border border-primary/20">
                  <span className="text-primary font-bold text-sm leading-tight">{juz.juz}</span>
                  <span className="text-primary/50 text-[9px] leading-tight font-medium">{t("quran_tab_juz")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    <p className="font-semibold text-foreground text-sm">{juz.surahName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("quran_juz_start_ayah")} {juz.startAyah}</p>
                </div>
                <p dir="rtl" className="font-arabic text-xl text-primary shrink-0">{juz.surahArabic}</p>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
