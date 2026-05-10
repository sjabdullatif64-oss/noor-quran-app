import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Shield, Wifi, HardDrive, Bell, DollarSign, Lock } from "lucide-react";

const SECTIONS = [
  {
    icon: <Wifi className="w-5 h-5" />,
    title: "Internet Access",
    body: "Noor Quran uses internet access to fetch Quran text, audio recitations, and prayer times from trusted public Islamic APIs. No personal data is sent over the network beyond standard HTTP requests.",
    accent: "text-sky-400",
    bg: "rgba(56,189,248,0.08)",
  },
  {
    icon: <HardDrive className="w-5 h-5" />,
    title: "Local Storage",
    body: "Bookmarks, favorites, notification settings, download progress, and app preferences are stored locally on your device using browser localStorage and IndexedDB. This data never leaves your device.",
    accent: "text-emerald-400",
    bg: "rgba(52,211,153,0.08)",
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: "Notification Permission",
    body: "If you choose to enable Islamic reminders, the app requests notification permission from your device. Notifications are scheduled locally — no data is sent to any server for push delivery.",
    accent: "text-amber-400",
    bg: "rgba(217,119,6,0.08)",
  },
  {
    icon: <DollarSign className="w-5 h-5" />,
    title: "Advertising (AdMob)",
    body: "To support the development of Noor Quran, the app displays ads provided by Google AdMob when running as a native Android application. Google may use device advertising IDs for ad personalization in accordance with Google's Privacy Policy.",
    accent: "text-rose-400",
    bg: "rgba(244,63,94,0.08)",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Data Security & Sharing",
    body: "Noor Quran does not collect, store on external servers, or sell your personal data to any third party. User data is kept securely on your own device wherever possible.",
    accent: "text-purple-400",
    bg: "rgba(168,85,247,0.08)",
  },
];

export function PrivacyPolicy() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
      ref={scrollRef}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 sticky top-0 z-10"
        style={{ background: "linear-gradient(180deg, #071a0e 80%, transparent 100%)" }}>
        <Link href="/about" className="text-emerald-600 hover:text-emerald-400 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-emerald-300">Privacy Policy</h1>
          <p className="text-emerald-700 text-xs">Noor Quran · com.sj64noorquran</p>
        </div>
        <Shield className="w-5 h-5 text-emerald-700" />
      </div>

      <div className="px-5 space-y-5">

        {/* Intro card */}
        <div
          className="rounded-2xl p-5 border border-emerald-800/40"
          style={{ background: "rgba(52,211,153,0.06)" }}
        >
          <p className="text-emerald-300 font-semibold text-base mb-2">Our Commitment to You</p>
          <p className="text-emerald-600 text-sm leading-relaxed">
            Noor Quran respects user privacy and does not collect personal sensitive information without permission.
            We built this app as a service to the Muslim community — your trust matters to us.
          </p>
          <p className="text-emerald-800 text-xs mt-3 font-arabic text-right">
            وَاللَّهُ يَعْلَمُ مَا تُسِرُّونَ وَمَا تُعْلِنُونَ
          </p>
          <p className="text-emerald-800 text-xs text-right">"Allah knows what you conceal and what you reveal." [Quran 16:19]</p>
        </div>

        {/* Policy sections */}
        <div className="space-y-3">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-emerald-900/40 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.025)" }}
            >
              {/* Section title bar */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b border-emerald-900/30"
                style={{ background: s.bg }}
              >
                <span className={s.accent}>{s.icon}</span>
                <p className={`font-semibold text-sm ${s.accent}`}>{s.title}</p>
              </div>

              {/* Body */}
              <p className="text-emerald-500 text-sm leading-relaxed px-4 py-4">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        {/* Third-party links */}
        <div
          className="rounded-2xl border border-emerald-900/40 p-4"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-emerald-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Third-Party Services
          </p>
          {[
            { name: "AlQuran Cloud API",  url: "https://alquran.cloud/terms" },
            { name: "Aladhan Prayer API", url: "https://aladhan.com/terms-and-conditions" },
            { name: "Google AdMob",       url: "https://policies.google.com/privacy" },
          ].map((link) => (
            <button
              key={link.name}
              onClick={() => window.open(link.url, "_blank")}
              className="w-full text-left flex justify-between items-center py-2 border-b border-emerald-900/20 last:border-0"
            >
              <span className="text-emerald-400 text-sm">{link.name}</span>
              <span className="text-emerald-700 text-xs">Privacy Policy →</span>
            </button>
          ))}
        </div>

        {/* Last updated */}
        <p className="text-emerald-800 text-xs text-center">
          Last updated: January 2025 · Effective immediately
        </p>

        {/* Close / Accept button */}
        <button
          onClick={() => navigate("/about")}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #1a5c38, #0d3d24)" }}
          data-testid="button-privacy-accept"
        >
          I Understand · Close
        </button>

        <p className="text-center text-emerald-900 text-xs pb-6">
          Noor Quran © 2024 · Made with ❤️ for the Ummah
        </p>
      </div>
    </div>
  );
}
