import { useLocation } from "wouter";
import {
  Navigation, Heart, Hash, Gift, Settings, Download, Bookmark,
  ChevronRight, Bell, Info, Share2, Sparkles, PenLine, Star,
  CalendarDays, ShoppingBag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n-context";
import { RewardedAdButton } from "@/components/rewarded-ad-button";
import { nativeShare, openUrl, isNative, getLastShareError } from "@/lib/capacitor";

const APP_SHARE_URL = "https://play.google.com/store/apps/details?id=com.sj64noorquran";
const APP_RATE_URL = "https://play.google.com/store/apps/details?id=com.sj64noorquran&reviewId=0";
const APP_RATE_MARKET_URL = "market://details?id=com.sj64noorquran&reviewId=0";
const APP_SHARE_MSG =
  "Download Noor Quran - Quran, Prayer Times, Islamic Features & More.\nA beautiful Islamic app for daily Muslim life.";

export function More() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t }        = useI18n();

  async function handleShare() {
    const result = await nativeShare({
      title:       "Noor Quran",
      text:        APP_SHARE_MSG,
      url:         APP_SHARE_URL,
      dialogTitle: "Share Noor Quran",
    });
    if (result === "failed") {
      toast({
        title: "Share unavailable",
        description: getLastShareError() ?? "Please try again.",
        variant: "destructive",
      });
    }
  }

  function handleRateApp() {
    void openUrl(isNative() ? APP_RATE_MARKET_URL : APP_RATE_URL);
  }

  const ITEMS = [
    {
      id: "marketplace",
      label: t("more_marketplace"),
      description: t("more_marketplace_sub"),
      icon: <ShoppingBag className="w-6 h-6" />,
      href: "/marketplace",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "islamic-calendar",
      label: t("more_islamic_calendar"),
      description: t("more_islamic_calendar_sub"),
      icon: <CalendarDays className="w-6 h-6" />,
      href: "/islamic-calendar",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "writing",
      label: t("more_writing"),
      description: t("more_writing_sub"),
      icon: <PenLine className="w-6 h-6" />,
      href: "/writing",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "qibla",
      label: t("more_qibla"),
      description: t("more_qibla_sub"),
      icon: <Navigation className="w-6 h-6" />,
      href: "/qibla",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "favorites",
      label: t("more_favorites"),
      description: t("more_favorites_sub"),
      icon: <Heart className="w-6 h-6" />,
      href: "/favorites",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "tasbeeh",
      label: t("more_tasbeeh"),
      description: t("more_tasbeeh_sub"),
      icon: <Hash className="w-6 h-6" />,
      href: "/tasbeeh",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "bookmarks",
      label: t("more_bookmarks"),
      description: t("more_bookmarks_sub"),
      icon: <Bookmark className="w-6 h-6" />,
      href: "/bookmarks",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "gifts",
      label: t("more_gifts"),
      description: t("more_gifts_sub"),
      icon: <Gift className="w-6 h-6" />,
      href: "/islamic-gifts",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "downloads",
      label: t("more_downloads"),
      description: t("more_downloads_sub"),
      icon: <Download className="w-6 h-6" />,
      href: "/downloads",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "notifications",
      label: t("more_notif_item"),
      description: t("more_notif_sub"),
      icon: <Bell className="w-6 h-6" />,
      href: "/notifications",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "settings",
      label: t("more_settings"),
      description: t("more_settings_sub"),
      icon: <Settings className="w-6 h-6" />,
      href: "/settings",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "about",
      label: t("more_about"),
      description: t("more_about_sub"),
      icon: <Info className="w-6 h-6" />,
      href: "/about",
      accent: "text-primary",
      iconBg: "bg-primary/10",
    },
  ];

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500 bg-background"
    >
      {/* Header */}
      <div className="px-6 pt-8 pb-5">
        <h1 className="text-3xl font-serif font-bold text-primary">{t("more_title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("more_subtitle")}</p>
      </div>

      {/* Share App + Rate App */}
      <div className="px-4 mb-4 flex flex-col gap-3">
        <button
          onClick={handleShare}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border border-border bg-primary/10 text-left transition-all active:scale-[0.98]"
          data-testid="more-share-app"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-primary bg-primary/15"
          >
            <Share2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-bold text-base">{t("more_share")}</p>
            <p className="text-primary text-sm mt-0.5">{t("more_share_sub")}</p>
          </div>
            <span className="text-muted-foreground text-xs px-2 py-1 rounded-full border border-border shrink-0 bg-card">
            {t("more_share_badge")}
          </span>
        </button>

        <button
          onClick={handleRateApp}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border border-border bg-card text-left transition-all active:scale-[0.98] hover:border-border"
          data-testid="more-rate-app"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-primary bg-primary/10">
            <Star className="w-6 h-6 fill-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-bold text-base">{t("more_rate")}</p>
            <p className="text-muted-foreground text-sm mt-0.5">{t("more_rate_sub")}</p>
          </div>
          <div className="flex gap-0.5 shrink-0">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </button>
      </div>

      {/* Support Noor Quran — Rewarded Ad */}
      <div className="px-4 mb-4">
        <RewardedAdButton />
      </div>

      {/* Feature grid */}
      <div className="px-4 grid grid-cols-1 gap-3">
        {ITEMS.map((item, i) => (
          <button
            key={item.id}
            onClick={() => navigate(item.href)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card text-left transition-all active:scale-[0.98] hover:border-border"
            style={{ animationDelay: `${i * 40}ms` }}
            data-testid={`more-item-${item.id}`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.accent} ${item.iconBg}`}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-base">{item.label}</p>
              <p className="text-muted-foreground text-sm mt-0.5 truncate">{item.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

    </div>
  );
}
