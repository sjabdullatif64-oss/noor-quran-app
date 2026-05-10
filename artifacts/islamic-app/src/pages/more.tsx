import { useLocation } from "wouter";
import {
  Navigation,
  Heart,
  Hash,
  Gift,
  Settings,
  Download,
  Bookmark,
  ChevronRight,
  Bell,
  Info,
  Share2,
} from "lucide-react";
import { BannerAd } from "@/components/banner-ad";
import { useToast } from "@/hooks/use-toast";

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
}

const ITEMS: MoreItem[] = [
  {
    id: "qibla",
    label: "Qibla Direction",
    description: "Find direction to Makkah",
    icon: <Navigation className="w-6 h-6" />,
    href: "/qibla",
    accent: "text-amber-300",
    iconBg: "rgba(217,119,6,0.18)",
  },
  {
    id: "favorites",
    label: "Favorites",
    description: "Saved Surahs & Ayahs",
    icon: <Heart className="w-6 h-6" />,
    href: "/favorites",
    accent: "text-rose-300",
    iconBg: "rgba(244,63,94,0.18)",
  },
  {
    id: "tasbeeh",
    label: "Tasbeeh Counter",
    description: "Dhikr & tasbih tracker",
    icon: <Hash className="w-6 h-6" />,
    href: "/tasbeeh",
    accent: "text-emerald-300",
    iconBg: "rgba(52,211,153,0.15)",
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    description: "Reading bookmarks",
    icon: <Bookmark className="w-6 h-6" />,
    href: "/bookmarks",
    accent: "text-sky-300",
    iconBg: "rgba(56,189,248,0.15)",
  },
  {
    id: "gifts",
    label: "Islamic Gifts",
    description: "Greeting cards & duas",
    icon: <Gift className="w-6 h-6" />,
    href: "/islamic-gifts",
    accent: "text-purple-300",
    iconBg: "rgba(168,85,247,0.15)",
  },
  {
    id: "downloads",
    label: "Downloads",
    description: "Offline content",
    icon: <Download className="w-6 h-6" />,
    href: "/downloads",
    accent: "text-teal-300",
    iconBg: "rgba(45,212,191,0.15)",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Prayer & Quran reminders",
    icon: <Bell className="w-6 h-6" />,
    href: "/notifications",
    accent: "text-yellow-300",
    iconBg: "rgba(234,179,8,0.15)",
  },
  {
    id: "settings",
    label: "Settings",
    description: "App preferences",
    icon: <Settings className="w-6 h-6" />,
    href: "/settings",
    accent: "text-slate-300",
    iconBg: "rgba(148,163,184,0.15)",
  },
  {
    id: "about",
    label: "About Noor Quran",
    description: "App info, version & privacy",
    icon: <Info className="w-6 h-6" />,
    href: "/about",
    accent: "text-emerald-300",
    iconBg: "rgba(52,211,153,0.12)",
  },
];

export function More() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

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

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="px-6 pt-8 pb-5">
        <h1 className="text-3xl font-serif font-bold text-emerald-300">More</h1>
        <p className="text-emerald-600 text-sm mt-1">All features & tools</p>
      </div>

      {/* Share App — prominent card */}
      <div className="px-4 mb-4">
        <button
          onClick={handleShare}
          className="w-full flex items-center gap-4 p-5 rounded-2xl border border-emerald-700/40 text-left transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, rgba(26,92,56,0.5) 0%, rgba(13,61,36,0.4) 100%)",
            boxShadow: "0 0 24px rgba(52,211,153,0.08)",
          }}
          data-testid="more-share-app"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-emerald-300"
            style={{ background: "rgba(52,211,153,0.18)" }}
          >
            <Share2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">Share Noor Quran</p>
            <p className="text-emerald-500 text-sm mt-0.5">Invite friends via WhatsApp, Telegram & more</p>
          </div>
          <span className="text-emerald-600 text-xs px-2 py-1 rounded-full border border-emerald-800/40 shrink-0">
            Share
          </span>
        </button>
      </div>

      {/* Feature grid */}
      <div className="px-4 grid grid-cols-1 gap-3">
        {ITEMS.map((item, i) => (
          <button
            key={item.id}
            onClick={() => navigate(item.href)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-emerald-900/40 text-left transition-all active:scale-[0.98]"
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
              <p className="text-white font-semibold text-base">{item.label}</p>
              <p className="text-emerald-600 text-sm mt-0.5 truncate">{item.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-800 shrink-0" />
          </button>
        ))}
      </div>

      {/* AdMob banner */}
      <BannerAd placement="inline" className="mx-4 mt-6 rounded-xl overflow-hidden" />

      {/* Footer */}
      <p className="text-center text-emerald-900 text-xs mt-6 pb-4">
        Noor Quran · Made with ❤️ for the Ummah
      </p>
    </div>
  );
}
