import React, { useEffect, useState } from "react";
import { usePrayerTimes, useRandomAyah } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, BookOpen, ChevronRight, Star, Package, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getCity, getCountry } from "@/lib/settings";
import { useI18n } from "@/lib/i18n-context";
import { useQuery } from "@tanstack/react-query";
import { noorApi, type NoorProduct } from "@/lib/noor-api";
import { openUrl } from "@/lib/capacitor";

// ── Islamic Products preview strip ────────────────────────────────────────────
function useProductsPreview() {
  return useQuery({
    queryKey: ["products-home"],
    queryFn: async (): Promise<{ featured: NoorProduct[]; rest: NoorProduct[] }> => {
      const now = new Date().toISOString();
      const [f, a] = await Promise.all([
        noorApi.getFeaturedProducts(),
        noorApi.getProducts(),
      ]);
      const featuredIds = new Set(f.products.map((p) => p.id));
      // Client-side safety filter: hide anything past its expiry
      const activeFeatured = f.products.filter(
        (p) => p.promotionExpiry && p.promotionExpiry > now,
      );
      const rest = a.products.filter(
        (p) => !featuredIds.has(p.id) && (!p.promotionExpiry || p.promotionExpiry > now),
      );
      return { featured: activeFeatured, rest };
    },
    staleTime: 60_000,
    retry: 1,
  });
}

function ProductPreviewCard({ p, featured }: { p: NoorProduct; featured?: boolean }) {
  const [, navigate] = useLocation();
  const hasLink = !!p.productLink?.trim();

  return (
    <div
      className="shrink-0 w-44 rounded-2xl overflow-hidden border flex flex-col transition-all active:scale-[0.97]"
      style={{
        background: featured
          ? "linear-gradient(135deg, rgba(120,80,0,0.3) 0%, rgba(50,30,0,0.25) 100%)"
          : "rgba(255,255,255,0.03)",
        borderColor: featured ? "rgba(180,120,0,0.4)" : "rgba(26,92,56,0.3)",
      }}
    >
      {/* Card body — tap to open marketplace */}
      <button
        className="flex-1 flex flex-col text-left w-full"
        onClick={() => navigate("/marketplace")}
      >
        {p.imageUrl ? (
          <div className="w-full overflow-hidden bg-black/20" style={{ aspectRatio: "4/3" }}>
            <img
              src={p.imageUrl}
              alt={p.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className="w-full flex items-center justify-center"
            style={{ aspectRatio: "4/3", background: "rgba(26,92,56,0.12)" }}
          >
            <Package className="w-8 h-8 text-emerald-900" />
          </div>
        )}
        <div className="px-3 pt-2.5 pb-1 flex flex-col gap-1">
          {featured && (
            <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold">
              <Star className="w-3 h-3 fill-amber-400" /> Featured
            </div>
          )}
          <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{p.title}</p>
          {p.category && (
            <p className="text-emerald-700 text-[10px] font-medium capitalize">
              {p.category.replace("_", " ")}
            </p>
          )}
        </div>
      </button>

      {/* Visit Product button — only when productLink exists */}
      {hasLink && (
        <button
          onClick={() => openUrl(p.productLink!)}
          className="mx-3 mb-2.5 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-800/40 border border-emerald-700/40 text-emerald-300 text-[11px] font-semibold active:scale-95 transition-transform"
        >
          <ExternalLink className="w-3 h-3" /> Visit
        </button>
      )}
    </div>
  );
}

function IslamicProductsStrip() {
  const { data, isLoading } = useProductsPreview();

  const featured = data?.featured ?? [];
  const rest = data?.rest ?? [];
  const visible = [...featured, ...rest].slice(0, 6);

  if (!isLoading && visible.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Islamic Products</h2>
        <Link
          href="/marketplace"
          className="flex items-center gap-0.5 text-sm text-primary hover:underline font-medium"
        >
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-44 rounded-2xl overflow-hidden border border-border"
                style={{ background: "var(--card)" }}
              >
                <div
                  className="w-full animate-pulse"
                  style={{ aspectRatio: "4/3", background: "rgba(26,92,56,0.1)" }}
                />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))
          : visible.map((p) => (
              <ProductPreviewCard
                key={p.id}
                p={p}
                featured={featured.some((f) => f.id === p.id)}
              />
            ))}
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

      {/* Islamic Products strip */}
      <IslamicProductsStrip />

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
