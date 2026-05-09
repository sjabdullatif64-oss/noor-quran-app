import React, { useState } from "react";
import { useSurahList } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Quran() {
  const { data: surahs, isLoading } = useSurahList();
  const [search, setSearch] = useState("");

  const filteredSurahs = surahs?.filter((s) => 
    s.englishName.toLowerCase().includes(search.toLowerCase()) || 
    s.number.toString().includes(search)
  );

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
          {filteredSurahs?.map((surah) => (
            <Link key={surah.number} href={`/quran/${surah.number}`} data-testid={`link-surah-${surah.number}`}>
              <div className="group flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
          ))}
        </div>
      )}
    </div>
  );
}