import { Link } from "wouter";
import {
  ChevronLeft, Share2, Shield, Mail, BookOpen, Clock, Heart,
  Bookmark, Download, Hash, Bell, Compass, Sparkles, Globe, Volume2, Gift, PenLine,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const APP_SHARE_URL = "https://play.google.com/store/apps/details?id=com.sj64noorquran";
const APP_SHARE_MSG =
  "Download Noor Quran - Quran, Prayer Times, Islamic Features & More.\nA beautiful Islamic app for daily Muslim life.";

// ── Feature cards ─────────────────────────────────────────────────────────────
interface Feature {
  icon: React.ReactNode;
  label: string;
  description: string;
  accent: string;
  bg: string;
}

const FEATURES: Feature[] = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    label: "Quran Reading",
    description: "Full Arabic text with beautiful typography",
    accent: "text-emerald-300",
    bg: "rgba(52,211,153,0.12)",
  },
  {
    icon: <Volume2 className="w-5 h-5" />,
    label: "Audio Playback",
    description: "Al-Afasy recitation + translation voice",
    accent: "text-sky-300",
    bg: "rgba(56,189,248,0.12)",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    label: "Prayer Times",
    description: "Accurate times for any city worldwide",
    accent: "text-rose-300",
    bg: "rgba(244,63,94,0.12)",
  },
  {
    icon: <Bell className="w-5 h-5" />,
    label: "Notifications",
    description: "Daily ayah, azkar & prayer reminders",
    accent: "text-yellow-300",
    bg: "rgba(234,179,8,0.12)",
  },
  {
    icon: <Heart className="w-5 h-5" />,
    label: "Favorites",
    description: "Save your beloved surahs & ayahs",
    accent: "text-pink-300",
    bg: "rgba(236,72,153,0.12)",
  },
  {
    icon: <Bookmark className="w-5 h-5" />,
    label: "Bookmarks",
    description: "Mark your reading position easily",
    accent: "text-blue-300",
    bg: "rgba(96,165,250,0.12)",
  },
  {
    icon: <Download className="w-5 h-5" />,
    label: "Downloads",
    description: "Offline Quran text & audio storage",
    accent: "text-teal-300",
    bg: "rgba(45,212,191,0.12)",
  },
  {
    icon: <Gift className="w-5 h-5" />,
    label: "Islamic Gifts",
    description: "Beautiful greeting cards & duas",
    accent: "text-purple-300",
    bg: "rgba(168,85,247,0.12)",
  },
  {
    icon: <PenLine className="w-5 h-5" />,
    label: "Islamic Writing",
    description: "Personal notes, duas & Quran reflections",
    accent: "text-lime-300",
    bg: "rgba(132,204,22,0.12)",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    label: "Updates System",
    description: "Live news & announcements",
    accent: "text-amber-300",
    bg: "rgba(217,119,6,0.12)",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    label: "10 Languages",
    description: "Urdu, English, Sindhi, Hindi & more",
    accent: "text-cyan-300",
    bg: "rgba(34,211,238,0.12)",
  },
  {
    icon: <Compass className="w-5 h-5" />,
    label: "Qibla Direction",
    description: "Live compass pointing to Makkah",
    accent: "text-orange-300",
    bg: "rgba(249,115,22,0.12)",
  },
  {
    icon: <Hash className="w-5 h-5" />,
    label: "Tasbeeh Counter",
    description: "Track your daily dhikr & tasbih",
    accent: "text-violet-300",
    bg: "rgba(139,92,246,0.12)",
  },
];

// ── Supported languages ───────────────────────────────────────────────────────
const SUPPORTED_LANGS = [
  { native: "العربية", english: "Arabic",     flag: "🕋" },
  { native: "اردو",    english: "Urdu",        flag: "🇵🇰" },
  { native: "English", english: "English",     flag: "🇬🇧" },
  { native: "سنڌي",   english: "Sindhi",       flag: "🇵🇰" },
  { native: "हिन्दी",  english: "Hindi",        flag: "🇮🇳" },
  { native: "Türkçe",  english: "Turkish",     flag: "🇹🇷" },
  { native: "বাংলা",   english: "Bengali",     flag: "🇧🇩" },
  { native: "Bahasa",  english: "Indonesian",  flag: "🇮🇩" },
  { native: "Français",english: "French",      flag: "🇫🇷" },
  { native: "Español", english: "Spanish",     flag: "🇪🇸" },
];

function shareApp(toast: ReturnType<typeof useToast>["toast"]) {
  const fullText = `${APP_SHARE_MSG}\n\n${APP_SHARE_URL}`;
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title: "Noor Quran", text: APP_SHARE_MSG, url: APP_SHARE_URL }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(fullText).then(() =>
      toast({ title: "Link copied!", description: "Share it with your friends and family." })
    );
  }
}

export function About() {
  const { toast } = useToast();

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-semibold text-emerald-300">About Noor Quran</h1>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center pt-6 pb-8 px-6">
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center mb-5 shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #1a5c38 0%, #0d3d24 60%, #071a0e 100%)",
            boxShadow: "0 0 40px rgba(52,211,153,0.18), 0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <span className="text-6xl select-none">☪️</span>
        </div>
        <h2 className="text-4xl font-serif font-bold text-emerald-300 tracking-tight">Noor Quran</h2>
        <span
          className="mt-2 px-3 py-1 rounded-full text-xs font-medium text-emerald-400 border border-emerald-800/60"
          style={{ background: "rgba(52,211,153,0.07)" }}
        >
          Version 1.0.0
        </span>
        <p className="text-emerald-700 text-sm mt-2 font-arabic tracking-wide">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-center text-emerald-600 text-sm mt-5 leading-relaxed max-w-xs">
          A modern Islamic companion app designed to help Muslims in their daily spiritual journey —
          Quran, prayer times, reminders, and more, all in one beautiful experience.
        </p>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-emerald-900/40 mb-6" />

      <div className="px-5 space-y-6">

        {/* ── Features section ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Features</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-900/40 transition-all hover:border-emerald-700/50"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  animation: "fadeSlideUp 0.4s ease both",
                  animationDelay: `${i * 35}ms`,
                }}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.accent}`}
                  style={{ background: f.bg }}
                >
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold leading-tight">{f.label}</p>
                  <p className="text-emerald-700 text-xs mt-0.5 leading-snug">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Islamic Writing shortcut ── */}
        <Link href="/writing">
          <div
            className="flex items-center gap-4 p-5 rounded-2xl border border-lime-800/40 transition-all hover:border-lime-600/40 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(63,98,18,0.3) 0%, rgba(34,61,9,0.3) 100%)",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lime-300"
              style={{ background: "rgba(132,204,22,0.18)" }}
            >
              <PenLine className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base">Islamic Writing</p>
              <p className="text-lime-700 text-sm mt-0.5">Write duas, Quran reflections & personal notes</p>
            </div>
            <ChevronLeft className="w-5 h-5 text-lime-800 rotate-180 shrink-0" />
          </div>
        </Link>

        {/* ── Multi-language support section ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-emerald-500" />
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">
              Multi Language Support
            </p>
          </div>
          <div
            className="rounded-2xl border border-emerald-900/40 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="p-3 grid grid-cols-2 gap-1">
              {SUPPORTED_LANGS.map((lang) => (
                <div
                  key={lang.english}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(52,211,153,0.04)" }}
                >
                  <span className="text-lg leading-none">{lang.flag}</span>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold leading-tight">{lang.english}</p>
                    <p className="text-emerald-700 text-[10px] leading-tight">{lang.native}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-emerald-900/30">
              <p className="text-emerald-700 text-xs text-center">
                Arabic text always shown · Translation switches instantly
              </p>
            </div>
          </div>
        </div>

        {/* ── Developer info ── */}
        <div
          className="rounded-2xl border border-emerald-900/40 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <div className="px-4 py-2.5 border-b border-emerald-900/30">
            <p className="text-emerald-500 text-xs font-semibold uppercase tracking-wider">Developer</p>
          </div>
          <div className="p-4 space-y-2.5">
            <InfoRow label="Developer" value="SJ64 Studios"      />
            <InfoRow label="Package"   value="com.sj64noorquran" />
            <InfoRow label="Platform"  value="Android · Web"     />
            <InfoRow label="Category"  value="Islamic / Religion" />
            <InfoRow label="Languages" value="10 translations"   />
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="space-y-3 pb-4">
          <ActionButton
            icon={<Share2 className="w-5 h-5" />}
            label="Share Noor Quran"
            sublabel="Spread the word with friends & family"
            accent="text-emerald-400"
            bg="rgba(52,211,153,0.1)"
            border="border-emerald-800/50"
            onClick={() => shareApp(toast)}
            testId="button-about-share"
          />
          <ActionButton
            icon={<Mail className="w-5 h-5" />}
            label="Contact Us"
            sublabel="Feedback, suggestions & support"
            accent="text-sky-400"
            bg="rgba(56,189,248,0.08)"
            border="border-sky-900/40"
            onClick={() =>
              window.open("mailto:support@sj64studios.com?subject=Noor Quran Feedback", "_blank")
            }
            testId="button-about-contact"
          />
          <Link href="/privacy-policy" data-testid="button-about-privacy">
            <ActionButton
              icon={<Shield className="w-5 h-5" />}
              label="Privacy Policy"
              sublabel="How we handle your data"
              accent="text-amber-400"
              bg="rgba(217,119,6,0.08)"
              border="border-amber-900/40"
            />
          </Link>
        </div>

        <p className="text-center text-emerald-900 text-xs pb-6">
          Noor Quran © 2025 · Made with ❤️ for the Ummah
        </p>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-emerald-700 text-sm">{label}</span>
      <span className="text-emerald-300 text-sm font-medium">{value}</span>
    </div>
  );
}

function ActionButton({
  icon, label, sublabel, accent, bg, border, onClick, testId,
}: {
  icon: React.ReactNode; label: string; sublabel: string; accent: string;
  bg: string; border: string; onClick?: () => void; testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border ${border} text-left transition-all active:scale-[0.98] hover:opacity-90`}
      style={{ background: bg }}
      data-testid={testId}
    >
      <span className={`${accent} shrink-0`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">{label}</p>
        <p className="text-emerald-700 text-xs mt-0.5">{sublabel}</p>
      </div>
      <ChevronLeft className="w-4 h-4 text-emerald-800 rotate-180 shrink-0" />
    </button>
  );
}
