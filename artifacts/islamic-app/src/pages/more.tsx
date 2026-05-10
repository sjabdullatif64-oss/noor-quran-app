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
} from "lucide-react";

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
    id: "settings",
    label: "Settings",
    description: "App preferences",
    icon: <Settings className="w-6 h-6" />,
    href: "/settings",
    accent: "text-slate-300",
    iconBg: "rgba(148,163,184,0.15)",
  },
];

export function More() {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-3xl font-serif font-bold text-emerald-300">More</h1>
        <p className="text-emerald-600 text-sm mt-1">All features & tools</p>
      </div>

      {/* Grid */}
      <div className="px-4 grid grid-cols-1 gap-3">
        {ITEMS.map((item, i) => (
          <button
            key={item.id}
            onClick={() => navigate(item.href)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-emerald-900/40 text-left transition-all active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.04)",
              animationDelay: `${i * 50}ms`,
            }}
            data-testid={`more-item-${item.id}`}
          >
            {/* Icon */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.accent}`}
              style={{ background: item.iconBg }}
            >
              {item.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-base">{item.label}</p>
              <p className="text-emerald-600 text-sm mt-0.5 truncate">{item.description}</p>
            </div>

            <ChevronRight className="w-5 h-5 text-emerald-800 shrink-0" />
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-emerald-900 text-xs mt-10 pb-4">
        Noor · More features coming soon
      </p>
    </div>
  );
}
