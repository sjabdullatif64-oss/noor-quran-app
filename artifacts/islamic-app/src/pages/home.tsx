import React, { useEffect, useState } from "react";
import { usePrayerTimes, useRandomAyah } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, BookOpen, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { getCity, getCountry } from "@/lib/settings";
import { BannerAd } from "@/components/banner-ad";
import { useI18n } from "@/lib/i18n-context";
import { getDailyHadith } from "@/lib/hadith-data";
import { getCoins, awardCoins, COIN_EVENTS } from "@/lib/coins";

export function Home() {
  const [city]    = useState(() => getCity());
  const [country] = useState(() => getCountry());
  const { data: prayerData, isLoading: prayerLoading } = usePrayerTimes(city, country);
  const { data: ayahData,   isLoading: ayahLoading }   = useRandomAyah();
  const { t } = useI18n();

  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; diffStr: string } | null>(null);
  const [coins, setCoins]           = useState(() => getCoins());

  const dailyHadith = getDailyHadith();

  // Award daily visit coins once per day
  useEffect(() => {
    const earned = awardCoins("daily_visit", COIN_EVENTS.daily_visit);
    if (earned > 0) setCoins(earned);
  }, []);

  useEffect(() => {
    if (!prayerData) return;

    const interval = setInterval(() => {
      const now            = new Date();
      const currentHours   = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();

      const timings     = prayerData.timings;
      const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

      let next = null;
      for (const name of prayerNames) {
        const timeStr = timings[name as keyof typeof timings] as string;
        const [h, m]  = timeStr.replace(/ \(.*\)/, "").split(":").map(Number);
        if (h > currentHours || (h === currentHours && m > currentMinutes)) {
          next = { name, time: timeStr.replace(/ \(.*\)/, ""), h, m };
          break;
        }
      }

      if (!next) {
        const timeStr = timings.Fajr.replace(/ \(.*\)/, "");
        const [h, m]  = timeStr.split(":").map(Number);
        next = { name: "Fajr", time: timeStr, h: h + 24, m };
      }

      const totalCurrent = currentHours * 3600 + currentMinutes * 60 + currentSeconds;
      const totalNext    = next.h * 3600 + next.m * 60;
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">{t("home_greeting")}</h1>
            <p className="text-muted-foreground text-lg">{t("home_subtitle")}</p>
          </div>
          {/* Coins badge */}
          {coins > 0 && (
            <Link href="/more"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-800/40 shrink-0 transition-all hover:border-amber-600/60"
              style={{ background: "rgba(217,119,6,0.08)" }}>
              <span className="text-base">🪙</span>
              <span className="text-amber-400 font-bold text-sm">{coins}</span>
            </Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prayer times card */}
        <Card className="bg-primary text-primary-foreground overflow-hidden relative shadow-lg">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] pointer-events-none" />
          <CardContent className="p-8 relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-primary-foreground/80 font-medium">{t("home_date")}</p>
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
              <p className="text-primary-foreground/80 font-medium mb-2">{t("home_next_prayer")}</p>
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
                    <span className="font-mono">{nextPrayer.diffStr} {t("home_remaining")}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ayah of the Day */}
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-8 h-full flex flex-col justify-between space-y-6">
            <p className="text-sm font-bold tracking-wider text-muted-foreground uppercase">{t("home_ayah_of_day")}</p>

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
                    {t("home_surah")} {ayahData?.surah}, {t("home_verse")} {ayahData?.numberInSurah}
                  </p>
                  {ayahData && (
                    <Link
                      href={`/quran/${ayahData.globalNumber}`}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <BookOpen className="w-4 h-4" />
                      {t("home_read")}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hadith of the Day mini-card */}
      <Link href="/hadith" className="block group">
        <div
          className="rounded-2xl border border-emerald-200/30 overflow-hidden transition-all group-hover:border-emerald-400/40 shadow-sm"
          style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.06) 0%, rgba(52,211,153,0.04) 100%)" }}
        >
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, transparent, #1a5c38, transparent)" }} />
          <div className="px-5 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-wider text-emerald-600 uppercase">📚 Hadith of the Day</p>
              <ChevronRight className="w-4 h-4 text-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <p
              className="text-right text-lg leading-relaxed text-primary"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", direction: "rtl" }}
            >
              {dailyHadith.arabic}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              "{dailyHadith.english}"
            </p>
            <p className="text-xs text-emerald-500/70">— {dailyHadith.narrator} · {dailyHadith.source}</p>
          </div>
        </div>
      </Link>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/quran",         label: t("home_read_quran"),   icon: "📖" },
          { href: "/prayer-times",  label: t("home_prayer_times"), icon: "🕌" },
          { href: "/habit-tracker", label: "Habit Tracker",        icon: "✅" },
          { href: "/emergency-duas",label: "Emergency Duas",       icon: "🛡️" },
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

      {/* Second row quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/makkah-live",   label: "Makkah Live",     icon: "🕋" },
          { href: "/quran-radio",   label: "Quran Radio",     icon: "🎧" },
          { href: "/kids-mode",     label: "Kids Mode",       icon: "🧒" },
          { href: "/quran-goals",   label: "Quran Goals",     icon: "🎯" },
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

      {/* AdMob banner */}
      <BannerAd placement="fixed-bottom" />
    </div>
  );
}
