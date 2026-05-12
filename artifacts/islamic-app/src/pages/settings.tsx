import { useState, useCallback } from "react";
import {
  ChevronLeft, Moon, Globe, MapPin, Bell, Check, Sun, ChevronRight,
  LocateFixed, Loader2, WifiOff, RefreshCw, Languages,
} from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import {
  getCity, getCountry, setCity as saveCity,
  getGpsCoords, saveGpsCoords, clearGpsCoords,
  getLocationSource, getLang, setLang as saveLang,
  PRESET_CITIES, CITY_COUNTRY_MAP,
} from "@/lib/settings";
import {
  ALL_LANGUAGES, TRANSLATION_LABELS, TRANSLATION_ENGLISH_NAMES,
  TranslationLanguage, reverseGeocode,
} from "@/lib/api";
import {
  UI_LANGUAGES, UI_LANG_NATIVE, UI_LANG_ENGLISH, UI_LANG_FLAG,
  type UiLanguage,
} from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/hooks/use-toast";

// Badge label for Quran translation languages that need a note
const QURAN_LANG_BADGE: Partial<Record<TranslationLanguage, string>> = {
  sindhi: "Fixed ✓",
};

const QURAN_LANG_FLAG: Record<TranslationLanguage, string> = {
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

const QURAN_LANG_ACCENT: Record<TranslationLanguage, string> = {
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

const UI_LANG_ACCENT: Record<UiLanguage, string> = {
  english:    "border-sky-600 bg-sky-900/20",
  arabic:     "border-emerald-600 bg-emerald-900/30",
  urdu:       "border-emerald-600 bg-emerald-900/30",
  hindi:      "border-orange-600 bg-orange-900/20",
  bengali:    "border-violet-600 bg-violet-900/20",
  turkish:    "border-red-600 bg-red-900/20",
  indonesian: "border-rose-600 bg-rose-900/20",
  french:     "border-blue-600 bg-blue-900/20",
  spanish:    "border-yellow-600 bg-yellow-900/20",
  malay:      "border-lime-600 bg-lime-900/20",
};

const QURAN_INITIAL_COUNT = 4;
const UI_INITIAL_COUNT = 5;

type GpsStatus = "idle" | "detecting" | "granted" | "denied" | "error";

function readInitialGpsStatus(): GpsStatus {
  const src = getLocationSource();
  if (src === "gps" && getGpsCoords()) return "granted";
  return "idle";
}

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { t, lang: uiLang, setLang: setUiLang } = useI18n();

  // ── App Language ────────────────────────────────────────────────────────────
  const [showAllUiLangs, setShowAllUiLangs] = useState(false);
  const [savedUiLang, setSavedUiLang]       = useState(false);

  const handleUiLang = (lang: UiLanguage) => {
    setUiLang(lang);
    setSavedUiLang(true);
    setTimeout(() => setSavedUiLang(false), 2000);
    toast({
      title: t("settings_lang_saved_title"),
      description: `${t("settings_lang_saved_desc")} ${UI_LANG_ENGLISH[lang]}.`,
    });
  };

  const visibleUiLangs   = showAllUiLangs ? UI_LANGUAGES : UI_LANGUAGES.slice(0, UI_INITIAL_COUNT);
  const hiddenUiCount    = UI_LANGUAGES.length - UI_INITIAL_COUNT;

  // ── Quran Translation Language ──────────────────────────────────────────────
  const [defaultLang, setDefaultLang] = useState<TranslationLanguage>(() => getLang());
  const [savedLang, setSavedLang]     = useState(false);
  const [showAllLangs, setShowAllLangs] = useState(false);

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

  const visibleLangs = showAllLangs ? ALL_LANGUAGES : ALL_LANGUAGES.slice(0, QURAN_INITIAL_COUNT);
  const hiddenCount  = ALL_LANGUAGES.length - QURAN_INITIAL_COUNT;

  // ── Location / GPS ──────────────────────────────────────────────────────────
  const [gpsStatus,   setGpsStatus]   = useState<GpsStatus>(readInitialGpsStatus);
  const [gpsCity,     setGpsCity]     = useState(() =>
    getLocationSource() === "gps" ? getCity() : ""
  );
  const [gpsCountry,  setGpsCountry]  = useState(() =>
    getLocationSource() === "gps" ? getCountry() : ""
  );
  const [manualCity,  setManualCity]  = useState(() =>
    getLocationSource() === "manual" ? getCity() : ""
  );
  const [savedCity,   setSavedCity]   = useState(false);

  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("detecting");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const place = await reverseGeocode(lat, lng);
        const city    = place?.city    ?? "";
        const country = place?.country ?? "";
        saveGpsCoords(lat, lng, city, country);
        setGpsCity(city);
        setGpsCountry(country);
        setManualCity("");
        setGpsStatus("granted");
        toast({
          title: "Location detected",
          description: city
            ? `Using ${city}${country ? `, ${country}` : ""} for prayer times.`
            : "GPS location saved successfully.",
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus("denied");
        } else {
          setGpsStatus("error");
        }
      },
      { timeout: 12000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false }
    );
  }, [toast]);

  const handlePresetCity = (city: string) => {
    const country = CITY_COUNTRY_MAP[city] ?? "";
    setManualCity(city);
    setGpsCity("");
    setGpsCountry("");
    clearGpsCoords();
    saveCity(city, country);
    setGpsStatus("idle");
    setSavedCity(true);
    setTimeout(() => setSavedCity(false), 2000);
    toast({ title: "City saved", description: `Prayer times will use ${city}.` });
  };

  const activeCity =
    gpsStatus === "granted" && gpsCity
      ? `${gpsCity}${gpsCountry ? `, ${gpsCountry}` : ""}`
      : manualCity || null;

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
          <h1 className="text-2xl font-serif font-bold text-emerald-300">{t("settings_title")}</h1>
          <p className="text-emerald-700 text-xs mt-0.5">{t("settings_subtitle")}</p>
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* ── App Language ──────────────────────────────────────────────────── */}
        <Section
          title={t("settings_app_language")}
          icon={<Languages className="w-4 h-4" />}
          badge={savedUiLang ? t("settings_saved_badge") : undefined}
        >
          <div className="p-4 space-y-2">
            <p className="text-emerald-600 text-xs mb-3">{t("settings_app_language_sub")}</p>

            {visibleUiLangs.map((lang) => {
              const isActive = uiLang === lang;
              return (
                <button
                  key={lang}
                  onClick={() => handleUiLang(lang)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    isActive
                      ? UI_LANG_ACCENT[lang]
                      : "border-emerald-900/30 hover:border-emerald-700"
                  }`}
                  style={isActive ? {} : { background: "rgba(255,255,255,0.02)" }}
                  data-testid={`setting-ui-lang-${lang}`}
                >
                  <span className="text-xl shrink-0">{UI_LANG_FLAG[lang]}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white font-semibold text-sm">{UI_LANG_ENGLISH[lang]}</p>
                    <p className="text-emerald-600 text-xs mt-0.5">{UI_LANG_NATIVE[lang]}</p>
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}

            <button
              onClick={() => setShowAllUiLangs((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-emerald-600 hover:text-emerald-400 transition-colors"
              data-testid="button-toggle-all-ui-langs"
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${showAllUiLangs ? "rotate-90" : ""}`}
              />
              {showAllUiLangs
                ? t("settings_show_fewer_langs")
                : `${hiddenUiCount} ${t("settings_show_more_langs")}`}
            </button>
          </div>
        </Section>

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <Section title={t("settings_appearance")} icon={<Moon className="w-4 h-4" />}>
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">{t("settings_dark_mode")}</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                {t("settings_dark_mode_curr")} {theme === "dark" ? t("settings_dark") : t("settings_light")}
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

        {/* ── Quran Translation ─────────────────────────────────────────────── */}
        <Section
          title={t("settings_quran_trans")}
          icon={<Globe className="w-4 h-4" />}
          badge={savedLang ? t("settings_saved_badge") : undefined}
        >
          <div className="p-4 space-y-2">
            <p className="text-emerald-600 text-xs mb-3">{t("settings_quran_trans_sub")}</p>

            {visibleLangs.map((lang) => {
              const isActive = defaultLang === lang;
              return (
                <button
                  key={lang}
                  onClick={() => handleLang(lang)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    isActive
                      ? QURAN_LANG_ACCENT[lang]
                      : "border-emerald-900/30 hover:border-emerald-700"
                  }`}
                  style={isActive ? {} : { background: "rgba(255,255,255,0.02)" }}
                  data-testid={`setting-lang-${lang}`}
                >
                  <span className="text-xl shrink-0">{QURAN_LANG_FLAG[lang]}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">{TRANSLATION_ENGLISH_NAMES[lang]}</p>
                      {QURAN_LANG_BADGE[lang] && (
                        <span
                          className="text-[10px] font-semibold text-teal-400 border border-teal-800/50 px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(45,212,191,0.08)" }}
                        >
                          {QURAN_LANG_BADGE[lang]}
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

            <button
              onClick={() => setShowAllLangs((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-emerald-600 hover:text-emerald-400 transition-colors"
              data-testid="button-toggle-all-langs"
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${showAllLangs ? "rotate-90" : ""}`}
              />
              {showAllLangs
                ? t("settings_show_fewer_langs")
                : `${hiddenCount} ${t("settings_show_more_langs")}`}
            </button>
          </div>
        </Section>

        {/* ── Prayer Times / Location ───────────────────────────────────────── */}
        <Section
          title={t("settings_location")}
          icon={<MapPin className="w-4 h-4" />}
          badge={savedCity ? t("settings_saved_badge") : undefined}
        >
          <div className="p-4 space-y-3">

            {/* Current location display */}
            <div
              className="rounded-xl px-4 py-3 border border-emerald-800/30"
              style={{ background: "rgba(26,92,56,0.18)" }}
            >
              {gpsStatus === "detecting" ? (
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                  <p className="text-emerald-400 text-sm">{t("settings_gps_detecting")}</p>
                </div>
              ) : gpsStatus === "denied" ? (
                <div className="flex items-center gap-2.5">
                  <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-amber-400 text-sm">{t("settings_gps_denied")}</p>
                </div>
              ) : gpsStatus === "error" ? (
                <div className="flex items-center gap-2.5">
                  <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-400 text-sm">{t("settings_gps_unavailable")}</p>
                  </div>
                  <button onClick={detectGPS} className="text-amber-400 hover:text-amber-200">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              ) : activeCity ? (
                <div className="flex items-center gap-2.5">
                  {gpsStatus === "granted"
                    ? <LocateFixed className="w-4 h-4 text-emerald-400 shrink-0" />
                    : <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-200 text-sm font-semibold truncate">{activeCity}</p>
                    <p className="text-emerald-700 text-xs">
                      {gpsStatus === "granted" ? t("settings_gps_auto") : t("settings_gps_manual")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-800 shrink-0" />
                  <p className="text-emerald-700 text-sm">{t("settings_no_location")}</p>
                </div>
              )}
            </div>

            {/* Use Current Location button */}
            <button
              onClick={detectGPS}
              disabled={gpsStatus === "detecting"}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-emerald-700/50 transition-all active:scale-[0.98] hover:border-emerald-500/70 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.4) 0%, rgba(5,46,22,0.4) 100%)" }}
              data-testid="button-use-gps-location"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-emerald-300"
                style={{ background: "rgba(52,211,153,0.15)" }}
              >
                {gpsStatus === "detecting"
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <LocateFixed className="w-5 h-5" />}
              </div>
              <div className="text-left flex-1">
                <p className="text-white text-sm font-semibold">{t("settings_use_location")}</p>
                <p className="text-emerald-600 text-xs mt-0.5">{t("settings_use_location_sub")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-700 shrink-0" />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 border-t border-emerald-900/40" />
              <p className="text-emerald-800 text-xs">{t("settings_or_choose")}</p>
              <div className="flex-1 border-t border-emerald-900/40" />
            </div>

            {/* Preset cities */}
            <div className="grid grid-cols-2 gap-2">
              {PRESET_CITIES.map((city) => {
                const isActive = gpsStatus !== "granted" && manualCity === city;
                return (
                  <button
                    key={city}
                    onClick={() => handlePresetCity(city)}
                    className={`p-3.5 rounded-xl border text-sm font-medium transition-all ${
                      isActive
                        ? "border-emerald-600 bg-emerald-900/30 text-white"
                        : "border-emerald-900/30 text-emerald-600 hover:border-emerald-700 hover:text-emerald-400"
                    }`}
                    style={{ background: isActive ? undefined : "rgba(255,255,255,0.02)" }}
                    data-testid={`setting-city-${city.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {isActive && <span className="text-emerald-400 mr-1">✓</span>}
                    {city}
                  </button>
                );
              })}
            </div>

          </div>
        </Section>

        {/* ── Notifications link ────────────────────────────────────────────── */}
        <Section title={t("settings_notif_section")} icon={<Bell className="w-4 h-4" />}>
          <Link href="/notifications">
            <div className="px-4 py-4 flex items-center justify-between hover:opacity-80 transition-opacity">
              <div>
                <p className="text-white text-sm font-medium">{t("settings_reminders")}</p>
                <p className="text-emerald-700 text-xs mt-0.5">{t("settings_reminders_sub")}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-700" />
            </div>
          </Link>
        </Section>

        <p className="text-emerald-900 text-xs text-center pt-2 pb-6">
          {t("settings_footer")}
        </p>
      </div>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────────
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
