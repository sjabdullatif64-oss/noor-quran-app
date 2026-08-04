import { useState, useCallback } from "react";
import {
  ChevronLeft, Moon, Globe, MapPin, Bell, Check, Sun, ChevronRight, MoreHorizontal,
  LocateFixed, Loader2, WifiOff, RefreshCw, Languages, Calculator,
} from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import {
  getCity, getCountry, setCity as saveCity,
  getGpsCoords, saveGpsCoords, clearGpsCoords,
  getLocationSource, getLang, setLang as saveLang,
  PRESET_CITIES, CITY_COUNTRY_MAP,
  CALC_METHODS, getCalcMethod, setCalcMethod as saveCalcMethod,
  type CalcMethodSetting,
} from "@/lib/settings";
import {
  MAIN_LANGUAGES, TRANSLATION_LABELS, TRANSLATION_ENGLISH_NAMES, TRANSLATION_FLAGS,
  TranslationLanguage, reverseGeocode,
} from "@/lib/api";
import {
  UI_LANGUAGES, UI_LANG_NATIVE, UI_LANG_ENGLISH, UI_LANG_FLAG,
  type UiLanguage,
} from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/hooks/use-toast";
import { MoreLanguagesDialog } from "@/components/translation-language-picker";

// Badge label for Quran translation languages that need a note
const QURAN_LANG_BADGE: Partial<Record<TranslationLanguage, string>> = {
  sindhi: "Fixed ✓",
};

const QURAN_LANG_ACCENT: Partial<Record<TranslationLanguage, string>> = {
  urdu:       "border-emerald-600 bg-emerald-100",
  english:    "border-sky-600 bg-sky-100",
  sindhi:     "border-teal-600 bg-teal-100",
  hindi:      "border-orange-600 bg-orange-100",
  turkish:    "border-red-600 bg-red-100",
  bengali:    "border-violet-600 bg-violet-100",
  indonesian: "border-rose-600 bg-rose-100",
  french:     "border-blue-600 bg-blue-100",
  spanish:    "border-yellow-600 bg-yellow-100",
  malay:      "border-lime-600 bg-lime-100",
};

const UI_LANG_ACCENT: Record<UiLanguage, string> = {
  english:    "border-sky-600 bg-sky-100",
  arabic:     "border-emerald-600 bg-emerald-100",
  urdu:       "border-emerald-600 bg-emerald-100",
  hindi:      "border-orange-600 bg-orange-100",
  bengali:    "border-violet-600 bg-violet-100",
  turkish:    "border-red-600 bg-red-100",
  indonesian: "border-rose-600 bg-rose-100",
  french:     "border-blue-600 bg-blue-100",
  spanish:    "border-yellow-600 bg-yellow-100",
  malay:      "border-lime-600 bg-lime-100",
};

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
  const [moreLanguagesOpen, setMoreLanguagesOpen] = useState(false);

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

  const visibleLangs = MAIN_LANGUAGES;

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

  // ── Prayer calculation method ───────────────────────────────────────────────
  const [calcMethod, setCalcMethodState] = useState<CalcMethodSetting>(() => getCalcMethod());
  const [savedMethod, setSavedMethod]     = useState(false);

  const handleCalcMethod = (value: string) => {
    const method: CalcMethodSetting = value === "auto" ? "auto" : parseInt(value, 10);
    setCalcMethodState(method);
    saveCalcMethod(method);
    setSavedMethod(true);
    setTimeout(() => setSavedMethod(false), 2000);
    // Re-schedule Azan alarms with the new method (safe no-op in browser)
    import("@/lib/azan-scheduler").then((m) => m.scheduleAzan()).catch(() => {});
    const label =
      method === "auto"
        ? "Auto — best method for your location"
        : CALC_METHODS.find((m) => m.id === method)?.name ?? "Selected method";
    toast({ title: "Calculation method saved", description: label });
  };

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
    <div className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-6">
        <Link href="/more" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-primary">{t("settings_title")}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{t("settings_subtitle")}</p>
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
            <p className="text-muted-foreground text-xs mb-3">{t("settings_app_language_sub")}</p>

            {visibleUiLangs.map((lang) => {
              const isActive = uiLang === lang;
              return (
                <button
                  key={lang}
                  onClick={() => handleUiLang(lang)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    isActive
                      ? UI_LANG_ACCENT[lang]
                      : "border-border hover:border-border"
                  }`}
                  style={isActive ? {} : undefined}
                  data-testid={`setting-ui-lang-${lang}`}
                >
                  <span className="text-xl shrink-0">{UI_LANG_FLAG[lang]}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-foreground font-semibold text-sm">{UI_LANG_ENGLISH[lang]}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{UI_LANG_NATIVE[lang]}</p>
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-foreground" />
                    </div>
                  )}
                </button>
              );
            })}

            <button
              onClick={() => setShowAllUiLangs((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-primary transition-colors"
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
              <p className="text-foreground text-sm font-medium">{t("settings_dark_mode")}</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {t("settings_dark_mode_curr")} {theme === "dark" ? t("settings_dark") : t("settings_light")}
              </p>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`relative w-14 h-7 rounded-full transition-all ${
                theme === "dark" ? "bg-primary" : "bg-muted"
              }`}
              data-testid="toggle-dark-mode"
            >
              <span
                className="absolute top-1 w-5 h-5 rounded-full shadow-md flex items-center justify-center transition-transform bg-foreground"
                style={{ transform: theme === "dark" ? "translateX(32px)" : "translateX(4px)" }}
              >
                {theme === "dark"
                  ? <Moon className="w-3 h-3 text-muted-foreground" />
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
            <p className="text-muted-foreground text-xs mb-3">{t("settings_quran_trans_sub")}</p>

            <button
              type="button"
              onClick={() => setMoreLanguagesOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-dashed border-border rounded-xl"
              data-testid="button-more-languages-settings"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              More Languages
            </button>

            {visibleLangs.map((lang) => {
              const isActive = defaultLang === lang;
              return (
                <button
                  key={lang}
                  onClick={() => handleLang(lang)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    isActive
                      ? (QURAN_LANG_ACCENT[lang] ?? "border-primary bg-primary/10")
                      : "border-border hover:border-border"
                  }`}
                  style={isActive ? {} : undefined}
                  data-testid={`setting-lang-${lang}`}
                >
                  <span className="text-xl shrink-0">{TRANSLATION_FLAGS[lang]}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-semibold text-sm">{TRANSLATION_ENGLISH_NAMES[lang]}</p>
                      {QURAN_LANG_BADGE[lang] && (
                        <span
                          className="text-[10px] font-semibold text-primary border border-teal-800/50 px-1.5 py-0.5 rounded-full bg-muted/60"
                        >
                          {QURAN_LANG_BADGE[lang]}
                        </span>
                      )}
                    </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{TRANSLATION_LABELS[lang]}</p>
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-foreground" />
                    </div>
                  )}
                </button>
              );
            })}

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
              className="rounded-xl px-4 py-3 border border-border bg-primary/10"
            >
              {gpsStatus === "detecting" ? (
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                  <p className="text-primary text-sm">{t("settings_gps_detecting")}</p>
                </div>
              ) : gpsStatus === "denied" ? (
                <div className="flex items-center gap-2.5">
                  <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-muted-foreground text-sm">{t("settings_gps_denied")}</p>
                </div>
              ) : gpsStatus === "error" ? (
                <div className="flex items-center gap-2.5">
                  <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-muted-foreground text-sm">{t("settings_gps_unavailable")}</p>
                  </div>
                    <button onClick={detectGPS} className="text-primary hover:text-primary">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              ) : activeCity ? (
                <div className="flex items-center gap-2.5">
                  {gpsStatus === "granted"
                    ? <LocateFixed className="w-4 h-4 text-primary shrink-0" />
                    : <MapPin className="w-4 h-4 text-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-semibold truncate">{activeCity}</p>
                    <p className="text-muted-foreground text-xs">
                      {gpsStatus === "granted" ? t("settings_gps_auto") : t("settings_gps_manual")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-muted-foreground text-sm">{t("settings_no_location")}</p>
                </div>
              )}
            </div>

            {/* Use Current Location button */}
            <button
              onClick={detectGPS}
              disabled={gpsStatus === "detecting"}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-primary/10 transition-all active:scale-[0.98] hover:border-border disabled:opacity-60"
              data-testid="button-use-gps-location"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-primary bg-primary/15"
              >
                {gpsStatus === "detecting"
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <LocateFixed className="w-5 h-5" />}
              </div>
              <div className="text-left flex-1">
                <p className="text-foreground text-sm font-semibold">{t("settings_use_location")}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{t("settings_use_location_sub")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 border-t border-border" />
              <p className="text-muted-foreground text-xs">{t("settings_or_choose")}</p>
              <div className="flex-1 border-t border-border" />
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
                      ? "border-emerald-600 bg-muted text-foreground"
                      : "border-border text-muted-foreground hover:border-border hover:text-primary"
                    }`}
                     style={undefined}
                    data-testid={`setting-city-${city.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {isActive && <span className="text-primary mr-1">✓</span>}
                    {city}
                  </button>
                );
              })}
            </div>

          </div>
        </Section>

        {/* ── Prayer Calculation Method ─────────────────────────────────────── */}
        <Section
          title={t("settings_calc_method")}
          icon={<Calculator className="w-4 h-4" />}
          badge={savedMethod ? t("settings_saved_badge") : undefined}
        >
          <div className="p-4 space-y-3">
            <p className="text-muted-foreground text-xs">
              {t("settings_calc_method_sub")}
            </p>
            <select
              value={String(calcMethod)}
              onChange={(e) => handleCalcMethod(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-border text-foreground text-sm outline-none focus:border-primary transition-colors bg-card"
              data-testid="select-calc-method"
            >
              <option value="auto" className="bg-background text-foreground">
                {t("settings_calc_method_auto")}
              </option>
              {CALC_METHODS.map((m) => (
                <option key={m.id} value={m.id} className="bg-background text-foreground">
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </Section>

        {/* ── Notifications link ────────────────────────────────────────────── */}
        <Section title={t("settings_notif_section")} icon={<Bell className="w-4 h-4" />}>
          <Link href="/notifications">
            <div className="px-4 py-4 flex items-center justify-between hover:opacity-80 transition-opacity">
              <div>
                <p className="text-foreground text-sm font-medium">{t("settings_reminders")}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{t("settings_reminders_sub")}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
          <div className="border-t border-border" />
          <Link href="/azan-settings">
            <div className="px-4 py-4 flex items-center justify-between hover:opacity-80 transition-opacity">
              <div>
                <p className="text-foreground text-sm font-medium">{t("settings_azan_notif")}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{t("settings_azan_notif_sub")}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
        </Section>

        <p className="text-muted-foreground text-xs text-center pt-2 pb-6">
          {t("settings_footer")}
        </p>
      </div>
      <MoreLanguagesDialog
        open={moreLanguagesOpen}
        onOpenChange={setMoreLanguagesOpen}
        selectedLanguage={defaultLang}
        onSelect={handleLang}
      />
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
      className="rounded-2xl border border-border overflow-hidden bg-card"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">{title}</span>
        </div>
        {badge && (
          <span className="text-xs text-primary font-medium animate-in fade-in duration-200">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
