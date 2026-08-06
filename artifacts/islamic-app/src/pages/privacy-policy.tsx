import { useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, Shield, Wifi, HardDrive, Bell,
  MapPin, Volume2, DollarSign, Lock, Mail, BookOpen,
  Globe, Mic,
} from "lucide-react";
import { openUrl } from "@/lib/capacitor";

const SECTIONS = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Information We Collect",
    accent: "text-primary",
    bg: "rgba(52,211,153,0.07)",
    border: "border-border",
    body: (
      <>
        Noor Quran does <strong className="text-primary">not</strong> ask for your name, email
        address, or phone number. Core app preferences — chosen language, city, dark-mode setting,
        bookmarks, and favorites — remain stored locally on your device. If you use AI Teacher,
        the app creates a device-associated account and sends your Teacher progress, practice
        scores, lesson history, and encrypted recovery snapshot to Noor Quran&apos;s server so
        it can be restored after reinstalling the app. We do not sell this data or use it for
        advertising.
      </>
    ),
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: "Automatic Translation Language Selection",
    accent: "text-primary",
    bg: "rgba(52,211,153,0.07)",
    border: "border-border",
    body: (
      <>
        During the first launch, Noor Quran may automatically suggest a default Quran
        translation language based on your device language, region, or country. You can
        change your preferred Quran translation language at any time from{" "}
        <strong className="text-primary">Settings</strong>. Once selected, your preference
        is remembered and always takes priority over automatic detection.
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
        runs as a native Android application. Before your first AI Teacher lesson, the app may
        show a full-screen rewarded advertisement. The ad may be unavailable, may fail to load,
        and is not guaranteed to appear on every device or in every region. Google may process
        device and advertising information, including your device&apos;s advertising ID (GAID),
        for ad delivery, measurement, and personalisation in accordance with Google&apos;s Privacy
        Policy. You can opt out of personalised ads through your Android device settings under{" "}
        <em>Google &rarr; Ads</em>. The web version of Noor Quran does not serve AdMob ads.
      </>
    ),
  },
  {
    icon: <Mic className="w-5 h-5" />,
    title: "AI Teacher Speech Recognition & Pronunciation Assessment",
    accent: "text-violet-400",
    bg: "rgba(139,92,246,0.07)",
    border: "border-violet-900/40",
    body: (
      <>
        AI Teacher requests microphone access only when you choose to start a speech exercise.
        Speech is processed by the device&apos;s speech recognizer using the Arabic (Saudi Arabia)
        setting (<strong className="text-violet-300">ar-SA</strong>). Depending on your device
        and operating-system speech service, spoken responses may be processed by that service to
        produce recognition results. Noor Quran does <strong className="text-violet-300">not
        record, store, or upload raw microphone audio</strong>. The temporary recognized
        transcript is compared with the lesson target to produce an approximate pronunciation
        score, pass/retry result, and automated feedback, then discarded from the active
        recognition flow.
      </>
    ),
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "AI Teacher Progress & Feedback",
    accent: "text-fuchsia-400",
    bg: "rgba(217,70,239,0.07)",
    border: "border-fuchsia-900/40",
    body: (
      <>
        If you use AI Teacher, the app may save your lesson completion status, pronunciation
        scores, practice scores and timestamps, retry and lesson history, revision information,
        and related learning preferences. These records help provide daily lesson limits,
        completed-lesson practice, Smart Revision, progress displays, and recovery after
        reinstalling. The records are associated with a device-linked Teacher identity rather
        than an email/password login account. Encrypted recovery snapshots may be synchronized to
        Noor Quran&apos;s server as described below. Feedback is automated learning guidance and
        should not be treated as a formal religious certification.
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
    icon: <HardDrive className="w-5 h-5" />,
    title: "Data Retention & Deletion",
    accent: "text-amber-400",
    bg: "rgba(217,119,6,0.07)",
    border: "border-amber-900/40",
    body: (
      <>
        Local preferences remain on your device until you clear app storage or uninstall Noor
        Quran. If you use AI Teacher, the encrypted recovery snapshot and associated
        device-linked progress remain on the server to support recovery after reinstalling. Noor
        Quran does not use email accounts, passwords, or user-created login accounts.
      </>
    ),
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Your Choices & Permissions",
    accent: "text-sky-400",
    bg: "rgba(56,189,248,0.07)",
    border: "border-sky-900/40",
    body: (
      <>
        All permissions are optional: <strong className="text-sky-300">Location</strong> (only
        for automatic prayer times and Qibla — you can type your city instead),{" "}
        <strong className="text-sky-300">Microphone</strong> (only for AI Teacher recitation
        checks), and <strong className="text-sky-300">Notifications</strong> (only for Azan and reminders).
        You can grant, deny, or revoke any permission at any time in your device&apos;s app
        settings, and the rest of the app keeps working.
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
      className="min-h-screen pb-32 md:pb-12 animate-in fade-in duration-500 bg-background text-foreground"
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 pt-6 pb-4 bg-background/95 backdrop-blur border-b border-border">
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-border transition-colors bg-card"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground leading-tight">Privacy Policy</h1>
          <p className="text-muted-foreground text-xs">Noor Quran · com.sj64noorquran</p>
        </div>
        <Shield className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="px-4 space-y-4 max-w-2xl mx-auto">

        {/* Hero card */}
        <div
          className="rounded-2xl p-5 border border-border bg-card"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <p className="text-foreground font-semibold text-base">Our Commitment to You</p>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Noor Quran was built as a free service to the Muslim community. We take your privacy
            seriously — we do not ask for email/password accounts, we do not sell your information,
            and we do not use an analytics or tracking SDK. If you use AI Teacher, limited
            device-linked learning records and encrypted recovery data are handled as described
            below. This policy explains exactly what we do and do not do.
          </p>
          <div className="border-t border-border pt-3">
            <p className="text-muted-foreground text-xs font-arabic text-right leading-loose mb-1" dir="rtl">
              وَاللَّهُ يَعْلَمُ مَا تُسِرُّونَ وَمَا تُعْلِنُونَ
            </p>
            <p className="text-muted-foreground text-xs text-right">
              "Allah knows what you conceal and what you reveal." — Quran 16:19
            </p>
          </div>
        </div>

        {/* Policy sections */}
        {SECTIONS.map((s) => (
          <div
            key={s.title}
            className={`rounded-2xl border ${s.border} overflow-hidden bg-card`}
          >
            <div
              className={`flex items-center gap-3 px-4 py-3 border-b border-border ${s.bg}`}
            >
              <span className={s.accent}>{s.icon}</span>
              <p className={`font-semibold text-sm ${s.accent}`}>{s.title}</p>
            </div>
            <p className="text-foreground text-sm leading-relaxed px-4 py-4">{s.body}</p>
          </div>
        ))}

        {/* Children's privacy */}
        <div
          className="rounded-2xl border border-border p-4 bg-card"
        >
          <p className="text-primary text-sm font-semibold mb-2">Children&apos;s Privacy</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Noor Quran does not knowingly collect personal information from children under 13.
            The app is designed for general audiences and contains Islamic educational content
            suitable for all ages. No age-gated features or account creation is required.
          </p>
        </div>

        {/* Policy changes */}
        <div
          className="rounded-2xl border border-border p-4 bg-card"
        >
          <p className="text-primary text-sm font-semibold mb-2">Policy Changes</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We may update this Privacy Policy occasionally. Any changes will be reflected on
            this page with a revised effective date. Continued use of Noor Quran after changes
            constitutes acceptance of the updated policy.
          </p>
        </div>

        {/* Third-party links */}
        <div
          className="rounded-2xl border border-border p-4 bg-card"
        >
          <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-3">
            Third-Party Privacy Policies
          </p>
          <div className="divide-y divide-border">
            {THIRD_PARTY.map((link) => (
              <button
                key={link.name}
                onClick={() => openUrl(link.url)}
                className="w-full text-left flex justify-between items-center py-2.5"
              >
                <span className="text-foreground text-sm">{link.name}</span>
                <span className="text-muted-foreground text-xs">View Policy →</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div
          className="rounded-2xl border border-border p-5 bg-card"
        >
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-primary" />
            <p className="text-foreground text-sm font-semibold">Contact Us</p>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-1">
            If you have any questions, concerns, or requests regarding this Privacy Policy or
            your data, please contact the Noor Quran Team:
          </p>
          <p className="text-muted-foreground text-xs mb-3 font-medium">The Noor Quran Team</p>
          <button
            onClick={() => openUrl("mailto:easygroupjoin@gmail.com")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-primary border border-border bg-muted hover:border-border transition-colors"
          >
            <Mail className="w-4 h-4" />
            easygroupjoin@gmail.com
          </button>
        </div>

        {/* Effective date */}
        <p className="text-muted-foreground text-xs text-center pt-2">
          Last updated: August 6, 2026 &nbsp;·&nbsp; Effective immediately
        </p>

        {/* Close button */}
        <button
          onClick={() => window.history.back()}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-primary-foreground bg-primary transition-all active:scale-[0.98]"
        >
          Close
        </button>

        <p className="text-center text-muted-foreground text-xs pb-4">
          Noor Quran © 2025 · The Noor Quran Team
        </p>
      </div>
    </div>
  );
}
