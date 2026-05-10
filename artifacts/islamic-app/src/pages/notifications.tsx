import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, Bell, BellOff, BellRing, Check, Play,
  BookOpen, Sunrise, Sun, Sunset, Moon, Star, BookMarked, Hash,
  Lock, RefreshCw, ExternalLink, Settings2,
} from "lucide-react";
import { Link } from "wouter";
import {
  getNotifSettings,
  saveNotifSettings,
  requestPermission,
  getPermissionState,
  sendTestNotification,
  isSupported,
  AllNotifSettings,
  NotifSetting,
} from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

// ── Notification definitions ──────────────────────────────────────────────────
interface NotifDef {
  key: keyof AllNotifSettings;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  fridayOnly?: boolean;
}

const DAILY_REMINDERS: NotifDef[] = [
  { key: "quranAyah",       label: "Daily Quran Ayah",   sublabel: "A verse from the Holy Quran each day",        icon: <BookOpen className="w-5 h-5" />, accent: "text-emerald-300", accentBg: "rgba(52,211,153,0.12)"  },
  { key: "islamicQuote",    label: "Islamic Wisdom",     sublabel: "Hadith or Islamic quote of the day",          icon: <Star     className="w-5 h-5" />, accent: "text-amber-300",  accentBg: "rgba(217,119,6,0.12)"   },
  { key: "morningAzkar",    label: "Morning Azkar",      sublabel: "Morning remembrance and dhikr",               icon: <Sunrise  className="w-5 h-5" />, accent: "text-sky-300",    accentBg: "rgba(56,189,248,0.12)"  },
  { key: "eveningAzkar",    label: "Evening Azkar",      sublabel: "Evening remembrance before sunset",           icon: <Sunset   className="w-5 h-5" />, accent: "text-orange-300", accentBg: "rgba(249,115,22,0.12)"  },
  { key: "tasbeehReminder", label: "Tasbeeh Reminder",   sublabel: "SubhanAllah · Alhamdulillah · Allahu Akbar",  icon: <Hash     className="w-5 h-5" />, accent: "text-purple-300", accentBg: "rgba(168,85,247,0.12)"  },
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
  const [settings, setSettings]   = useState<AllNotifSettings>(getNotifSettings);
  const [permission, setPermission] = useState(() => getPermissionState());
  const [requesting, setRequesting] = useState(false);
  const [supported]               = useState(() => isSupported());
  const [testSent, setTestSent]   = useState(false);
  const { toast } = useToast();

  const granted = permission === "granted";
  const denied  = permission === "denied";

  // Auto-request on first open when permission hasn't been decided yet
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (permission === "default" && supported) {
      t = setTimeout(() => { doRequestPermission(true); }, 600);
    }
    return () => { if (t !== undefined) clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll permission state in case user changes it in device settings
  useEffect(() => {
    const id = setInterval(() => {
      const current = getPermissionState();
      if (current !== permission) setPermission(current);
    }, 2000);
    return () => clearInterval(id);
  }, [permission]);

  // ── Permission request ──────────────────────────────────────────────────────
  const doRequestPermission = useCallback(async (silent = false) => {
    if (!supported || denied) return false; // can't retry after hard denial
    setRequesting(true);
    const result = await requestPermission();
    setPermission(result);
    setRequesting(false);
    if (result === "granted" && !silent) {
      toast({ title: "🌙 Notifications enabled!", description: "You'll receive Islamic reminders at your chosen times." });
    } else if (result === "denied" && !silent) {
      toast({ title: "Permission denied", description: "Please enable notifications in your device settings.", variant: "destructive" });
    }
    return result === "granted";
  }, [supported, denied, toast]);

  // ── Settings update ─────────────────────────────────────────────────────────
  const updateSetting = (key: keyof AllNotifSettings, update: Partial<NotifSetting>) => {
    if (!granted) return; // guard — should not be reachable since toggles are disabled
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
        {/* Test button — only shown when granted */}
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
        {!supported && <UnsupportedBanner />}

        {supported && granted && <GrantedBanner />}

        {supported && !granted && !denied && (
          <EnableCard onEnable={() => doRequestPermission()} loading={requesting} />
        )}

        {supported && denied && <BlockedCard />}

        {/* ── Notification sections ── */}
        {/* Show sections always so user can see what's available, but lock them if not granted */}

        <NotifSection
          title="Daily Reminders"
          items={DAILY_REMINDERS}
          settings={settings}
          locked={!granted}
          onToggle={(key, val) => updateSetting(key, { enabled: val })}
          onTime={(key, val) => updateSetting(key, { time: val })}
          onToggleAll={(en) => toggleAll(DAILY_REMINDERS.map(d => d.key), en)}
        />

        <NotifSection
          title="Prayer Reminders"
          subtitle="Set to your local prayer times"
          items={PRAYER_REMINDERS}
          settings={settings}
          locked={!granted}
          onToggle={(key, val) => updateSetting(key, { enabled: val })}
          onTime={(key, val) => updateSetting(key, { time: val })}
          onToggleAll={(en) => toggleAll(PRAYER_REMINDERS.map(d => d.key), en)}
        />

        <NotifSection
          title="Weekly Reminders"
          items={WEEKLY_REMINDERS}
          settings={settings}
          locked={!granted}
          onToggle={(key, val) => updateSetting(key, { enabled: val })}
          onTime={(key, val) => updateSetting(key, { time: val })}
          onToggleAll={(en) => toggleAll(WEEKLY_REMINDERS.map(d => d.key), en)}
        />

        <p className="text-emerald-900 text-xs text-center pt-2 pb-6 leading-relaxed">
          Reminders fire locally — they work best when the app has been recently opened.
        </p>
      </div>
    </div>
  );
}

// ── Permission cards ──────────────────────────────────────────────────────────

function EnableCard({ onEnable, loading }: { onEnable: () => void; loading: boolean }) {
  return (
    <div
      className="rounded-3xl overflow-hidden border border-emerald-700/40 animate-in fade-in duration-400"
      style={{ background: "linear-gradient(135deg, rgba(26,92,56,0.4) 0%, rgba(13,61,36,0.5) 100%)" }}
    >
      {/* Top glow stripe */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #1a5c38, #34d399, #1a5c38)" }} />

      <div className="p-6 text-center space-y-4">
        {/* Bell icon with pulse */}
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
            Receive daily Quranic reminders, prayer alerts, and Islamic wisdom — right on your device.
          </p>
        </div>

        {/* Arabic dua */}
        <p className="text-emerald-800 text-sm font-arabic">
          وَاذْكُرُوا اللَّهَ كَثِيرًا
        </p>
        <p className="text-emerald-900 text-xs -mt-2">"Remember Allah abundantly." [Quran 8:45]</p>

        {/* CTA button */}
        <button
          onClick={onEnable}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)", boxShadow: "0 4px 20px rgba(52,211,153,0.2)" }}
          data-testid="button-enable-notifications"
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
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

function BlockedCard() {
  // Try to detect if running in an Android WebView (APK build)
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  return (
    <div
      className="rounded-3xl overflow-hidden border border-red-900/40 animate-in fade-in duration-400"
      style={{ background: "rgba(239,68,68,0.06)" }}
      data-testid="banner-notifications-blocked"
    >
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #991b1b, #ef4444, #991b1b)" }} />

      <div className="p-5 space-y-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}>
            <BellOff className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-red-300 font-bold text-base">Notifications are blocked</p>
            <p className="text-red-700 text-xs mt-0.5">You previously denied permission.</p>
          </div>
        </div>

        {/* Steps */}
        <div className="rounded-2xl border border-red-900/30 p-4 space-y-3"
          style={{ background: "rgba(239,68,68,0.04)" }}>
          <p className="text-red-400 text-xs font-semibold uppercase tracking-wider">
            {isAndroid ? "How to enable on Android" : "How to enable notifications"}
          </p>

          {isAndroid ? (
            <ol className="space-y-2 text-sm text-red-300/80">
              <Step n={1} text='Open your phone Settings' />
              <Step n={2} text='Go to Apps → Noor Quran (or your browser)' />
              <Step n={3} text='Tap Notifications' />
              <Step n={4} text='Turn on "Allow notifications"' />
              <Step n={5} text='Return here and refresh the page' />
            </ol>
          ) : (
            <ol className="space-y-2 text-sm text-red-300/80">
              <Step n={1} text='Click the 🔒 lock icon in your browser address bar' />
              <Step n={2} text='Find "Notifications" in Site Settings' />
              <Step n={3} text='Change it from "Block" to "Allow"' />
              <Step n={4} text='Refresh this page' />
            </ol>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-red-300 border border-red-800/40 transition-all hover:border-red-600 active:scale-[0.97]"
            style={{ background: "rgba(239,68,68,0.08)" }}
            data-testid="button-retry-permission"
          >
            <RefreshCw className="w-4 h-4" />
            Retry after enabling
          </button>

          {isAndroid && (
            <button
              onClick={() => {
                // Try native bridge if available (Capacitor / custom WebView)
                if (typeof (window as Window & { Android?: { openNotificationSettings?: () => void } }).Android?.openNotificationSettings === "function") {
                  (window as Window & { Android?: { openNotificationSettings?: () => void } }).Android!.openNotificationSettings!();
                } else {
                  // Fallback — can't open settings from browser
                  window.location.reload();
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-amber-300 border border-amber-800/40 transition-all hover:border-amber-600 active:scale-[0.97]"
              style={{ background: "rgba(217,119,6,0.08)" }}
              data-testid="button-open-settings"
            >
              <Settings2 className="w-4 h-4" />
              Settings
            </button>
          )}

          {!isAndroid && (
            <button
              onClick={() => window.open("chrome://settings/content/notifications", "_blank")}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-sky-300 border border-sky-800/40 transition-all hover:border-sky-600 active:scale-[0.97]"
              style={{ background: "rgba(56,189,248,0.08)" }}
              data-testid="button-open-browser-settings"
            >
              <ExternalLink className="w-4 h-4" />
              Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UnsupportedBanner() {
  return (
    <div className="rounded-2xl p-4 border border-red-700/40 flex gap-3 items-start"
      style={{ background: "rgba(239,68,68,0.08)" }}>
      <BellOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-red-300 font-semibold text-sm">Not supported</p>
        <p className="text-red-700 text-xs mt-0.5">Your browser doesn't support notifications. Try Chrome on Android.</p>
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
  title: string; subtitle?: string;
  items: NotifDef[]; settings: AllNotifSettings; locked: boolean;
  onToggle: (key: keyof AllNotifSettings, val: boolean) => void;
  onTime:   (key: keyof AllNotifSettings, val: string)  => void;
  onToggleAll: (enabled: boolean) => void;
}) {
  const allEnabled = items.every(i => settings[i.key].enabled);
  const anyEnabled = items.some(i  => settings[i.key].enabled);

  return (
    <div
      className={`rounded-2xl border border-emerald-900/40 overflow-hidden transition-opacity duration-300 ${locked ? "opacity-50 select-none" : ""}`}
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      {/* Section header */}
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

      {/* Items */}
      <div className="divide-y divide-emerald-900/20">
        {items.map((item) => {
          const s = settings[item.key];
          return (
            <div key={item.key} className="px-4 py-4 space-y-3">
              {/* Row 1: icon + label + toggle */}
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

              {/* Row 2: time picker — only when enabled and unlocked */}
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
      className={`relative w-13 h-7 rounded-full transition-all duration-300 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        disabled
          ? "cursor-not-allowed"
          : "cursor-pointer"
      } ${checked && !disabled ? "bg-emerald-600" : "bg-emerald-950 border border-emerald-800/50"}`}
      style={{ width: "3.25rem", height: "1.75rem" }}
      data-testid={testId}
    >
      <span
        className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${
          checked && !disabled ? "bg-white" : "bg-emerald-700"
        }`}
        style={{ transform: checked && !disabled ? "translateX(1.5rem)" : "translateX(0.2rem)" }}
      />
    </button>
  );
}
