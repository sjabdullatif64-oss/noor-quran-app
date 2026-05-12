import { useLocation } from "wouter";
import {
  Navigation, Heart, Hash, Gift, Settings, Download, Bookmark,
  ChevronRight, Bell, Info, Share2, Sparkles, PenLine, Star,
  CalendarDays, Tv, BookOpen, Shield, ListChecks, Target,
  Baby, Radio, Compass, Coins,
} from "lucide-react";
import { BannerAd } from "@/components/banner-ad";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n-context";
import { getCoins } from "@/lib/coins";
import { useState } from "react";

const APP_SHARE_URL = "https://play.google.com/store/apps/details?id=com.sj64noorquran";
const APP_SHARE_MSG =
  "Download Noor Quran - Quran, Prayer Times, Islamic Features & More.\nA beautiful Islamic app for daily Muslim life.";

interface MoreItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  accent: string;
  iconBg: string;
  badge?: string;
}

interface Section {
  title: string;
  emoji: string;
  items: MoreItem[];
}

export function More() {
  const [, navigate] = useLocation();
  const { toast }    = useToast();
  const { t }        = useI18n();
  const coins        = getCoins();

  function handleShare() {
    const fullText = `${APP_SHARE_MSG}\n\n${APP_SHARE_URL}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Noor Quran", text: APP_SHARE_MSG, url: APP_SHARE_URL }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() =>
        toast({ title: "Link copied!", description: "Share Noor Quran with your family & friends." })
      );
    }
  }

  const SECTIONS: Section[] = [
    {
      title: "Live & Media",
      emoji: "📺",
      items: [
        {
          id: "makkah-live",
          label: "Live Makkah & Madinah",
          description: "Watch live streams from the Holy Mosques",
          icon: <Tv className="w-6 h-6" />,
          href: "/makkah-live",
          accent: "text-amber-300",
          iconBg: "rgba(217,119,6,0.18)",
          badge: "LIVE",
        },
        {
          id: "quran-radio",
          label: "Quran Radio",
          description: "Live Islamic radio streams & recitation",
          icon: <Radio className="w-6 h-6" />,
          href: "/quran-radio",
          accent: "text-purple-300",
          iconBg: "rgba(168,85,247,0.18)",
        },
      ],
    },
    {
      title: "Learn & Grow",
      emoji: "📖",
      items: [
        {
          id: "hadith",
          label: "Hadith of the Day",
          description: "30 authentic sayings of the Prophet ﷺ",
          icon: <BookOpen className="w-6 h-6" />,
          href: "/hadith",
          accent: "text-emerald-300",
          iconBg: "rgba(52,211,153,0.18)",
        },
        {
          id: "kids-mode",
          label: "Kids Islamic Mode",
          description: "Arabic alphabet, short surahs & prophet stories",
          icon: <Baby className="w-6 h-6" />,
          href: "/kids-mode",
          accent: "text-pink-300",
          iconBg: "rgba(236,72,153,0.18)",
          badge: "FUN",
        },
        {
          id: "writing",
          label: t("more_writing"),
          description: t("more_writing_sub"),
          icon: <PenLine className="w-6 h-6" />,
          href: "/writing",
          accent: "text-lime-300",
          iconBg: "rgba(132,204,22,0.18)",
        },
      ],
    },
    {
      title: "Track & Achieve",
      emoji: "🎯",
      items: [
        {
          id: "habit-tracker",
          label: "Islamic Habit Tracker",
          description: "Track your 5 prayers, Quran, azkar & more daily",
          icon: <ListChecks className="w-6 h-6" />,
          href: "/habit-tracker",
          accent: "text-teal-300",
          iconBg: "rgba(45,212,191,0.18)",
        },
        {
          id: "quran-goals",
          label: "Quran Reading Goals",
          description: "Set monthly goals & track your Quran progress",
          icon: <Target className="w-6 h-6" />,
          href: "/quran-goals",
          accent: "text-sky-300",
          iconBg: "rgba(56,189,248,0.18)",
        },
      ],
    },
    {
      title: "Essential Tools",
      emoji: "🧰",
      items: [
        {
          id: "islamic-calendar",
          label: t("more_islamic_calendar"),
          description: t("more_islamic_calendar_sub"),
          icon: <CalendarDays className="w-6 h-6" />,
          href: "/islamic-calendar",
          accent: "text-teal-300",
          iconBg: "rgba(45,212,191,0.18)",
        },
        {
          id: "qibla",
          label: t("more_qibla"),
          description: t("more_qibla_sub"),
          icon: <Navigation className="w-6 h-6" />,
          href: "/qibla",
          accent: "text-amber-300",
          iconBg: "rgba(217,119,6,0.18)",
        },
        {
          id: "tasbeeh",
          label: t("more_tasbeeh"),
          description: t("more_tasbeeh_sub"),
          icon: <Hash className="w-6 h-6" />,
          href: "/tasbeeh",
          accent: "text-emerald-300",
          iconBg: "rgba(52,211,153,0.15)",
        },
        {
          id: "favorites",
          label: t("more_favorites"),
          description: t("more_favorites_sub"),
          icon: <Heart className="w-6 h-6" />,
          href: "/favorites",
          accent: "text-rose-300",
          iconBg: "rgba(244,63,94,0.18)",
        },
        {
          id: "bookmarks",
          label: t("more_bookmarks"),
          description: t("more_bookmarks_sub"),
          icon: <Bookmark className="w-6 h-6" />,
          href: "/bookmarks",
          accent: "text-sky-300",
          iconBg: "rgba(56,189,248,0.15)",
        },
        {
          id: "gifts",
          label: t("more_gifts"),
          description: t("more_gifts_sub"),
          icon: <Gift className="w-6 h-6" />,
          href: "/islamic-gifts",
          accent: "text-purple-300",
          iconBg: "rgba(168,85,247,0.15)",
        },
        {
          id: "downloads",
          label: t("more_downloads"),
          description: t("more_downloads_sub"),
          icon: <Download className="w-6 h-6" />,
          href: "/downloads",
          accent: "text-teal-300",
          iconBg: "rgba(45,212,191,0.15)",
        },
      ],
    },
    {
      title: "Emergency & Travel",
      emoji: "🛡️",
      items: [
        {
          id: "emergency-duas",
          label: "Emergency Duas Pack",
          description: "15 authentic duas for distress, illness & hardship",
          icon: <Shield className="w-6 h-6" />,
          href: "/emergency-duas",
          accent: "text-red-300",
          iconBg: "rgba(239,68,68,0.15)",
        },
        {
          id: "qibla-travel",
          label: "Offline Qibla Compass",
          description: "Works without internet anywhere in the world",
          icon: <Compass className="w-6 h-6" />,
          href: "/qibla",
          accent: "text-amber-300",
          iconBg: "rgba(217,119,6,0.15)",
          badge: "OFFLINE",
        },
      ],
    },
    {
      title: "Coming Soon",
      emoji: "🚀",
      items: [
        {
          id: "discover",
          label: "Discover New Features",
          description: "AI duas, leaderboard, prayer map, Tajweed AI & more",
          icon: <Sparkles className="w-6 h-6" />,
          href: "/discover",
          accent: "text-amber-300",
          iconBg: "rgba(251,191,36,0.18)",
          badge: "16 SOON",
        },
      ],
    },
    {
      title: "App",
      emoji: "⚙️",
      items: [
        {
          id: "notifications",
          label: t("more_notif_item"),
          description: t("more_notif_sub"),
          icon: <Bell className="w-6 h-6" />,
          href: "/notifications",
          accent: "text-yellow-300",
          iconBg: "rgba(234,179,8,0.15)",
        },
        {
          id: "updates",
          label: t("more_updates"),
          description: t("more_updates_sub"),
          icon: <Sparkles className="w-6 h-6" />,
          href: "/updates",
          accent: "text-amber-300",
          iconBg: "rgba(217,119,6,0.18)",
        },
        {
          id: "settings",
          label: t("more_settings"),
          description: t("more_settings_sub"),
          icon: <Settings className="w-6 h-6" />,
          href: "/settings",
          accent: "text-slate-300",
          iconBg: "rgba(148,163,184,0.15)",
        },
        {
          id: "about",
          label: t("more_about"),
          description: t("more_about_sub"),
          icon: <Info className="w-6 h-6" />,
          href: "/about",
          accent: "text-emerald-300",
          iconBg: "rgba(52,211,153,0.12)",
        },
      ],
    },
  ];

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-3xl font-serif font-bold text-emerald-300">{t("more_title")}</h1>
        <p className="text-emerald-600 text-sm mt-1">{t("more_subtitle")}</p>
      </div>

      {/* Coins widget */}
      {coins > 0 && (
        <div className="mx-4 mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-800/40"
          style={{ background: "rgba(217,119,6,0.08)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(251,191,36,0.15)" }}>
            🪙
          </div>
          <div className="flex-1">
            <p className="text-amber-300 font-bold text-sm">{coins} Noor Coins</p>
            <p className="text-amber-700 text-xs">Earned by reading Quran & completing habits</p>
          </div>
        </div>
      )}

      {/* Share + Rate */}
      <div className="px-4 mb-5 flex flex-col gap-3">
        <button
          onClick={handleShare}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border border-emerald-700/40 text-left transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, rgba(26,92,56,0.5) 0%, rgba(13,61,36,0.4) 100%)",
            boxShadow: "0 0 24px rgba(52,211,153,0.08)",
          }}
          data-testid="more-share-app"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-emerald-300"
            style={{ background: "rgba(52,211,153,0.18)" }}>
            <Share2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">{t("more_share")}</p>
            <p className="text-emerald-500 text-sm mt-0.5">{t("more_share_sub")}</p>
          </div>
          <span className="text-emerald-600 text-xs px-2 py-1 rounded-full border border-emerald-800/40 shrink-0">
            {t("more_share_badge")}
          </span>
        </button>

        <button
          onClick={() => window.open("https://play.google.com/store/apps/details?id=com.sj64noorquran&reviewId=0", "_blank", "noopener,noreferrer")}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border border-amber-700/40 text-left transition-all active:scale-[0.98] hover:border-amber-600/60"
          style={{
            background: "linear-gradient(135deg, rgba(120,80,0,0.35) 0%, rgba(80,50,0,0.28) 100%)",
            boxShadow: "0 0 20px rgba(251,191,36,0.06)",
          }}
          data-testid="more-rate-app"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-amber-300"
            style={{ background: "rgba(251,191,36,0.18)" }}>
            <Star className="w-6 h-6 fill-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">{t("more_rate")}</p>
            <p className="text-amber-600 text-sm mt-0.5">{t("more_rate_sub")}</p>
          </div>
          <div className="flex gap-0.5 shrink-0">
            {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
          </div>
        </button>
      </div>

      {/* Sections */}
      <div className="px-4 space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-base">{section.emoji}</span>
              <p className="text-emerald-500 text-xs font-bold uppercase tracking-wider">{section.title}</p>
            </div>
            <div className="space-y-2.5">
              {section.items.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.href)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-emerald-900/40 text-left transition-all active:scale-[0.98] hover:border-emerald-700/40"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    animationDelay: `${i * 40}ms`,
                  }}
                  data-testid={`more-item-${item.id}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.accent}`}
                    style={{ background: item.iconBg }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-base">{item.label}</p>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          item.badge === "LIVE" ? "text-red-400 border-red-800/40 bg-red-900/20" :
                          item.badge === "OFFLINE" ? "text-cyan-400 border-cyan-800/40 bg-cyan-900/20" :
                          item.badge === "FUN" ? "text-pink-400 border-pink-800/40 bg-pink-900/20" :
                          "text-amber-400 border-amber-800/40 bg-amber-900/20"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-600 text-sm mt-0.5 truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-emerald-800 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BannerAd placement="inline" className="mx-4 mt-6 rounded-xl overflow-hidden" />

      <p className="text-center text-emerald-900 text-xs mt-6 pb-4">
        {t("more_footer")}
      </p>
    </div>
  );
}
