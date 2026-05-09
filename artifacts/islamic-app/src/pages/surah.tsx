import React, { useEffect, useRef } from "react";
import { useSurah } from "@/lib/api";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SurahReader() {
  const params = useParams();
  const number = Number(params.number);
  const { data: surah, isLoading } = useSurah(number);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 border-b border-border">
        <Button variant="ghost" asChild className="mb-4 text-muted-foreground hover:text-foreground">
          <Link href="/quran" data-testid="link-back-quran">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Surahs
          </Link>
        </Button>
        
        {isLoading ? (
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        ) : (
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">{surah?.englishName}</h1>
            <p className="text-muted-foreground">{surah?.englishNameTranslation} • {surah?.revelationType} • {surah?.numberOfAyahs} Verses</p>
            <h2 dir="rtl" className="text-4xl font-arabic text-primary mt-4">{surah?.name}</h2>
          </div>
        )}
      </div>

      {number !== 1 && number !== 9 && !isLoading && (
        <div className="text-center py-8 border-b border-border/50">
          <p dir="rtl" className="text-4xl font-arabic text-primary">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
        </div>
      )}

      <div className="space-y-12 mt-8">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-3/4 ml-auto" />
            </div>
          ))
        ) : (
          surah?.ayahs.map((ayah: any) => (
            <div key={ayah.numberInSurah} className="flex flex-col space-y-6 pb-8 border-b border-border/40 last:border-0" data-testid={`ayah-${ayah.numberInSurah}`}>
              <div className="flex items-start justify-between gap-6 flex-row-reverse">
                <div className="flex-1 text-right space-y-6">
                  <p dir="rtl" className="text-3xl md:text-4xl leading-[2.5] font-arabic text-foreground">
                    {ayah.textAr}
                  </p>
                  <p dir="rtl" className="text-xl md:text-2xl leading-relaxed text-muted-foreground font-serif">
                    {ayah.textUr}
                  </p>
                </div>
                <div className="w-12 h-12 flex-shrink-0 rounded-full border-2 border-primary/20 flex items-center justify-center text-primary font-bold mt-2">
                  {ayah.numberInSurah}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}