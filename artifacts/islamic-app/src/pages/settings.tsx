import { useState } from "react";
import { ChevronLeft, Moon, Globe, MapPin, Bell, Check, Sun } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { getCity, setCity as saveCity, getLang, setLang as saveLang, PRESET_CITIES } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";

const LANGUAGES = [
  { id: "urdu" as const, label: "اردو", sublabel: "Urdu" },
  { id: "english" as const, label: "English", sublabel: "English" },
];

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [defaultLang, setDefaultLang] = useState<"urdu" | "english">(() => getLang());
  const [defaultCity, setDefaultCity] = useState<string>(() => getCity());
  const [savedLang, setSavedLang] = useState(false);
  const [savedCity, setSavedCity] = useState(false);
  const { toast } = useToast();

  const handleLang = (lang: "urdu" | "english") => {
    setDefaultLang(lang);
    saveLang(lang);
    setSavedLang(true);
    setTimeout(() => setSavedLang(false), 1500);
    toast({ title: "Translation saved", description: `Default translation set to ${lang === "urdu" ? "Urdu" : "English"}.` });
  };

  const handleCity = (city: string) => {
    setDefaultCity(city);
    saveCity(city);
    setSavedCity(true);
    setTimeout(() => setSavedCity(false), 1500);
    toast({ title: "City saved", description: `Prayer times will use ${city}.` });
  };

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
        <h1 className="text-2xl font-serif font-bold text-emerald-300">Settings</h1>
      </div>

      <div className="px-4 space-y-4">

        {/* Appearance */}
        <Section title="Appearance" icon={<Moon className="w-4 h-4" />}>
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Dark Mode</p>
              <p className="text-emerald-700 text-xs mt-0.5">Currently: {theme === "dark" ? "Dark" : "Light"}</p>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`relative w-14 h-7 rounded-full transition-all ${theme === "dark" ? "bg-emerald-600" : "bg-emerald-900/50"}`}
              data-testid="toggle-dark-mode"
            >
              <span
                className="absolute top-1 w-5 h-5 rounded-full shadow-md flex items-center justify-center transition-transform bg-white"
                style={{ transform: theme === "dark" ? "translateX(32px)" : "translateX(4px)" }}
              >
                {theme === "dark" ? <Moon className="w-3 h-3 text-emerald-700" /> : <Sun className="w-3 h-3 text-amber-500" />}
              </span>
            </button>
          </div>
        </Section>

        {/* Translation */}
        <Section
          title="Quran Translation"
          icon={<Globe className="w-4 h-4" />}
          badge={savedLang ? "Saved ✓" : undefined}
        >
          <div className="p-4 space-y-2">
            <p className="text-emerald-600 text-xs mb-3">Choose default translation language</p>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => handleLang(lang.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  defaultLang === lang.id
                    ? "border-emerald-600 bg-emerald-900/30"
                    : "border-emerald-900/30 hover:border-emerald-700"
                }`}
                style={{ background: defaultLang === lang.id ? undefined : "rgba(255,255,255,0.02)" }}
                data-testid={`setting-lang-${lang.id}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{lang.label}</span>
                  <span className="text-emerald-600 text-sm">{lang.sublabel}</span>
                </div>
                {defaultLang === lang.id && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* Prayer Times City */}
        <Section
          title="Prayer Times"
          icon={<MapPin className="w-4 h-4" />}
          badge={savedCity ? "Saved ✓" : undefined}
        >
          <div className="p-4 space-y-2">
            <p className="text-emerald-600 text-xs mb-3">
              Selected: <span className="text-emerald-300 font-medium">{defaultCity}</span>
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
                  {defaultCity === city && <span className="text-emerald-400 mr-1">✓ </span>}
                  {city}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Prayer Reminders</p>
              <p className="text-emerald-700 text-xs mt-0.5">Coming in next update</p>
            </div>
            <span className="text-xs text-emerald-800 border border-emerald-900/50 px-2.5 py-1 rounded-full">Soon</span>
          </div>
        </Section>

        <p className="text-emerald-900 text-xs text-center pt-2 pb-6">Noor v1.0 · All settings saved on device</p>
      </div>
    </div>
  );
}

function Section({ title, icon, badge, children }: {
  title: string; icon: React.ReactNode; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-emerald-900/40 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/30">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600">{icon}</span>
          <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">{title}</span>
        </div>
        {badge && (
          <span className="text-xs text-emerald-400 font-medium animate-in fade-in duration-200">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}
