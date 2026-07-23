import { Link } from "wouter";
import {
  ChevronLeft, Share2, Shield, Mail, BookOpen, Clock, Heart,
  Bookmark, Download, Hash, Bell, Compass, Sparkles, Globe, Volume2, Gift, PenLine, Star,
  Calculator, ExternalLink, ShoppingBag, ScrollText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n-context";
import { nativeShare, openUrl, getLastShareError } from "@/lib/capacitor";
import { BUILD_INFO } from "@/lib/buildInfo";

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
    accent: "text-emerald-600",
    bg: "rgba(52,211,153,0.12)",
  },
  {
    icon: <Volume2 className="w-5 h-5" />,
    label: "Audio Playback",
    description: "Al-Afasy recitation + translation voice",
    accent: "text-sky-600",
    bg: "rgba(56,189,248,0.12)",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    label: "Prayer Times",
    description: "Accurate times for any city worldwide",
    accent: "text-rose-600",
    bg: "rgba(244,63,94,0.12)",
  },
  {
    icon: <Bell className="w-5 h-5" />,
    label: "Notifications",
    description: "Daily ayah, azkar & prayer reminders",
    accent: "text-yellow-600",
    bg: "rgba(234,179,8,0.12)",
  },
  {
    icon: <Heart className="w-5 h-5" />,
    label: "Favorites",
    description: "Save your beloved surahs & ayahs",
    accent: "text-pink-600",
    bg: "rgba(236,72,153,0.12)",
  },
  {
    icon: <Bookmark className="w-5 h-5" />,
    label: "Bookmarks",
    description: "Mark your reading position easily",
    accent: "text-blue-600",
    bg: "rgba(96,165,250,0.12)",
  },
  {
    icon: <Download className="w-5 h-5" />,
    label: "Downloads",
    description: "Offline Quran text & audio storage",
    accent: "text-teal-600",
    bg: "rgba(45,212,191,0.12)",
  },
  {
    icon: <Gift className="w-5 h-5" />,
    label: "Islamic Gifts",
    description: "Beautiful greeting cards & duas",
    accent: "text-purple-600",
    bg: "rgba(168,85,247,0.12)",
  },
  {
    icon: <PenLine className="w-5 h-5" />,
    label: "Islamic Writing",
    description: "Personal notes, duas & Quran reflections",
    accent: "text-lime-600",
    bg: "rgba(132,204,22,0.12)",
  },
  {
    icon: <ShoppingBag className="w-5 h-5" />,
    label: "Islamic Marketplace",
    description: "Browse Islamic products in the community",
    accent: "text-teal-600",
    bg: "rgba(20,184,166,0.12)",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    label: "Juz Navigator",
    description: "Browse all 30 Juz with ayah-level navigation",
    accent: "text-indigo-600",
    bg: "rgba(99,102,241,0.12)",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    label: "10 Languages",
    description: "Urdu, English, Sindhi, Hindi & more",
    accent: "text-cyan-600",
    bg: "rgba(34,211,238,0.12)",
  },
  {
    icon: <Compass className="w-5 h-5" />,
    label: "Qibla Direction",
    description: "Live compass pointing to Makkah",
    accent: "text-orange-600",
    bg: "rgba(249,115,22,0.12)",
  },
  {
    icon: <Hash className="w-5 h-5" />,
    label: "Tasbeeh Counter",
    description: "Track your daily dhikr & tasbih",
    accent: "text-violet-600",
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

async function shareApp(toast: ReturnType<typeof useToast>["toast"]) {
  const result = await nativeShare({
    title:       "Noor Quran",
    text:        APP_SHARE_MSG,
    url:         APP_SHARE_URL,
    dialogTitle: "Share Noor Quran",
  });
  if (result === "failed") {
    toast({ title: "Share unavailable", description: getLastShareError() ?? "Please try again.", variant: "destructive" });
  }
}

export function About() {
  const { toast } = useToast();
  const { t } = useI18n();

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500 bg-background"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link href="/more" className="text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-semibold text-primary">{t("about_title")}</h1>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center pt-6 pb-8 px-6">
        <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-5 shadow-2xl bg-primary/15">
          <span className="text-6xl select-none">☪️</span>
        </div>
        <h2 className="text-4xl font-serif font-bold text-primary tracking-tight">Noor Quran</h2>
        <span
          className="mt-2 px-3 py-1 rounded-full text-xs font-medium text-primary border border-border bg-primary/10"
        >
          {t("about_version")} {BUILD_INFO.version}
        </span>
        <span
          className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-muted-foreground border border-border bg-card"
        >
          {t("about_build")} {BUILD_INFO.commitSha}
        </span>
        <p className="text-muted-foreground text-sm mt-2 font-arabic tracking-wide">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-center text-muted-foreground text-sm mt-5 leading-relaxed max-w-xs">
          A modern Islamic companion app designed to help Muslims in their daily spiritual journey —
          Quran, prayer times, reminders, and more, all in one beautiful experience.
        </p>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-border mb-6" />

      <div className="px-5 space-y-6">

        {/* ── Features section ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-primary text-sm font-semibold uppercase tracking-wider">{t("about_features_title")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className="flex items-center gap-4 p-4 rounded-2xl border border-border transition-all hover:border-border"
                style={{
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
                  <p className="text-foreground text-sm font-semibold leading-tight">{f.label}</p>
                  <p className="text-muted-foreground text-xs mt-0.5 leading-snug">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Islamic Writing shortcut ── */}
        <Link href="/writing">
          <div
            className="flex items-center gap-4 p-5 rounded-2xl border border-border transition-all hover:border-border active:scale-[0.98]"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lime-600 bg-primary/10"
            >
              <PenLine className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-bold text-base">Islamic Writing</p>
              <p className="text-muted-foreground text-sm mt-0.5">Write duas, Quran reflections & personal notes</p>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180 shrink-0" />
          </div>
        </Link>

        {/* ── Multi-language support section ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <p className="text-primary text-sm font-semibold uppercase tracking-wider">
              Multi Language Support
            </p>
          </div>
          <div
            className="rounded-2xl border border-border overflow-hidden"
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
                    <p className="text-foreground text-xs font-semibold leading-tight">{lang.english}</p>
                    <p className="text-muted-foreground text-[10px] leading-tight">{lang.native}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border">
              <p className="text-muted-foreground text-xs text-center">
                Arabic text always shown · Translation switches instantly
              </p>
            </div>
          </div>
        </div>

        {/* ── Developer info ── */}
        <div
          className="rounded-2xl border border-border overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-primary text-xs font-semibold uppercase tracking-wider">{t("about_dev_label")}</p>
          </div>
          <div className="p-4 space-y-2.5">
            <InfoRow label={t("about_dev_label")} value="SJ64 Studios" />
            <InfoRow label="Package"   value="com.sj64noorquran" />
            <InfoRow label="Platform"  value="Android · Web"     />
            <InfoRow label="Category"  value="Islamic / Religion" />
            <InfoRow label="Languages" value="10 translations"   />
          </div>
        </div>

        {/* ── Audio credits ── */}
        <div
          className="rounded-2xl border border-border overflow-hidden bg-card"
        >
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-primary text-xs font-semibold uppercase tracking-wider">{t("about_credits_title")}</p>
          </div>
          <div className="p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              "Makkah Azan" — recorded at Masjid al-Haram, Makkah (Wikimedia Commons),
              licensed under{" "}
              <button
                onClick={() => openUrl("https://creativecommons.org/licenses/by/3.0")}
                className="underline text-primary"
              >
                CC BY 3.0
              </button>.
            </p>
            <p>
              "Traditional Azan" — "Islamic call to worship" (Wikimedia Commons), licensed
              under{" "}
              <button
                onClick={() => openUrl("https://creativecommons.org/licenses/by-sa/4.0")}
                className="underline text-primary"
              >
                CC BY-SA 4.0
              </button>.
            </p>
            <p>
              "Community Azan" — recording by Aaqib Azeez (Wikimedia Commons), licensed
              under{" "}
              <button
                onClick={() => openUrl("https://creativecommons.org/licenses/by-sa/4.0")}
                className="underline text-primary"
              >
                CC BY-SA 4.0
              </button>.
            </p>
            <p>"Default Adhan" — recording by Sabah Fakhry, public domain.</p>
          </div>
        </div>

        {/* ── Try Our Other App ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-primary text-sm font-semibold uppercase tracking-wider">Try Our Other App</p>
          </div>
          <button
            onClick={() =>
              openUrl("https://play.google.com/store/apps/details?id=com.sj64.smartcalculator")
            }
            className="w-full flex items-center gap-4 p-5 rounded-2xl border border-border text-left transition-all active:scale-[0.98] hover:border-border"
            data-testid="button-about-smart-calculator"
          >
            <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-primary-foreground bg-primary"
            >
              <Calculator className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-bold text-base leading-tight">Smart Calculator</p>
              <p className="text-muted-foreground text-xs mt-1 leading-snug">
                A fast, elegant calculator app — free on Google Play Store
              </p>
              <div
                className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary border border-border bg-primary/10"
              >
                <ExternalLink className="w-3 h-3" />
                Google Play Store
              </div>
            </div>
          </button>
        </div>

        {/* ── Action buttons ── */}
        <div className="space-y-3 pb-4">
          <ActionButton
            icon={<Share2 className="w-5 h-5" />}
            label="Share Noor Quran"
            sublabel="Spread the word with friends & family"
            accent="text-emerald-600"
            bg="rgba(52,211,153,0.1)"
            border="border-border"
            onClick={() => shareApp(toast)}
            testId="button-about-share"
          />
          <ActionButton
            icon={<Star className="w-5 h-5 fill-amber-400" />}
            label="Rate Noor Quran"
            sublabel="Support us with your review on Play Store ⭐⭐⭐⭐⭐"
            accent="text-amber-600"
            bg="rgba(251,191,36,0.08)"
            border="border-border"
            onClick={() =>
              openUrl("https://play.google.com/store/apps/details?id=com.sj64noorquran&reviewId=0")
            }
            testId="button-about-rate"
          />
          <ActionButton
            icon={<Mail className="w-5 h-5" />}
            label="Contact Us"
            sublabel="Feedback, suggestions & support"
            accent="text-sky-600"
            bg="rgba(56,189,248,0.08)"
            border="border-border"
            onClick={() =>
              openUrl("mailto:easygroupjoin@gmail.com?subject=Noor Quran Feedback")
            }
            testId="button-about-contact"
          />
          <Link href="/privacy-policy" className="block" data-testid="button-about-privacy">
            <ActionButton
              icon={<Shield className="w-5 h-5" />}
              label="Privacy Policy"
              sublabel="How we handle your data"
              accent="text-amber-600"
              bg="rgba(217,119,6,0.08)"
              border="border-border"
            />
          </Link>
          <Link href="/terms-of-service" className="block mt-3" data-testid="button-about-terms">
            <ActionButton
              icon={<ScrollText className="w-5 h-5" />}
              label="Terms of Service"
              sublabel={t("about_terms_sub")}
              accent="text-violet-600"
              bg="rgba(139,92,246,0.08)"
              border="border-border"
            />
          </Link>
          <Link href="/terms-of-service" className="block mt-3" data-testid="button-about-terms">
            <ActionButton
              icon={<ScrollText className="w-5 h-5" />}
              label="Terms of Service"
              sublabel="Rules & conditions for using the app"
              accent="text-violet-400"
              bg="rgba(139,92,246,0.08)"
              border="border-violet-900/40"
            />
          </Link>
        </div>

        <p className="text-center text-muted-foreground text-xs pb-6">
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
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
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
        <p className="text-foreground text-sm font-semibold">{label}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{sublabel}</p>
      </div>
      <ChevronLeft className="w-4 h-4 text-emerald-800 rotate-180 shrink-0" />
    </button>
  );
}
