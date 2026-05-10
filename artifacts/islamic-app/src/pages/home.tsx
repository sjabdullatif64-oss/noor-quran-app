import React, { useEffect, useState } from "react";
import { usePrayerTimes, useRandomAyah } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { getCity, getCountry } from "@/lib/settings";

export function Home() {
  const [city] = useState(() => getCity());
  const [country] = useState(() => getCountry());
  const { data: prayerData, isLoading: prayerLoading } = usePrayerTimes(city, country);
  const { data: ayahData, isLoading: ayahLoading } = useRandomAyah();

  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; diffStr: string } | null>(null);

  useEffect(() => {
    if (!prayerData) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();

      const timings = prayerData.timings;
      const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

      let next = null;
      for (const name of prayerNames) {
        const timeStr = timings[name as keyof typeof timings] as string;
        const [h, m] = timeStr.replace(/ \(.*\)/, "").split(":").map(Number);
        if (h > currentHours || (h === currentHours && m > currentMinutes)) {
          next = { name, time: timeStr.replace(/ \(.*\)/, ""), h, m };
          break;
        }
      }

      if (!next) {
        const timeStr = timings.Fajr.replace(/ \(.*\)/, "");
        const [h, m] = timeStr.split(":").map(Number);
        next = { name: "Fajr", time: timeStr, h: h + 24, m };
      }

      const totalCurrent = currentHours * 3600 + currentMinutes * 60 + currentSeconds;
      const totalNext = next.h * 3600 + next.m * 60;
      let diff = totalNext - totalCurrent;
      const dH = Math.floor(diff / 3600);
      diff %= 3600;
      const dM = Math.floor(diff / 60);
      const dS = diff % 60;

      setNextPrayer({
        name: next.name,
        time: next.time,
        diffStr: `${dH.toString().padStart(2, "0")}:${dM.toString().padStart(2, "0")}:${dS.toString().padStart(2, "0")}`,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [prayerData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">As-salamu alaykum</h1>
        <p className="text-muted-foreground text-lg">Here is your daily overview.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prayer times card */}
        <Card className="bg-primary text-primary-foreground overflow-hidden relative shadow-lg">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] pointer-events-none" />
          <CardContent className="p-8 relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-primary-foreground/80 font-medium">Date</p>
                {prayerLoading ? (
                  <Skeleton className="h-6 w-32 bg-primary-foreground/20" />
                ) : (
                  <>
                    <p className="text-xl font-serif">
                      {prayerData?.date.hijri.day} {prayerData?.date.hijri.month.en} {prayerData?.date.hijri.year}
                    </p>
                    <p className="text-sm text-primary-foreground/80">{prayerData?.date.readable}</p>
                  </>
                )}
              </div>
              <Link
                href="/prayer-times"
                className="flex items-center gap-2 text-primary-foreground/80 bg-primary-foreground/10 px-3 py-1.5 rounded-full text-sm hover:bg-primary-foreground/20 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>{city}</span>
              </Link>
            </div>

            <div className="pt-4 border-t border-primary-foreground/20">
              <p className="text-primary-foreground/80 font-medium mb-2">Next Prayer</p>
              {prayerLoading || !nextPrayer ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-48 bg-primary-foreground/20" />
                  <Skeleton className="h-6 w-32 bg-primary-foreground/20" />
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold font-serif">{nextPrayer.name}</span>
                    <span className="text-xl text-primary-foreground/90 pb-1">{nextPrayer.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-primary-foreground/80">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">{nextPrayer.diffStr} remaining</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ayah of the Day */}
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-8 h-full flex flex-col justify-between space-y-6">
            <p className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Ayah of the Day</p>

            {ayahLoading ? (
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-3/4 ml-auto" />
              </div>
            ) : (
              <div className="space-y-5 flex-1 flex flex-col justify-center">
                <p dir="rtl" className="text-3xl leading-loose font-arabic text-primary text-right">
                  {ayahData?.textAr}
                </p>
                <p dir="rtl" className="text-xl leading-relaxed text-foreground text-right opacity-90 font-serif">
                  {ayahData?.textUr}
                </p>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
                    Surah {ayahData?.surah}, Verse {ayahData?.numberInSurah}
                  </p>
                  {ayahData && (
                    <Link
                      href={`/quran/${ayahData.globalNumber}`}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <BookOpen className="w-4 h-4" />
                      Read
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/quran", label: "Read Quran", icon: "📖" },
          { href: "/prayer-times", label: "Prayer Times", icon: "🕌" },
          { href: "/qibla", label: "Qibla", icon: "🧭" },
          { href: "/tasbeeh", label: "Tasbeeh", icon: "📿" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all text-center"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-medium text-foreground">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
