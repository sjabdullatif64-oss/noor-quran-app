import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ScrollText } from "lucide-react";
import { openUrl } from "@/lib/capacitor";

const SECTIONS = [
  {
    icon: "▣",
    title: "Purpose of the App",
    body: [
      "Noor Quran is provided for personal, educational, and devotional use.",
      "Features may include Quran reading, translations, Arabic recitation, audio downloads, prayer times, Qibla direction, Islamic calendar, notifications, bookmarks, favorites, search, and digital Tasbeeh.",
      "Available Quran translation languages may vary by country and may be expanded, updated, or improved in future versions of the app. Users can manually select their preferred Quran translation language at any time from Settings.",
      "Features may be changed, improved, restricted, or removed in future updates.",
    ],
  },
  {
    icon: "☰",
    title: "Quran Text & Translations",
    body: [
      "We make reasonable efforts to provide accurate Quranic content. However, digital display, formatting, fonts, datasets, or technical errors may affect how content appears.",
      "If you notice a possible error in the Arabic text, verify it with an authenticated Mushaf and contact us.",
      "The Quran was revealed in Arabic. Translations are interpretations of its meaning and may differ between translators or contain mistakes, omissions, or outdated wording.",
      "Translations may also fail to load because of internet, server, API, device, or technical problems.",
      "Noor Quran does not guarantee the accuracy or continuous availability of every translation.",
      "For important religious questions, consult the Arabic text, reliable Tafsir, and a qualified Islamic scholar.",
    ],
  },
  {
    icon: "◖",
    title: "Quran Audio & Downloads",
    body: [
      "Quran recitations may be streamed or downloaded through third-party services.",
      "Audio playback or downloads may fail because of network interruptions, server problems, storage limitations, permissions, device restrictions, or other technical issues.",
      "Downloaded audio may be deleted if you clear app data, uninstall the app, reset your device, or use storage-cleaning tools.",
      "We do not guarantee permanent storage or availability of downloaded audio.",
    ],
  },
  {
    icon: "⌖",
    title: "Prayer Times, Qibla & Islamic Calendar",
    body: [
      "Prayer times, Qibla direction, and Hijri dates are provided as helpful estimates.",
      "Results may vary because of location accuracy, calculation method, device sensors, time-zone settings, local moon sightings, or technical limitations.",
      "For important religious observance, verify prayer times, Qibla direction, and Islamic dates with your local mosque or a recognized Islamic authority.",
    ],
  },
  {
    icon: "🔔",
    title: "Notifications & Local Data",
    body: [
      "Prayer reminders and other notifications may be delayed, blocked, or missed because of device settings, battery optimization, permissions, operating-system restrictions, or technical errors.",
      "Do not rely only on app notifications for important obligations.",
      "Bookmarks, favorites, Tasbeeh counts, settings, and downloaded content may be stored locally on your device.",
      "This data may be lost if app data is cleared, the app is uninstalled, the device is reset, or a technical problem occurs.",
    ],
  },
  {
    icon: "$",
    title: "Third-Party Services & Advertising",
    body: [
      "Noor Quran may use third-party APIs, hosting services, content providers, and Google AdMob to provide translations, audio, prayer information, and advertisements.",
      "These services operate under their own terms and privacy policies.",
      "We are not responsible for third-party outages, content errors, policy changes, advertisements, or service availability.",
    ],
  },
  {
    icon: "✓",
    title: "Acceptable Use",
    body: [
      "You agree to use Noor Quran only for lawful and personal purposes. You must not:",
      "Misuse, damage, disrupt, or interfere with the app or its services.",
      "Reverse engineer, copy, sell, redistribute, or commercially exploit the app without permission.",
      "Remove copyright, attribution, trademark, or legal notices.",
      "Use the app or its content for unlawful, deceptive, or harmful activity.",
    ],
  },
  {
    icon: "©",
    title: "Intellectual Property",
    body: [
      "The Noor Quran name, design, logo, interface, graphics, and original software are protected by applicable intellectual-property laws.",
      "Quran text, translations, recitations, and third-party materials remain the property of their respective owners or providers.",
    ],
  },
  {
    icon: "!",
    title: "Disclaimer of Warranties",
    body: [
      "Noor Quran is provided on an “AS IS” and “AS AVAILABLE” basis.",
      "We do not guarantee that the app will always be accurate, uninterrupted, secure, compatible with every device, or free from errors.",
      "The app is a helpful Islamic utility and is not a replacement for qualified religious guidance or official local religious authorities.",
    ],
  },
  {
    icon: "⚠",
    title: "Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, Noor Quran and its developer will not be liable for direct, indirect, incidental, special, or consequential loss arising from use of the app or inability to use it.",
      "This includes translation errors, inaccurate prayer times, Qibla or calendar differences, missed notifications, unavailable services, lost bookmarks or favorites, deleted audio, data loss, and third-party service failures.",
    ],
  },
  {
    icon: "↻",
    title: "Updates & Changes to These Terms",
    body: [
      "We may update the app or these Terms when necessary for new features, technical improvements, security, legal requirements, or service changes.",
      "Updated Terms become effective when published on this page or within the app.",
      "Continued use of Noor Quran after an update means that you accept the revised Terms.",
    ],
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
      className="min-h-screen pb-32 md:pb-12 animate-in fade-in duration-500 bg-background"
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 pt-6 pb-4 bg-background/95 backdrop-blur-sm"
      >
        <Link
          href="/about"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          data-testid="link-back-about"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground leading-tight">Terms of Service</h1>
          <p className="text-muted-foreground text-xs">Noor Quran · com.sj64noorquran</p>
        </div>
        <ScrollText className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="px-4 space-y-4 max-w-2xl mx-auto">
        {/* Welcome */}
        <div
          className="rounded-2xl p-5 border border-border bg-card"
        >
          <p className="text-primary text-lg leading-none">♢</p>
          <p className="text-primary text-lg leading-none mb-3">♢</p>
          <p className="text-foreground font-semibold text-base mb-2">Welcome to Noor Quran</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            These Terms of Service govern your use of the Noor Quran application. By downloading, installing, or using the app, you agree to these Terms. If you do not agree, please stop using the app.
          </p>
        </div>

        {/* Quran verse */}
        <div
          className="rounded-2xl p-5 border border-border bg-card text-center"
        >
          <p className="font-arabic text-lg text-foreground mb-1">
            وَقُل رَّبِّ زِدْنِي عِلْمًا
          </p>
          <p className="text-muted-foreground text-sm">
            “My Lord, increase me in knowledge.” — Quran 20:114
          </p>
        </div>

        {/* Sections */}
        {SECTIONS.map((s) => (
          <div
            key={s.title}
            className="rounded-2xl border border-border overflow-hidden bg-card"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted"
            >
              <span className="text-primary text-lg">{s.icon}</span>
              <p className="font-semibold text-sm text-primary">{s.title}</p>
            </div>
            <div className="px-4 py-4 space-y-3">
              {s.body.map((p, i) => (
                <p
                  key={i}
                  className={`text-muted-foreground text-sm leading-relaxed ${
                    p.startsWith("Misuse") ||
                    p.startsWith("Reverse") ||
                    p.startsWith("Remove") ||
                    p.startsWith("Use the")
                      ? "pl-4"
                      : ""
                  }`}
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        ))}

        {/* Contact */}
        <div
          className="rounded-2xl border border-border p-5 bg-card"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary text-lg">✉</span>
            <p className="text-foreground text-sm font-semibold">Contact Us</p>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-1">
            If you have questions, suggestions, or concerns about these Terms of Service, please contact the Noor Quran Team:
          </p>
          <p className="text-muted-foreground text-xs mb-3 font-medium">The Noor Quran Team</p>
          <button
            onClick={() =>
              openUrl("mailto:easygroupjoin@gmail.com?subject=Noor Quran Terms of Service")
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-primary-foreground border border-border bg-primary hover:border-border transition-colors"
            data-testid="button-terms-contact"
          >
            <span>✉</span>
            easygroupjoin@gmail.com
          </button>
        </div>

        {/* Effective date */}
        <p
          className="text-muted-foreground text-xs text-center pt-2"
          data-testid="text-terms-updated"
        >
          Last updated: 21 July 2026 · Effective immediately
        </p>

        {/* Copyright */}
        <p className="text-center text-muted-foreground text-xs pb-4">
          Noor Quran © 2026 · The Noor Quran Team
        </p>
      </div>
    </div>
  );
}
