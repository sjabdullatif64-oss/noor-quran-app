import { useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ChevronLeft, ScrollText, BookOpen, GraduationCap, Mic, Shield,
  Users, Scale, Wifi, RefreshCw, AlertTriangle, Mail, Sparkles,
} from "lucide-react";
import { openUrl } from "@/lib/capacitor";

const SECTIONS = [
  {
    icon: <ScrollText className="w-5 h-5" />,
    title: "1. Acceptance of Terms",
    accent: "text-emerald-400",
    bg: "rgba(52,211,153,0.07)",
    border: "border-emerald-800/40",
    body: (
      <>
        By downloading, installing, or using <strong className="text-emerald-300">Noor Quran</strong>{" "}
        (package <em>com.sj64noorquran</em>), you agree to these Terms of Service. If you do not
        agree with any part of these terms, please do not use the app. Continued use of the app
        after changes to these terms constitutes acceptance of the updated terms.
      </>
    ),
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "2. Purpose of the App",
    accent: "text-amber-400",
    bg: "rgba(217,119,6,0.07)",
    border: "border-amber-900/40",
    body: (
      <>
        Noor Quran is an <strong className="text-amber-300">educational and religious</strong>{" "}
        companion app for Muslims. It provides Quran reading with translations, verified
        recitation audio, prayer times, Qibla direction, Tasbeeh counting, Islamic reminders,
        and learning tools. The app is offered as a free service to the Muslim community and is
        not a substitute for formal religious instruction.
      </>
    ),
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "3. Quran Text, Translations & Recitations",
    accent: "text-sky-400",
    bg: "rgba(56,189,248,0.07)",
    border: "border-sky-900/40",
    body: (
      <>
        Quran text and translations are provided by public Islamic APIs
        (<strong className="text-sky-300">api.alquran.cloud</strong>) and recitation audio by{" "}
        <strong className="text-sky-300">cdn.islamic.network</strong> and Quran.com&apos;s audio
        CDN. While these sources are widely trusted, translations are human works and may contain
        variations between editions. The Arabic Quran text is authoritative; translations are
        aids to understanding. If you notice an error, please report it to us.
      </>
    ),
  },
  {
    icon: <GraduationCap className="w-5 h-5" />,
    title: "4. AI Quran Teacher & Pronunciation Assessment",
    accent: "text-violet-400",
    bg: "rgba(139,92,246,0.07)",
    border: "border-violet-900/40",
    body: (
      <>
        The <strong className="text-violet-300">AI Quran Teacher</strong> offers step-by-step
        reading lessons with optional pronunciation checking using speech recognition.{" "}
        <strong className="text-violet-300">Important limitations:</strong> the pronunciation
        result is <em>educational guidance only</em> and is <em>not guaranteed to be fully
        accurate</em>. Speech recognition may mis-hear correct recitation or accept imperfect
        recitation, and it does not assess Tajweed rules. For authoritative correction of your
        recitation, please consult a <strong className="text-violet-300">qualified Quran
        teacher</strong>. Lesson passes, scores, and feedback in the app carry no religious or
        scholarly authority.
      </>
    ),
  },
  {
    icon: <Mic className="w-5 h-5" />,
    title: "5. Microphone Use",
    accent: "text-teal-400",
    bg: "rgba(45,212,191,0.07)",
    border: "border-teal-900/40",
    body: (
      <>
        Microphone access is used <strong className="text-teal-300">only</strong> for the Quran
        Teacher pronunciation check, is requested only when you tap &quot;Read Now&quot;, and
        only after you agree on the consent screen. Speech is processed by your device&apos;s
        speech-recognition service (on most Android devices this is provided by Google and may
        involve processing on Google&apos;s servers). The app itself does not record, store, or
        upload audio files. See the Privacy Policy for full details. You may deny or revoke
        microphone permission at any time and continue using the app in listen-only mode.
      </>
    ),
  },
  {
    icon: <RefreshCw className="w-5 h-5" />,
    title: "6. Daily Limits & Progress Features",
    accent: "text-emerald-400",
    bg: "rgba(52,211,153,0.07)",
    border: "border-emerald-800/40",
    body: (
      <>
        The Teacher feature includes a daily new-lesson limit, streaks, revision sessions, and
        progress tracking designed to encourage steady learning. Progress data is stored on your
        device. We may adjust limits, lesson content, curriculum structure, or scoring thresholds
        in future updates to improve the learning experience. Clearing app data or deleting
        learning data resets progress permanently.
      </>
    ),
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "7. User Responsibilities & Acceptable Use",
    accent: "text-rose-400",
    bg: "rgba(244,63,94,0.07)",
    border: "border-rose-900/40",
    body: (
      <>
        You agree to use Noor Quran only for lawful, personal, and non-commercial purposes. You
        must not attempt to reverse-engineer, modify, redistribute, or resell the app; interfere
        with the services it relies on; or use the app in a way that disrespects the Quran or
        Islamic content. You are responsible for your device&apos;s security and for any data
        charges incurred while streaming audio or fetching content.
      </>
    ),
  },
  {
    icon: <Scale className="w-5 h-5" />,
    title: "8. Intellectual Property",
    accent: "text-amber-400",
    bg: "rgba(217,119,6,0.07)",
    border: "border-amber-900/40",
    body: (
      <>
        The Holy Quran is the word of Allah and is not subject to copyright. App design, code,
        lesson structure, and original content are the property of{" "}
        <strong className="text-amber-300">SJ64 Studios</strong>. Translations, recitations, and
        Azan recordings belong to their respective owners and are used under their licenses
        (credits are listed on the About screen). You may share the app link freely but may not
        republish app content as your own.
      </>
    ),
  },
  {
    icon: <Wifi className="w-5 h-5" />,
    title: "9. Third-Party Services",
    accent: "text-indigo-400",
    bg: "rgba(99,102,241,0.07)",
    border: "border-indigo-900/40",
    body: (
      <>
        The app relies on third-party services: AlQuran Cloud (Quran text), Aladhan (prayer
        times), Islamic Network CDN and Quran.com CDN (audio), Google AdMob (advertising in the
        Android app), and your device&apos;s speech-recognition service (typically Google).
        These services have their own terms and privacy policies, and we are not responsible
        for their availability or conduct.
      </>
    ),
  },
  {
    icon: <RefreshCw className="w-5 h-5" />,
    title: "10. App Availability & Changes",
    accent: "text-sky-400",
    bg: "rgba(56,189,248,0.07)",
    border: "border-sky-900/40",
    body: (
      <>
        We strive to keep Noor Quran available and accurate, but we do not guarantee
        uninterrupted operation. Features depend on third-party APIs that may change or become
        unavailable. We may add, modify, or remove features at any time without prior notice,
        including the AI Quran Teacher, marketplace, and reward features.
      </>
    ),
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "11. Disclaimer of Warranties & Limitation of Liability",
    accent: "text-rose-400",
    bg: "rgba(244,63,94,0.07)",
    border: "border-rose-900/40",
    body: (
      <>
        Noor Quran is provided <strong className="text-rose-300">&quot;as is&quot;</strong> and{" "}
        <strong className="text-rose-300">&quot;as available&quot;</strong>, without warranties of
        any kind, express or implied, including accuracy of prayer times, Qibla direction,
        translations, or pronunciation assessment. To the maximum extent permitted by law, SJ64
        Studios shall not be liable for any indirect, incidental, or consequential damages
        arising from your use of, or inability to use, the app. Always verify prayer times with
        your local mosque or authority.
      </>
    ),
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "12. Changes to These Terms",
    accent: "text-emerald-400",
    bg: "rgba(52,211,153,0.07)",
    border: "border-emerald-800/40",
    body: (
      <>
        We may update these Terms of Service from time to time. Changes will be published on
        this screen with a revised &quot;Last updated&quot; date. Material changes may also be
        highlighted in app update notes. Your continued use of the app after an update means you
        accept the revised terms.
      </>
    ),
  },
];

export function TermsOfService() {
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
          href="/about"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-emerald-800/50 text-emerald-500 hover:text-emerald-300 hover:border-emerald-600 transition-colors"
          data-testid="link-back-about"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-emerald-300 leading-tight">Terms of Service</h1>
          <p className="text-emerald-700 text-xs">Noor Quran · com.sj64noorquran</p>
        </div>
        <ScrollText className="w-5 h-5 text-emerald-700" />
      </div>

      <div className="px-4 space-y-4 max-w-2xl mx-auto">
        {/* Hero card */}
        <div
          className="rounded-2xl p-5 border border-emerald-800/40"
          style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.2), rgba(6,22,16,0.4))" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="w-5 h-5 text-emerald-400" />
            <p className="text-emerald-300 font-semibold text-base">Welcome to Noor Quran</p>
          </div>
          <p className="text-emerald-500 text-sm leading-relaxed">
            These terms explain your rights and responsibilities when using Noor Quran. We wrote
            them to be clear and honest — please take a moment to read them. Using the app means
            you agree to these terms.
          </p>
        </div>

        {/* Sections */}
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

        {/* Contact */}
        <div
          className="rounded-2xl border border-emerald-800/50 p-5"
          style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.15), rgba(6,22,16,0.3))" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-emerald-500" />
            <p className="text-emerald-400 text-sm font-semibold">13. Contact Information</p>
          </div>
          <p className="text-emerald-600 text-sm leading-relaxed mb-1">
            Questions about these Terms of Service? Contact the Noor Quran Team:
          </p>
          <p className="text-emerald-700 text-xs mb-3 font-medium">SJ64 Studios · The Noor Quran Team</p>
          <button
            onClick={() => openUrl("mailto:easygroupjoin@gmail.com?subject=Noor Quran Terms of Service")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-300 border border-emerald-700/50 hover:border-emerald-500 transition-colors"
            style={{ background: "rgba(26,92,56,0.3)" }}
            data-testid="button-terms-contact"
          >
            <Mail className="w-4 h-4" />
            easygroupjoin@gmail.com
          </button>
        </div>

        {/* Effective date */}
        <p className="text-emerald-800 text-xs text-center pt-2" data-testid="text-terms-updated">
          Last updated: July 19, 2026 &nbsp;·&nbsp; Effective immediately
        </p>

        {/* Close button */}
        <button
          onClick={() => window.history.back()}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
          data-testid="button-terms-close"
          style={{ background: "linear-gradient(135deg, #1a5c38, #0d3d24)" }}
        >
          Close
        </button>

        <p className="text-center text-emerald-900 text-xs pb-4">
          Noor Quran © 2025–2026 · The Noor Quran Team
        </p>
      </div>
    </div>
  );
}
