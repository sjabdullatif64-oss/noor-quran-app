import { useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, Shield, Wifi, HardDrive, Bell,
  MapPin, Volume2, DollarSign, Lock, Mail, BookOpen,
} from "lucide-react";

const SECTIONS = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Information We Collect",
    accent: "text-emerald-400",
    bg: "rgba(52,211,153,0.07)",
    border: "border-emerald-800/40",
    body: (
      <>
        Noor Quran does <strong className="text-emerald-300">not</strong> collect any personally
        identifiable information (PII) such as your name, email address, or phone number. The
        only data stored is your in-app preferences — chosen language, city, dark-mode setting,
        bookmarks, and favorites — and these are stored <em>locally on your device only</em>.
        No personal data is ever transmitted to our servers.
      </>
    ),
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Location Permission",
    accent: "text-sky-400",
    bg: "rgba(56,189,248,0.07)",
    border: "border-sky-900/40",
    body: (
      <>
        The app may request access to your device&apos;s GPS location to automatically detect
        your city and calculate accurate <strong className="text-sky-300">Prayer Times</strong>{" "}
        and <strong className="text-sky-300">Qibla direction</strong>. Your precise coordinates
        are used solely for this calculation and are never uploaded, stored on a remote server,
        or shared with third parties. You can also enter your city manually at any time without
        granting location permission.
      </>
    ),
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: "Notification Permission",
    accent: "text-amber-400",
    bg: "rgba(217,119,6,0.07)",
    border: "border-amber-900/40",
    body: (
      <>
        If you enable Islamic reminders (Dhikr, prayer alerts), the app requests notification
        permission from your device. All notifications are{" "}
        <strong className="text-amber-300">scheduled locally</strong> — no push-notification
        service or external server is involved. Turning off notifications in your device settings
        will stop all reminders immediately.
      </>
    ),
  },
  {
    icon: <Volume2 className="w-5 h-5" />,
    title: "Quran Audio Streaming",
    accent: "text-purple-400",
    bg: "rgba(168,85,247,0.07)",
    border: "border-purple-900/40",
    body: (
      <>
        Audio recitations are streamed on-demand from{" "}
        <strong className="text-purple-300">cdn.islamic.network</strong>, a trusted public
        Islamic CDN. When you play or download an ayah, a standard HTTP request is sent to
        fetch the audio file. No account, login, or personal identifier is attached to these
        requests. Downloaded audio is saved locally in your browser&apos;s IndexedDB for
        offline use and never shared.
      </>
    ),
  },
  {
    icon: <DollarSign className="w-5 h-5" />,
    title: "Advertising — Google AdMob",
    accent: "text-rose-400",
    bg: "rgba(244,63,94,0.07)",
    border: "border-rose-900/40",
    body: (
      <>
        To support the free development of Noor Quran, ads provided by{" "}
        <strong className="text-rose-300">Google AdMob</strong> may be displayed when the app
        runs as a native Android application. Google may use your device&apos;s advertising ID
        (GAID) for ad personalisation in accordance with Google&apos;s Privacy Policy. You can
        opt out of personalised ads through your Android device settings under{" "}
        <em>Google &rarr; Ads</em>. The web version of Noor Quran does not serve AdMob ads.
      </>
    ),
  },
  {
    icon: <HardDrive className="w-5 h-5" />,
    title: "Local Storage & Offline Data",
    accent: "text-teal-400",
    bg: "rgba(20,184,166,0.07)",
    border: "border-teal-900/40",
    body: (
      <>
        Bookmarks, favorites, Tasbeeh counts, notification preferences, downloaded surah text,
        and language settings are stored in your browser&apos;s{" "}
        <strong className="text-teal-300">localStorage</strong> and{" "}
        <strong className="text-teal-300">IndexedDB</strong>. This data remains entirely on
        your device. Clearing your browser/app data will erase these preferences.
      </>
    ),
  },
  {
    icon: <Wifi className="w-5 h-5" />,
    title: "Third-Party API Usage",
    accent: "text-indigo-400",
    bg: "rgba(99,102,241,0.07)",
    border: "border-indigo-900/40",
    body: (
      <>
        Noor Quran fetches Quran text and translations from{" "}
        <strong className="text-indigo-300">api.alquran.cloud</strong> and prayer times from{" "}
        <strong className="text-indigo-300">api.aladhan.com</strong>. These are free public
        Islamic APIs. Requests include only query parameters (surah number, city name, etc.) —
        no personal identifiers are appended.
      </>
    ),
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Data Security & Sharing",
    accent: "text-green-400",
    bg: "rgba(74,222,128,0.07)",
    border: "border-green-900/40",
    body: (
      <>
        Noor Quran does <strong className="text-green-300">not</strong> sell, rent, or share
        your personal data with any third party beyond the service providers described above.
        We have no analytics SDK, crash-reporting service, or tracking library embedded in
        the app. Your usage of this app remains private.
      </>
    ),
  },
];

const THIRD_PARTY = [
  { name: "AlQuran Cloud API",       url: "https://alquran.cloud/terms" },
  { name: "Aladhan Prayer Times API", url: "https://aladhan.com/terms-and-conditions" },
  { name: "Google AdMob",             url: "https://policies.google.com/privacy" },
  { name: "Islamic Network CDN",      url: "https://cdn.islamic.network" },
];

export function PrivacyPolicy() {
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    topRef.current?.scrollTo({ top: 0 });
  }, []);

  return (
    <div
      ref={topRef}
      className="min-h-screen pb-32 md:pb-12 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 pt-6 pb-4"
        style={{ background: "linear-gradient(180deg, #071a0e 85%, transparent 100%)" }}
      >
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-emerald-800/50 text-emerald-500 hover:text-emerald-300 hover:border-emerald-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-emerald-300 leading-tight">Privacy Policy</h1>
          <p className="text-emerald-700 text-xs">Noor Quran · com.sj64noorquran</p>
        </div>
        <Shield className="w-5 h-5 text-emerald-700" />
      </div>

      <div className="px-4 space-y-4 max-w-2xl mx-auto">

        {/* Hero card */}
        <div
          className="rounded-2xl p-5 border border-emerald-800/40"
          style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.2), rgba(6,22,16,0.4))" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <p className="text-emerald-300 font-semibold text-base">Our Commitment to You</p>
          </div>
          <p className="text-emerald-500 text-sm leading-relaxed mb-4">
            Noor Quran was built as a free service to the Muslim community. We take your privacy
            seriously — we do not collect personal data, we do not track you, and we do not sell
            your information. This policy explains exactly what we do and do not do.
          </p>
          <div className="border-t border-emerald-900/40 pt-3">
            <p className="text-emerald-700 text-xs font-arabic text-right leading-loose mb-1" dir="rtl">
              وَاللَّهُ يَعْلَمُ مَا تُسِرُّونَ وَمَا تُعْلِنُونَ
            </p>
            <p className="text-emerald-800 text-xs text-right">
              "Allah knows what you conceal and what you reveal." — Quran 16:19
            </p>
          </div>
        </div>

        {/* Policy sections */}
        {SECTIONS.map((s) => (
          <div
            key={s.title}
            className={`rounded-2xl border ${s.border} overflow-hidden`}
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
              style={{ background: s.bg }}
            >
              <span className={s.accent}>{s.icon}</span>
              <p className={`font-semibold text-sm ${s.accent}`}>{s.title}</p>
            </div>
            <p className="text-emerald-500 text-sm leading-relaxed px-4 py-4">{s.body}</p>
          </div>
        ))}

        {/* Children's privacy */}
        <div
          className="rounded-2xl border border-emerald-900/40 p-4"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-emerald-400 text-sm font-semibold mb-2">Children&apos;s Privacy</p>
          <p className="text-emerald-600 text-sm leading-relaxed">
            Noor Quran does not knowingly collect personal information from children under 13.
            The app is designed for general audiences and contains Islamic educational content
            suitable for all ages. No age-gated features or account creation is required.
          </p>
        </div>

        {/* Policy changes */}
        <div
          className="rounded-2xl border border-emerald-900/40 p-4"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-emerald-400 text-sm font-semibold mb-2">Policy Changes</p>
          <p className="text-emerald-600 text-sm leading-relaxed">
            We may update this Privacy Policy occasionally. Any changes will be reflected on
            this page with a revised effective date. Continued use of Noor Quran after changes
            constitutes acceptance of the updated policy.
          </p>
        </div>

        {/* Third-party links */}
        <div
          className="rounded-2xl border border-emerald-900/40 p-4"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-emerald-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Third-Party Privacy Policies
          </p>
          <div className="divide-y divide-emerald-900/20">
            {THIRD_PARTY.map((link) => (
              <button
                key={link.name}
                onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                className="w-full text-left flex justify-between items-center py-2.5"
              >
                <span className="text-emerald-400 text-sm">{link.name}</span>
                <span className="text-emerald-700 text-xs">View Policy →</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div
          className="rounded-2xl border border-emerald-800/50 p-5"
          style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.15), rgba(6,22,16,0.3))" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-emerald-500" />
            <p className="text-emerald-400 text-sm font-semibold">Contact Us</p>
          </div>
          <p className="text-emerald-600 text-sm leading-relaxed mb-3">
            If you have any questions, concerns, or requests regarding this Privacy Policy or
            your data, please reach out to us:
          </p>
          <button
            onClick={() => window.open("mailto:easygroupjoin@gmail.com", "_blank")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-300 border border-emerald-700/50 hover:border-emerald-500 transition-colors"
            style={{ background: "rgba(26,92,56,0.3)" }}
          >
            <Mail className="w-4 h-4" />
            easygroupjoin@gmail.com
          </button>
        </div>

        {/* Effective date */}
        <p className="text-emerald-800 text-xs text-center pt-2">
          Last updated: May 2025 &nbsp;·&nbsp; Effective immediately
        </p>

        {/* Close button */}
        <button
          onClick={() => window.history.back()}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #1a5c38, #0d3d24)" }}
        >
          Close
        </button>

        <p className="text-center text-emerald-900 text-xs pb-4">
          Noor Quran © 2025 · Made with ❤️ for the Ummah
        </p>
      </div>
    </div>
  );
}
