import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, Bell, BellOff, BellRing, Check, Play,
  BookOpen, Sunrise, Sun, Sunset, Moon, Star, BookMarked, Hash,
  Lock, RefreshCw, Settings2, Smartphone, Globe,
} from "lucide-react";
import { Link } from "wouter";
import {
  getNotifSettings,
  saveNotifSettings,
  requestPermission,
  getPermissionState,
  getPermissionStateAsync,
  sendTestNotification,
  isSupported,
  getAppEnv,
  AppEnv,
  AllNotifSettings,
  NotifSetting,
  PermissionState,
} from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

// ── Notification definitions ──────────────────────────────────────────────────
interface NotifDef {
  key:        keyof AllNotifSettings;
  label:      string;
  sublabel:   string;
  icon:       React.ReactNode;
  accent:     string;
  accentBg:   string;
  fridayOnly?: boolean;
}

const DAILY_REMINDERS: NotifDef[] = [
  { key: "quranAyah",       label: "Daily Quran Ayah",   sublabel: "A verse from the Holy Quran each day",       icon: <BookOpen className="w-5 h-5" />, accent: "text-emerald-300", accentBg: "rgba(52,211,153,0.12)"  },
  { key: "islamicQuote",    label: "Islamic Wisdom",     sublabel: "Hadith or Islamic quote of the day",         icon: <Star     className="w-5 h-5" />, accent: "text-amber-300",  accentBg: "rgba(217,119,6,0.12)"   },
  { key: "morningAzkar",    label: "Morning Azkar",      sublabel: "Morning remembrance and dhikr",              icon: <Sunrise  className="w-5 h-5" />, accent: "text-sky-300",    accentBg: "rgba(56,189,248,0.12)"  },
  { key: "eveningAzkar",    label: "Evening Azkar",      sublabel: "Evening remembrance before sunset",          icon: <Sunset   className="w-5 h-5" />, accent: "text-orange-300", accentBg: "rgba(249,115,22,0.12)"  },
  { key: "tasbeehReminder", label: "Tasbeeh Reminder",   sublabel: "SubhanAllah · Alhamdulillah · Allahu Akbar", icon: <Hash     className="w-5 h-5" />, accent: "text-purple-300", accentBg: "rgba(168,85,247,0.12)"  },
];

const PRAYER_REMINDERS: NotifDef[] = [
  { key: "fajrReminder",    label: "Fajr",    sublabel: "Dawn prayer",      icon: <Sunrise className="w-5 h-5" />, accent: "text-blue-300",   accentBg: "rgba(96,165,250,0.12)"  },
  { key: "dhuhrReminder",   label: "Dhuhr",   sublabel: "Midday prayer",    icon: <Sun     className="w-5 h-5" />, accent: "text-yellow-300", accentBg: "rgba(234,179,8,0.12)"   },
  { key: "asrReminder",     label: "Asr",     sublabel: "Afternoon prayer", icon: <Sun     className="w-5 h-5" />, accent: "text-orange-300", accentBg: "rgba(249,115,22,0.12)"  },
  { key: "maghribReminder", label: "Maghrib", sublabel: "Sunset prayer",    icon: <Sunset  className="w-5 h-5" />, accent: "text-rose-300",   accentBg: "rgba(244,63,94,0.12)"   },
  { key: "ishaReminder",    label: "Isha",    sublabel: "Night prayer",     icon: <Moon    className="w-5 h-5" />, accent: "text-indigo-300", accentBg: "rgba(99,102,241,0.12)"  },
];

const WEEKLY_REMINDERS: NotifDef[] = [
  { key: "jummaReminder", label: "Jumu'ah Mubarak", sublabel: "Every Friday — read Al-Kahf & send salawat upon the Prophet ﷺ", icon: <BookMarked className="w-5 h-5" />, accent: "text-teal-300", accentBg: "rgba(45,212,191,0.12)", fridayOnly: true },
];

// ── Main component ────────────────────────────────────────────────────────────
export function Notifications() {
  const [settings,   setSettings]   = useState<AllNotifSettings>(getNotifSettings);
  const [permission, setPermission] = useState<PermissionState>(() => getPermissionState());
  const [requesting, setRequesting] = useState(false);
  const [supported]                 = useState(() => isSupported());
  const [env]                       = useState<AppEnv>(() => getAppEnv());
  const [testSent,   setTestSent]   = useState(false);
  const { toast }                   = useToast();

  const granted = permission === "granted";
  const denied  = permission === "denied";

  // Re-read permission (async — uses Permissions API for accuracy on Android)
  // whenever the window regains focus, covering the case where the user went
  // to Android Settings to enable notifications and then returned.
  useEffect(() => {
    const refresh = async () => {
      const current = await getPermissionStateAsync();
      setPermission(current);
    };

    const onFocus = () => { refresh(); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    // Initial async check on mount (catches stale synchronous initial state)
    refresh();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Background poll — safety net for environments where focus/visibility events
  // may not fire reliably (some Android WebViews).
  useEffect(() => {
    const id = setInterval(async () => {
      const current = await getPermissionStateAsync();
      if (current !== permission) setPermission(current);
    }, 4000);
    return () => clearInterval(id);
  }, [permission]);

  // ── Permission request ──────────────────────────────────────────────────────
  // MUST be called directly from a button onClick — never from setTimeout/useEffect.
  // Android Chrome auto-denies Notification.requestPermission() outside user gestures.
  const doRequestPermission = useCallback(async () => {
    if (!supported) return false;
    if (denied) return false; // hard denial — must go to Settings
    setRequesting(true);
    const result = await requestPermission();
    setPermission(result);
    setRequesting(false);
    if (result === "granted") {
      toast({ title: "🌙 Notifications enabled!", description: "You'll receive Islamic reminders at your chosen times." });
    } else if (result === "denied") {
      toast({ title: "Permission denied", description: "Please enable notifications in your device or browser settings.", variant: "destructive" });
    }
    return result === "granted";
  }, [supported, denied, toast]);

  const checkPermissionNow = useCallback(async () => {
    const current = await getPermissionStateAsync();
    setPermission(current);
  }, []);

  // ── Settings update ─────────────────────────────────────────────────────────
  const updateSetting = (key: keyof AllNotifSettings, update: Partial<NotifSetting>) => {
    if (!granted) return;
    const next = { ...settings, [key]: { ...settings[key], ...update } };
    setSettings(next);
    saveNotifSettings(next);
  };

  const toggleAll = (keys: (keyof AllNotifSettings)[], enabled: boolean) => {
    if (!granted) return;
    const next = { ...settings };
    for (const key of keys) next[key] = { ...settings[key], enabled };
    setSettings(next);
    saveNotifSettings(next);
  };

  // ── Test notification ───────────────────────────────────────────────────────
  const handleTest = async () => {
    if (!granted) { await doRequestPermission(); return; }
    const ok = await sendTestNotification();
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
      toast({ title: "Test sent! 🔔", description: "Check your notification panel." });
    } else {
      toast({ title: "Could not send test", description: "Make sure notifications are allowed.", variant: "destructive" });
    }
  };

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Notifications</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Islamic reminders &amp; prayer alerts</p>
        </div>
        {granted && (
          <button
            onClick={handleTest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-teal-300 border border-teal-800/40 hover:border-teal-600 transition-colors"
            style={{ background: "rgba(45,212,191,0.08)" }}
            data-testid="button-test-notification"
          >
            {testSent ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {testSent ? "Sent!" : "Test"}
          </button>
        )}
      </div>

      <div className="px-4 space-y-4">

        {/* ── Permission area ── */}
        {!supported && <UnsupportedBanner env={env} />}

        {supported && granted && <GrantedBanner />}

        {supported && !granted && !denied && (
          <EnableCard env={env} onEnable={doRequestPermission} loading={requesting} />
        )}

        {supported && denied && (
          <BlockedCard env={env} onCheckAgain={checkPermissionNow} />
        )}

        {/* ── Notification sections — always visible, locked when not granted ── */}
        <NotifSection
          title="Daily Reminders"
          items={DAILY_REMINDERS}
          settings={settings}
          locked={!granted}
          onToggle={(key, val) => updateSetting(key, { enabled: val })}
          onTime={(key, val)   => updateSetting(key, { time: val })}
          onToggleAll={(en)    => toggleAll(DAILY_REMINDERS.map(d => d.key), en)}
        />

        <NotifSection
          title="Prayer Reminders"
          subtitle="Set to your local prayer times"
          items={PRAYER_REMINDERS}
          settings={settings}
          locked={!granted}
          onToggle={(key, val) => updateSetting(key, { enabled: val })}
          onTime={(key, val)   => updateSetting(key, { time: val })}
          onToggleAll={(en)    => toggleAll(PRAYER_REMINDERS.map(d => d.key), en)}
        />

        <NotifSection
          title="Weekly Reminders"
          items={WEEKLY_REMINDERS}
          settings={settings}
          locked={!granted}
          onToggle={(key, val) => updateSetting(key, { enabled: val })}
          onTime={(key, val)   => updateSetting(key, { time: val })}
          onToggleAll={(en)    => toggleAll(WEEKLY_REMINDERS.map(d => d.key), en)}
        />

        <p className="text-emerald-900 text-xs text-center pt-2 pb-6 leading-relaxed">
          Reminders fire locally — they work best when the app has been recently opened.
        </p>
      </div>
    </div>
  );
}

// ── Permission cards ──────────────────────────────────────────────────────────

function EnableCard({ env, onEnable, loading }: { env: AppEnv; onEnable: () => void; loading: boolean }) {
  const isNative = env === "capacitor" || env === "twa";
  return (
    <div
      className="rounded-3xl overflow-hidden border border-emerald-700/40 animate-in fade-in duration-400"
      style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.4) 0%, rgba(13,61,36,0.5) 100%)" }}
    >
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #1a5c38, #34d399, #1a5c38)" }} />

      <div className="p-6 text-center space-y-4">
        <div className="relative mx-auto w-fit">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "rgba(52,211,153,0.12)", boxShadow: "0 0 24px rgba(52,211,153,0.15)" }}>
            <Bell className="w-8 h-8 text-emerald-400" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 animate-ping opacity-60" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400" />
        </div>

        <div>
          <p className="text-emerald-200 font-bold text-lg">Enable Notifications</p>
          <p className="text-emerald-600 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
            {isNative
              ? "Grant notification permission to receive daily Quranic reminders and prayer alerts."
              : "Receive daily Quranic reminders, prayer alerts, and Islamic wisdom — right on your device."}
          </p>
        </div>

        {/* Environment badge */}
        <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-xs">
          {isNative ? <Smartphone className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
          <span>
            {env === "capacitor" ? "Native app — uses system notifications"
            : env === "twa"      ? "Installed app — uses system notifications"
            : env === "android"  ? "Android browser"
            : "Browser notifications"}
          </span>
        </div>

        <p className="text-emerald-800 text-sm font-arabic">وَاذْكُرُوا اللَّهَ كَثِيرًا</p>
        <p className="text-emerald-900 text-xs -mt-2">"Remember Allah abundantly." [Quran 8:45]</p>

        {/* CTA — directly bound to onClick, always a user gesture */}
        <button
          onClick={onEnable}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)", boxShadow: "0 4px 20px rgba(52,211,153,0.2)" }}
          data-testid="button-enable-notifications"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
          {loading ? "Requesting permission…" : "Enable Notifications"}
        </button>
      </div>
    </div>
  );
}

function GrantedBanner() {
  return (
    <div
      className="rounded-2xl p-4 border border-emerald-700/40 flex gap-3 items-center animate-in fade-in duration-400"
      style={{ background: "rgba(52,211,153,0.08)" }}
      data-testid="banner-notifications-granted"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(52,211,153,0.15)" }}>
        <BellRing className="w-5 h-5 text-emerald-400" />
      </div>
      <div>
        <p className="text-emerald-300 font-semibold text-sm">Notifications enabled ✓</p>
        <p className="text-emerald-700 text-xs mt-0.5">Toggle your preferred reminders below.</p>
      </div>
    </div>
  );
}

function BlockedCard({ env, onCheckAgain }: { env: AppEnv; onCheckAgain: () => void }) {
  const [checking, setChecking] = useState(false);

  const handleCheckAgain = () => {
    setChecking(true);
    // Brief delay to let the user see feedback, then re-read permission
    setTimeout(() => {
      onCheckAgain();
      setChecking(false);
    }, 600);
  };

  const openNativeSettings = () => {
    // Capacitor: try native bridge
    const cap = (window as Window & {
      Capacitor?: { Plugins?: { NativeSettings?: { openAndroid?: (o: object) => void } } };
      Android?:   { openNotificationSettings?: () => void };
    });

    if (cap.Android?.openNotificationSettings) {
      cap.Android.openNotificationSettings();
      return;
    }
    if (cap.Capacitor?.Plugins?.NativeSettings?.openAndroid) {
      cap.Capacitor.Plugins.NativeSettings.openAndroid({ option: "application_details" });
      return;
    }
    // Fallback — no native bridge, guide the user
    handleCheckAgain();
  };

  const isAndroidEnv = env === "capacitor" || env === "twa" || env === "android";

  return (
    <div
      className="rounded-3xl overflow-hidden border border-red-900/40 animate-in fade-in duration-400"
      style={{ background: "rgba(239,68,68,0.06)" }}
      data-testid="banner-notifications-blocked"
    >
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #991b1b, #ef4444, #991b1b)" }} />

      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}>
            <BellOff className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-red-300 font-bold text-base">Notifications are blocked</p>
            <p className="text-red-700 text-xs mt-0.5">
              {env === "capacitor" ? "Blocked in system settings."
              : env === "twa"      ? "Blocked — open Android Settings to re-enable."
              : "You previously denied permission."}
            </p>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="rounded-2xl border border-red-900/30 p-4 space-y-3"
          style={{ background: "rgba(239,68,68,0.04)" }}>
          <p className="text-red-400 text-xs font-semibold uppercase tracking-wider">
            How to enable {isAndroidEnv ? "on Android" : "in your browser"}
          </p>

          {env === "capacitor" ? (
            <ol className="space-y-2 text-sm text-red-300/80">
              <Step n={1} text="Open your phone Settings" />
              <Step n={2} text="Go to Apps → Noor Quran" />
              <Step n={3} text='Tap "Notifications"' />
              <Step n={4} text='Turn on "Allow notifications"' />
              <Step n={5} text='Tap "Check Again" below' />
            </ol>
          ) : env === "twa" ? (
            <ol className="space-y-2 text-sm text-red-300/80">
              <Step n={1} text="Open your phone Settings" />
              <Step n={2} text="Go to Apps → Noor Quran" />
              <Step n={3} text='Tap "Notifications" → Turn on' />
              <Step n={4} text="Return here and tap Check Again" />
            </ol>
          ) : env === "android" ? (
            <ol className="space-y-2 text-sm text-red-300/80">
              <Step n={1} text="Open Chrome Settings (⋮ menu)" />
              <Step n={2} text="Site Settings → Notifications" />
              <Step n={3} text="Find this site and change to Allow" />
              <Step n={4} text="Return here and tap Check Again" />
            </ol>
          ) : (
            <ol className="space-y-2 text-sm text-red-300/80">
              <Step n={1} text="Click the 🔒 lock icon in your browser address bar" />
              <Step n={2} text='Find "Notifications" in Site Settings' />
              <Step n={3} text='Change from "Block" to "Allow"' />
              <Step n={4} text="Refresh the page or tap Check Again" />
            </ol>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {/* Primary: Check Again — re-reads permission immediately */}
          <button
            onClick={handleCheckAgain}
            disabled={checking}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-emerald-300 border border-emerald-800/40 transition-all hover:border-emerald-600 active:scale-[0.97] disabled:opacity-60"
            style={{ background: "rgba(52,211,153,0.07)" }}
            data-testid="button-retry-permission"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Check Again"}
          </button>

          {/* Secondary: Open Settings — native bridge on Capacitor/Android, guide on browser */}
          {isAndroidEnv && (
            <button
              onClick={openNativeSettings}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-amber-300 border border-amber-800/40 transition-all hover:border-amber-600 active:scale-[0.97]"
              style={{ background: "rgba(217,119,6,0.08)" }}
              data-testid="button-open-settings"
            >
              <Settings2 className="w-4 h-4" />
              Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UnsupportedBanner({ env }: { env: AppEnv }) {
  return (
    <div className="rounded-2xl p-4 border border-red-700/40 flex gap-3 items-start"
      style={{ background: "rgba(239,68,68,0.08)" }}>
      <BellOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-red-300 font-semibold text-sm">Notifications not supported</p>
        <p className="text-red-700 text-xs mt-0.5">
          {env === "android"
            ? "Try opening the app in Chrome on Android for notification support."
            : "Your browser doesn't support notifications. Try Chrome or install the app."}
        </p>
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-2.5 items-start">
      <span className="w-5 h-5 rounded-full bg-red-900/50 text-red-300 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{n}</span>
      <span>{text}</span>
    </li>
  );
}

// ── Notification section ──────────────────────────────────────────────────────
function NotifSection({ title, subtitle, items, settings, locked, onToggle, onTime, onToggleAll }: {
  title:    string;
  subtitle?: string;
  items:     NotifDef[];
  settings:  AllNotifSettings;
  locked:    boolean;
  onToggle:    (key: keyof AllNotifSettings, val: boolean) => void;
  onTime:      (key: keyof AllNotifSettings, val: string)  => void;
  onToggleAll: (enabled: boolean) => void;
}) {
  const allEnabled = items.every(i => settings[i.key].enabled);
  const anyEnabled = items.some(i  => settings[i.key].enabled);

  return (
    <div
      className={`rounded-2xl border border-emerald-900/40 overflow-hidden transition-opacity duration-300 ${locked ? "opacity-50 select-none" : ""}`}
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/30">
        <div>
          <div className="flex items-center gap-1.5">
            {locked && <Lock className="w-3 h-3 text-emerald-800" />}
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">{title}</p>
          </div>
          {subtitle && <p className="text-emerald-700 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {!locked && (
          <button
            onClick={() => onToggleAll(!allEnabled)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              allEnabled
                ? "border-emerald-600 text-emerald-400 bg-emerald-900/20"
                : "border-emerald-900/40 text-emerald-700 hover:border-emerald-700"
            }`}
          >
            {allEnabled ? "All On" : anyEnabled ? "Some On" : "All Off"}
          </button>
        )}
      </div>

      <div className="divide-y divide-emerald-900/20">
        {items.map((item) => {
          const s = settings[item.key];
          return (
            <div key={item.key} className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.accent}`}
                  style={{ background: item.accentBg }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.label}</p>
                  <p className="text-emerald-700 text-xs truncate">{item.sublabel}</p>
                  {item.fridayOnly && (
                    <span className="text-xs text-teal-600 font-medium">Fridays only</span>
                  )}
                </div>
                <Toggle
                  checked={s.enabled}
                  disabled={locked}
                  onChange={(v) => onToggle(item.key, v)}
                  testId={`toggle-notif-${item.key}`}
                />
              </div>

              {s.enabled && !locked && (
                <div className="flex items-center gap-3 pl-14 animate-in slide-in-from-top-1 duration-200">
                  <p className="text-emerald-600 text-xs flex-1">Remind me at</p>
                  <input
                    type="time"
                    value={s.time}
                    onChange={(e) => onTime(item.key, e.target.value)}
                    className="bg-emerald-900/30 border border-emerald-800/40 text-emerald-200 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-600 transition-colors"
                    data-testid={`time-notif-${item.key}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, disabled, onChange, testId }: {
  checked: boolean; disabled: boolean; onChange: (v: boolean) => void; testId?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      data-testid={testId}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        disabled
          ? "cursor-not-allowed"
          : checked
          ? "bg-emerald-500"
          : "bg-emerald-900/50"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}
