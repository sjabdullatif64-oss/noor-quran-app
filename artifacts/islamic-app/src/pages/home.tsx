import React, { useEffect, useState } from "react";
import { usePrayerTimes, useRandomAyah } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, BookOpen, ImageOff, ChevronRight, Play } from "lucide-react";
import { Link } from "wouter";
import { getCity, getCountry } from "@/lib/settings";
import { useI18n } from "@/lib/i18n-context";
import { useQuery } from "@tanstack/react-query";
import { fetchUpdates, resolveImageUrl, UpdateItem, adminData, mergeItems } from "@/lib/updates-data";

// ── Islamic Updates preview strip ─────────────────────────────────────────────
function useUpdatesPreview() {
  return useQuery({
    queryKey: ["updates-home"],
    queryFn: async (): Promise<UpdateItem[]> => {
      let sheetItems: UpdateItem[] = [];
      try { sheetItems = await fetchUpdates(); } catch { /* offline — local items still show */ }
      const localItems = adminData.loadLocal();
      const deletedIds = adminData.loadDeleted();
      const overrides  = adminData.loadOverrides();
      return mergeItems(sheetItems, localItems, deletedIds, overrides);
    },
    staleTime: 60_000,
    retry: 1,
  });
}

function UpdatePreviewCard({ item }: { item: UpdateItem }) {
  const [imgStatus, setImgStatus] = useState<"loading" | "ok" | "error">("loading");
  const resolved = resolveImageUrl(item.image_url);
  const hasVideo = !!item.video_url?.trim();

  return (
    <Link href="/updates"
      className="shrink-0 w-48 rounded-2xl overflow-hidden border border-emerald-900/30 flex flex-col transition-all active:scale-[0.97]"
      style={{ background: "rgba(255,255,255,0.03)" }}>
      {/* Image */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {imgStatus === "loading" && item.image_url && (
          <div className="absolute inset-0 animate-pulse" style={{ background: "rgba(26,92,56,0.15)" }} />
        )}
        {item.image_url && imgStatus !== "error" ? (
          <img
            src={resolved}
            alt={item.title}
            className="w-full h-full object-cover"
            style={{ opacity: imgStatus === "ok" ? 1 : 0, transition: "opacity 0.3s" }}
            onLoad={() => {
              console.log(`[Noor/Home] Image loaded ✓ url="${resolved}"`);
              setImgStatus("ok");
            }}
            onError={() => {
              console.error(
                `[Noor/Home] Image FAILED — resolved="${resolved}"\n` +
                `  → Make sure the Drive file is shared as "Anyone with the link can view"`
              );
              setImgStatus("error");
            }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "rgba(26,92,56,0.12)" }}>
            <ImageOff className="w-6 h-6 text-emerald-900" />
          </div>
        )}
        {hasVideo && imgStatus === "ok" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              <Play className="w-3.5 h-3.5 text-white ml-0.5" />
            </div>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(6,22,16,0.7) 100%)" }} />
      </div>
      {/* Title */}
      <div className="px-3 py-2.5 flex-1 flex flex-col justify-between">
        <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{item.title}</p>
        {item.category && (
          <p className="text-emerald-700 text-[10px] mt-1 font-medium">{item.category}</p>
        )}
      </div>
    </Link>
  );
}

function IslamicUpdatesStrip() {
  const { data: items = [], isLoading } = useUpdatesPreview();
  const visible = items.filter((it) => it.image_url).slice(0, 6);

  if (!isLoading && visible.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Latest Updates</h2>
        <Link href="/updates"
          className="flex items-center gap-0.5 text-sm text-primary hover:underline font-medium">
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shrink-0 w-48 rounded-2xl overflow-hidden border border-border"
                style={{ background: "var(--card)" }}>
                <div className="w-full animate-pulse" style={{ aspectRatio: "16/9", background: "rgba(26,92,56,0.1)" }} />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))
          : visible.map((item) => (
              <UpdatePreviewCard key={item.id || item.title} item={item} />
            ))
        }
      </div>
    </div>
  );
}

// ── Home page ─────────────────────────────────────────────────────────────────
export function Home() {
  const [city]    = useState(() => getCity());
  const [country] = useState(() => getCountry());
  const { data: prayerData, isLoading: prayerLoading } = usePrayerTimes(city, country);
  const { data: ayahData,   isLoading: ayahLoading }   = useRandomAyah();
  const { t } = useI18n();

  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; diffStr: string } | null>(null);

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">{t("home_greeting")}</h1>
        <p className="text-muted-foreground text-lg">{t("home_subtitle")}</p>
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
                      href={`/quran/${ayahData.surahNumber}?ayah=${ayahData.numberInSurah}`}
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

      {/* Islamic Updates strip */}
      <IslamicUpdatesStrip />

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/quran",        label: t("home_read_quran"),   icon: "📖" },
          { href: "/prayer-times", label: t("home_prayer_times"), icon: "🕌" },
          { href: "/qibla",        label: t("home_qibla"),        icon: "🧭" },
          { href: "/tasbeeh",      label: t("home_tasbeeh"),      icon: "📿" },
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
