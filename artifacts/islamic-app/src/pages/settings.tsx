import { useState } from "react";
import { ChevronLeft, Moon, Globe, MapPin, Bell, Check, Sun, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { getCity, setCity as saveCity, getLang, setLang as saveLang, PRESET_CITIES } from "@/lib/settings";
import { ALL_LANGUAGES, TRANSLATION_LABELS, TRANSLATION_ENGLISH_NAMES, TranslationLanguage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Badge label for languages that need a note
const LANG_BADGE: Partial<Record<TranslationLanguage, string>> = {
  sindhi: "Fixed ✓",
};

// Flag emoji per language
const LANG_FLAG: Record<TranslationLanguage, string> = {
  urdu:       "🇵🇰",
  english:    "🇬🇧",
  sindhi:     "🇵🇰",
  hindi:      "🇮🇳",
  turkish:    "🇹🇷",
  bengali:    "🇧🇩",
  indonesian: "🇮🇩",
  french:     "🇫🇷",
  spanish:    "🇪🇸",
  malay:      "🇲🇾",
};

// Accent color per language (active state)
const LANG_ACCENT: Record<TranslationLanguage, string> = {
  urdu:       "border-emerald-600 bg-emerald-900/30",
  english:    "border-sky-600 bg-sky-900/20",
  sindhi:     "border-teal-600 bg-teal-900/20",
  hindi:      "border-orange-600 bg-orange-900/20",
  turkish:    "border-red-600 bg-red-900/20",
  bengali:    "border-violet-600 bg-violet-900/20",
  indonesian: "border-rose-600 bg-rose-900/20",
  french:     "border-blue-600 bg-blue-900/20",
  spanish:    "border-yellow-600 bg-yellow-900/20",
  malay:      "border-lime-600 bg-lime-900/20",
};

// Initial visible languages (shown without expanding)
const INITIAL_COUNT = 4;

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [defaultLang, setDefaultLang] = useState<TranslationLanguage>(() => getLang());
  const [defaultCity, setDefaultCity] = useState<string>(() => getCity());
  const [savedLang, setSavedLang]     = useState(false);
  const [savedCity, setSavedCity]     = useState(false);
  const [showAllLangs, setShowAllLangs] = useState(false);
  const { toast } = useToast();

  const handleLang = (lang: TranslationLanguage) => {
    setDefaultLang(lang);
    saveLang(lang);
    setSavedLang(true);
    setTimeout(() => setSavedLang(false), 2000);
    toast({
      title: "Translation saved",
      description: `Default translation set to ${TRANSLATION_ENGLISH_NAMES[lang]}.`,
    });
  };

  const handleCity = (city: string) => {
    setDefaultCity(city);
    saveCity(city);
    setSavedCity(true);
    setTimeout(() => setSavedCity(false), 2000);
    toast({ title: "City saved", description: `Prayer times will use ${city}.` });
  };

  const visibleLangs = showAllLangs ? ALL_LANGUAGES : ALL_LANGUAGES.slice(0, INITIAL_COUNT);
  const hiddenCount  = ALL_LANGUAGES.length - INITIAL_COUNT;

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-6">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Settings</h1>
          <p className="text-emerald-700 text-xs mt-0.5">App preferences & customisation</p>
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <Section title="Appearance" icon={<Moon className="w-4 h-4" />}>
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Dark Mode</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                Currently: {theme === "dark" ? "Dark" : "Light"}
              </p>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`relative w-14 h-7 rounded-full transition-all ${
                theme === "dark" ? "bg-emerald-600" : "bg-emerald-900/50"
              }`}
              data-testid="toggle-dark-mode"
            >
              <span
                className="absolute top-1 w-5 h-5 rounded-full shadow-md flex items-center justify-center transition-transform bg-white"
                style={{ transform: theme === "dark" ? "translateX(32px)" : "translateX(4px)" }}
              >
                {theme === "dark"
                  ? <Moon className="w-3 h-3 text-emerald-700" />
                  : <Sun  className="w-3 h-3 text-amber-500"   />}
              </span>
            </button>
          </div>
        </Section>

        {/* ── Quran Translation ────────────────────────────────────────────── */}
        <Section
          title="Quran Translation"
          icon={<Globe className="w-4 h-4" />}
          badge={savedLang ? "Saved ✓" : undefined}
        >
          <div className="p-4 space-y-2">
            <p className="text-emerald-600 text-xs mb-3">
              Choose your default translation language. Arabic text is always shown.
            </p>

            {visibleLangs.map((lang) => {
              const isActive = defaultLang === lang;
              return (
                <button
                  key={lang}
                  onClick={() => handleLang(lang)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    isActive
                      ? LANG_ACCENT[lang]
                      : "border-emerald-900/30 hover:border-emerald-700"
                  }`}
                  style={isActive ? {} : { background: "rgba(255,255,255,0.02)" }}
                  data-testid={`setting-lang-${lang}`}
                >
                  <span className="text-xl shrink-0">{LANG_FLAG[lang]}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">{TRANSLATION_ENGLISH_NAMES[lang]}</p>
                      {LANG_BADGE[lang] && (
                        <span className="text-[10px] font-semibold text-teal-400 border border-teal-800/50 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(45,212,191,0.08)" }}>
                          {LANG_BADGE[lang]}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-600 text-xs mt-0.5">{TRANSLATION_LABELS[lang]}</p>
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Show more / less toggle */}
            <button
              onClick={() => setShowAllLangs((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-emerald-600 hover:text-emerald-400 transition-colors"
              data-testid="button-toggle-all-langs"
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${showAllLangs ? "rotate-90" : ""}`}
              />
              {showAllLangs
                ? "Show fewer languages"
                : `Show ${hiddenCount} more languages`}
            </button>
          </div>
        </Section>

        {/* ── Prayer Times City ─────────────────────────────────────────────── */}
        <Section
          title="Prayer Times"
          icon={<MapPin className="w-4 h-4" />}
          badge={savedCity ? "Saved ✓" : undefined}
        >
          <div className="p-4 space-y-2">
            <p className="text-emerald-600 text-xs mb-3">
              Selected city:{" "}
              <span className="text-emerald-300 font-semibold">{defaultCity}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCity(city)}
                  className={`p-3.5 rounded-xl border text-sm font-medium transition-all ${
                    defaultCity === city
                      ? "border-emerald-600 bg-emerald-900/30 text-white"
                      : "border-emerald-900/30 text-emerald-600 hover:border-emerald-700 hover:text-emerald-400"
                  }`}
                  style={{ background: defaultCity === city ? undefined : "rgba(255,255,255,0.02)" }}
                  data-testid={`setting-city-${city.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {defaultCity === city && <span className="text-emerald-400 mr-1">✓</span>}
                  {city}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Notifications link ────────────────────────────────────────────── */}
        <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
          <Link href="/notifications">
            <div className="px-4 py-4 flex items-center justify-between hover:opacity-80 transition-opacity">
              <div>
                <p className="text-white text-sm font-medium">Islamic Reminders</p>
                <p className="text-emerald-700 text-xs mt-0.5">Prayer times, Quran ayah & more</p>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-700" />
            </div>
          </Link>
        </Section>

        <p className="text-emerald-900 text-xs text-center pt-2 pb-6">
          Noor Quran v1.0 · All settings saved on your device
        </p>
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  title, icon, badge, children,
}: {
  title: string; icon: React.ReactNode; badge?: string; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border border-emerald-900/40 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/30">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600">{icon}</span>
          <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">{title}</span>
        </div>
        {badge && (
          <span className="text-xs text-emerald-400 font-medium animate-in fade-in duration-200">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
