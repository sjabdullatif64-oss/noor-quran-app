import { useState, useEffect } from "react";
import { useSurahList } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toggleSurahFav, isSurahFav } from "@/lib/favorites";

export function Quran() {
  const { data: surahs, isLoading } = useSurahList();
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">The Noble Quran</h1>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search by name or number..."
            className="pl-10 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-quran-search"
          />
        </div>
      </header>

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
                      <p className="text-xs text-muted-foreground">{surah.numberOfAyahs} Verses</p>
                    </div>
                  </div>
                </Link>

                {/* Heart button */}
                <button
                  onClick={(e) => handleFav(e, surah)}
                  className={`absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-all
                    ${isFav ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                    ${isFav ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"}`}
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
    </div>
  );
}
