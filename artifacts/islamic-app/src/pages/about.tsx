import { Link } from "wouter";
import {
  ChevronLeft, Share2, Shield, Mail, BookOpen, Clock, Heart,
  Bookmark, Download, Hash, Bell, Compass, Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const APP_SHARE_URL = "https://play.google.com/store/apps/details?id=com.sj64noorquran";
const APP_SHARE_MSG =
  "Download Noor Quran - Quran, Prayer Times, Islamic Features & More.\nA beautiful Islamic app for daily Muslim life.";

const FEATURES = [
  { icon: <BookOpen className="w-4 h-4" />, label: "Quran Reading",         color: "text-emerald-400" },
  { icon: <Star     className="w-4 h-4" />, label: "Urdu Translation",       color: "text-amber-400"   },
  { icon: <Star     className="w-4 h-4" />, label: "English Translation",    color: "text-sky-400"     },
  { icon: <Clock    className="w-4 h-4" />, label: "Prayer Times",           color: "text-rose-400"    },
  { icon: <Heart    className="w-4 h-4" />, label: "Favorites",              color: "text-pink-400"    },
  { icon: <Bookmark className="w-4 h-4" />, label: "Bookmarks",              color: "text-blue-400"    },
  { icon: <Download className="w-4 h-4" />, label: "Offline Downloads",      color: "text-teal-400"    },
  { icon: <Compass  className="w-4 h-4" />, label: "Qibla Direction",        color: "text-orange-400"  },
  { icon: <Hash     className="w-4 h-4" />, label: "Tasbeeh Counter",        color: "text-purple-400"  },
  { icon: <Bell     className="w-4 h-4" />, label: "Islamic Notifications",  color: "text-yellow-400"  },
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
        <h1 className="text-xl font-semibold text-emerald-300">About</h1>
      </div>

      {/* Hero — Logo + Name */}
      <div className="flex flex-col items-center pt-6 pb-8 px-6">
        {/* Logo */}
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center mb-5 shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #1a5c38 0%, #0d3d24 60%, #071a0e 100%)",
            boxShadow: "0 0 40px rgba(52,211,153,0.18), 0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <span className="text-6xl select-none">☪️</span>
        </div>

        {/* Name */}
        <h2 className="text-4xl font-serif font-bold text-emerald-300 tracking-tight">Noor Quran</h2>
        <span
          className="mt-2 px-3 py-1 rounded-full text-xs font-medium text-emerald-400 border border-emerald-800/60"
          style={{ background: "rgba(52,211,153,0.07)" }}
        >
          Version 1.0.0
        </span>

        {/* Arabic tagline */}
        <p className="text-emerald-700 text-sm mt-2 font-arabic tracking-wide">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>

        {/* Description */}
        <p className="text-center text-emerald-600 text-sm mt-5 leading-relaxed max-w-xs">
          Noor Quran is a modern Islamic app designed to help Muslims in their daily spiritual life. The app
          includes Quran reading, Urdu and English translations, prayer times, bookmarks, favorites, tasbeeh
          tools, Islamic reminders, and more.
        </p>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-emerald-900/40 mb-5" />

      <div className="px-5 space-y-4">

        {/* Features */}
        <Section title="Features">
          <div className="grid grid-cols-2 gap-2 p-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5">
                <span className={`${f.color} shrink-0`}>{f.icon}</span>
                <span className="text-emerald-300 text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Developer */}
        <Section title="Developer">
          <div className="p-4 space-y-2">
            <InfoRow label="Developer" value="SJ64 Studios" />
            <InfoRow label="Package"   value="com.sj64noorquran" />
            <InfoRow label="Platform"  value="Android · Web" />
            <InfoRow label="Category"  value="Islamic / Religion" />
          </div>
        </Section>

        {/* Action buttons */}
        <div className="space-y-3 pb-4">
          {/* Share App */}
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

          {/* Contact */}
          <ActionButton
            icon={<Mail className="w-5 h-5" />}
            label="Contact Us"
            sublabel="Feedback, suggestions & support"
            accent="text-sky-400"
            bg="rgba(56,189,248,0.08)"
            border="border-sky-900/40"
            onClick={() => window.open("mailto:support@sj64studios.com?subject=Noor Quran Feedback", "_blank")}
            testId="button-about-contact"
          />

          {/* Privacy Policy */}
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

        {/* Footer */}
        <p className="text-center text-emerald-900 text-xs pb-6">
          Noor Quran © 2024 · Made with ❤️ for the Ummah
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-emerald-900/40 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="px-4 py-2.5 border-b border-emerald-900/30">
        <p className="text-emerald-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  );
}

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
