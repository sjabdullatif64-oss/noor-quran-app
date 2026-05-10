import { useState } from "react";
import { ChevronLeft, Moon, Sun, Globe, MapPin, Bell } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/components/theme-provider";

const LANGUAGES = [
  { id: "urdu", label: "اردو — Urdu" },
  { id: "sindhi", label: "سنڌي — Sindhi" },
  { id: "english", label: "English" },
];

const CITIES = ["Jeddah", "Makkah", "Madinah", "Karachi", "Lahore", "Dubai", "London", "New York"];

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [defaultLang, setDefaultLang] = useState(() => localStorage.getItem("noor-lang") ?? "urdu");
  const [defaultCity, setDefaultCity] = useState(() => localStorage.getItem("noor-city") ?? "Jeddah");

  const saveLang = (lang: string) => {
    setDefaultLang(lang);
    localStorage.setItem("noor-lang", lang);
  };

  const saveCity = (city: string) => {
    setDefaultCity(city);
    localStorage.setItem("noor-city", city);
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
          <SettingRow label="Dark Mode" description="Toggle app theme">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`relative w-12 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-emerald-600" : "bg-emerald-900/40"}`}
              data-testid="toggle-dark-mode"
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${theme === "dark" ? "translate-x-7" : "translate-x-1"}`}
              />
            </button>
          </SettingRow>
        </Section>

        {/* Translation */}
        <Section title="Quran" icon={<Globe className="w-4 h-4" />}>
          <div className="p-4 space-y-3">
            <p className="text-emerald-500 text-xs uppercase tracking-wider font-medium">Default Translation</p>
            <div className="space-y-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => saveLang(lang.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    defaultLang === lang.id
                      ? "border-emerald-600 bg-emerald-900/30"
                      : "border-emerald-900/30 hover:border-emerald-800"
                  }`}
                  style={{ background: defaultLang === lang.id ? undefined : "rgba(255,255,255,0.02)" }}
                  data-testid={`setting-lang-${lang.id}`}
                >
                  <span className="text-white text-sm">{lang.label}</span>
                  {defaultLang === lang.id && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Prayer Times */}
        <Section title="Prayer Times" icon={<MapPin className="w-4 h-4" />}>
          <div className="p-4 space-y-3">
            <p className="text-emerald-500 text-xs uppercase tracking-wider font-medium">Default City</p>
            <div className="grid grid-cols-2 gap-2">
              {CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => saveCity(city)}
                  className={`p-3 rounded-xl border text-sm transition-all ${
                    defaultCity === city
                      ? "border-emerald-600 bg-emerald-900/30 text-white"
                      : "border-emerald-900/30 text-emerald-600 hover:border-emerald-800"
                  }`}
                  style={{ background: defaultCity === city ? undefined : "rgba(255,255,255,0.02)" }}
                  data-testid={`setting-city-${city.toLowerCase()}`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Notifications placeholder */}
        <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
          <SettingRow label="Prayer Reminders" description="Coming soon">
            <span className="text-xs text-emerald-700 border border-emerald-900/50 px-2 py-0.5 rounded-full">Soon</span>
          </SettingRow>
        </Section>

        <p className="text-emerald-900 text-xs text-center pt-2">Noor v1.0</p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-emerald-900/40 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-900/30">
        <span className="text-emerald-600">{icon}</span>
        <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-emerald-700 text-xs mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}
