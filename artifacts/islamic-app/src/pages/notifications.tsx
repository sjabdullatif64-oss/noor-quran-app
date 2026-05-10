import { useState, useEffect } from "react";
import {
  ChevronLeft, Bell, BellOff, BellRing, Check, Play,
  BookOpen, Sunrise, Sun, Sunset, Moon, Star, BookMarked, Hash
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
  defaultTime: string;
  fridayOnly?: boolean;
}

const DAILY_REMINDERS: NotifDef[] = [
  {
    key: "quranAyah",
    label: "Daily Quran Ayah",
    sublabel: "A verse from the Holy Quran each day",
    icon: <BookOpen className="w-5 h-5" />,
    accent: "text-emerald-300",
    defaultTime: "08:00",
  },
  {
    key: "islamicQuote",
    label: "Islamic Wisdom",
    sublabel: "Hadith or Islamic quote of the day",
    icon: <Star className="w-5 h-5" />,
    accent: "text-amber-300",
    defaultTime: "09:00",
  },
  {
    key: "morningAzkar",
    label: "Morning Azkar",
    sublabel: "Morning remembrance and dhikr",
    icon: <Sunrise className="w-5 h-5" />,
    accent: "text-sky-300",
    defaultTime: "06:30",
  },
  {
    key: "eveningAzkar",
    label: "Evening Azkar",
    sublabel: "Evening remembrance before sunset",
    icon: <Sunset className="w-5 h-5" />,
    accent: "text-orange-300",
    defaultTime: "17:30",
  },
  {
    key: "tasbeehReminder",
    label: "Tasbeeh Reminder",
    sublabel: "SubhanAllah · Alhamdulillah · Allahu Akbar",
    icon: <Hash className="w-5 h-5" />,
    accent: "text-purple-300",
    defaultTime: "07:00",
  },
];

const PRAYER_REMINDERS: NotifDef[] = [
  { key: "fajrReminder",    label: "Fajr",    sublabel: "Dawn prayer",    icon: <Sunrise className="w-5 h-5" />, accent: "text-blue-300",   defaultTime: "05:00" },
  { key: "dhuhrReminder",   label: "Dhuhr",   sublabel: "Midday prayer",  icon: <Sun className="w-5 h-5" />,     accent: "text-yellow-300", defaultTime: "12:30" },
  { key: "asrReminder",     label: "Asr",     sublabel: "Afternoon prayer", icon: <Sun className="w-5 h-5" />,   accent: "text-orange-300", defaultTime: "15:30" },
  { key: "maghribReminder", label: "Maghrib", sublabel: "Sunset prayer",  icon: <Sunset className="w-5 h-5" />,  accent: "text-rose-300",   defaultTime: "18:30" },
  { key: "ishaReminder",    label: "Isha",    sublabel: "Night prayer",   icon: <Moon className="w-5 h-5" />,    accent: "text-indigo-300", defaultTime: "20:00" },
];

const WEEKLY_REMINDERS: NotifDef[] = [
  {
    key: "jummaReminder",
    label: "Jumu'ah Mubarak",
    sublabel: "Every Friday — read Al-Kahf & send salawat",
    icon: <BookMarked className="w-5 h-5" />,
    accent: "text-teal-300",
    defaultTime: "12:00",
    fridayOnly: true,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function Notifications() {
  const [settings, setSettings] = useState<AllNotifSettings>(getNotifSettings);
  const [permission, setPermission] = useState(() => getPermissionState());
  const [supported] = useState(() => isSupported());
  const [testSent, setTestSent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPermission(getPermissionState());
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    setPermission(result);
    if (result === "granted") {
      toast({ title: "Notifications enabled!", description: "You'll receive Islamic reminders at your chosen times." });
    } else if (result === "denied") {
      toast({ title: "Permission denied", description: "Please enable notifications in your browser settings.", variant: "destructive" });
    }
  };

  const updateSetting = (key: keyof AllNotifSettings, update: Partial<NotifSetting>) => {
    const next = { ...settings, [key]: { ...settings[key], ...update } };
    setSettings(next);
    saveNotifSettings(next);
  };

  const toggleAll = (keys: (keyof AllNotifSettings)[], enabled: boolean) => {
    const updates: Partial<AllNotifSettings> = {};
    for (const key of keys) updates[key] = { ...settings[key], enabled };
    const next = { ...settings, ...updates };
    setSettings(next);
    saveNotifSettings(next);
  };

  const handleTest = async () => {
    if (permission !== "granted") {
      toast({ title: "Permission required", description: "Please enable notifications first.", variant: "destructive" });
      return;
    }
    const ok = await sendTestNotification();
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
      toast({ title: "Test sent!", description: "Check your notification panel." });
    } else {
      toast({ title: "Could not send test", description: "Make sure notifications are allowed.", variant: "destructive" });
    }
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
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Notifications</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Islamic reminders & prayer alerts</p>
        </div>
        <button
          onClick={handleTest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-teal-300 border border-teal-800/40 hover:border-teal-600 transition-colors"
          style={{ background: "rgba(45,212,191,0.08)" }}
          data-testid="button-test-notification"
        >
          {testSent ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {testSent ? "Sent!" : "Test"}
        </button>
      </div>

      <div className="px-4 space-y-4">

        {/* Permission banner */}
        {!supported ? (
          <PermissionBanner
            icon={<BellOff className="w-5 h-5" />}
            color="red"
            title="Not supported"
            description="Your browser does not support notifications. Try Chrome on Android."
          />
        ) : permission === "granted" ? (
          <PermissionBanner
            icon={<BellRing className="w-5 h-5" />}
            color="green"
            title="Notifications enabled"
            description="You will receive Islamic reminders at your scheduled times."
          />
        ) : permission === "denied" ? (
          <PermissionBanner
            icon={<BellOff className="w-5 h-5" />}
            color="red"
            title="Notifications blocked"
            description="Please enable notifications in your browser or device settings, then refresh."
          />
        ) : (
          <div
            className="rounded-2xl p-5 border border-amber-700/30 flex gap-4 items-start"
            style={{ background: "rgba(217,119,6,0.1)" }}
          >
            <Bell className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-300 font-semibold text-sm">Enable notifications</p>
              <p className="text-amber-700 text-xs mt-1">Allow Noor Quran to send you Islamic reminders.</p>
            </div>
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-400 transition-colors shrink-0"
              data-testid="button-request-permission"
            >
              Allow
            </button>
          </div>
        )}

        {/* Daily Reminders */}
        <NotifSection
          title="Daily Reminders"
          items={DAILY_REMINDERS}
          settings={settings}
          permission={permission}
          onToggle={(key, val) => updateSetting(key, { enabled: val })}
          onTime={(key, val) => updateSetting(key, { time: val })}
          onToggleAll={(en) => toggleAll(DAILY_REMINDERS.map(d => d.key), en)}
        />

        {/* Prayer Times */}
        <NotifSection
          title="Prayer Reminders"
          subtitle="Set your local prayer times"
          items={PRAYER_REMINDERS}
          settings={settings}
          permission={permission}
          onToggle={(key, val) => updateSetting(key, { enabled: val })}
          onTime={(key, val) => updateSetting(key, { time: val })}
          onToggleAll={(en) => toggleAll(PRAYER_REMINDERS.map(d => d.key), en)}
        />

        {/* Weekly */}
        <NotifSection
          title="Weekly Reminders"
          items={WEEKLY_REMINDERS}
          settings={settings}
          permission={permission}
          onToggle={(key, val) => updateSetting(key, { enabled: val })}
          onTime={(key, val) => updateSetting(key, { time: val })}
          onToggleAll={(en) => toggleAll(WEEKLY_REMINDERS.map(d => d.key), en)}
        />

        <p className="text-emerald-900 text-xs text-center pt-2 pb-6 leading-relaxed">
          Notifications are scheduled locally on your device.{"\n"}They work best when the app has been recently opened.
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PermissionBanner({ icon, color, title, description }: {
  icon: React.ReactNode; color: "green" | "red"; title: string; description: string;
}) {
  const colors = color === "green"
    ? { bg: "rgba(52,211,153,0.08)", border: "border-emerald-700/40", icon: "text-emerald-400", title: "text-emerald-300", desc: "text-emerald-700" }
    : { bg: "rgba(239,68,68,0.08)", border: "border-red-700/40", icon: "text-red-400", title: "text-red-300", desc: "text-red-700" };

  return (
    <div className={`rounded-2xl p-4 border ${colors.border} flex gap-3 items-start`} style={{ background: colors.bg }}>
      <span className={colors.icon}>{icon}</span>
      <div>
        <p className={`font-semibold text-sm ${colors.title}`}>{title}</p>
        <p className={`text-xs mt-0.5 ${colors.desc}`}>{description}</p>
      </div>
    </div>
  );
}

function NotifSection({ title, subtitle, items, settings, permission, onToggle, onTime, onToggleAll }: {
  title: string;
  subtitle?: string;
  items: NotifDef[];
  settings: AllNotifSettings;
  permission: string;
  onToggle: (key: keyof AllNotifSettings, val: boolean) => void;
  onTime: (key: keyof AllNotifSettings, val: string) => void;
  onToggleAll: (enabled: boolean) => void;
}) {
  const allEnabled = items.every(i => settings[i.key].enabled);
  const anyEnabled = items.some(i => settings[i.key].enabled);
  const disabled = permission !== "granted";

  return (
    <div className="rounded-2xl border border-emerald-900/40 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/30">
        <div>
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">{title}</p>
          {subtitle && <p className="text-emerald-700 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={() => onToggleAll(!allEnabled)}
          disabled={disabled}
          className={`text-xs px-3 py-1 rounded-full border transition-all ${
            disabled ? "opacity-30 cursor-not-allowed border-emerald-900/30 text-emerald-800"
            : allEnabled ? "border-emerald-600 text-emerald-400 bg-emerald-900/20"
            : "border-emerald-900/40 text-emerald-700 hover:border-emerald-700"
          }`}
        >
          {allEnabled ? "All On" : anyEnabled ? "Some On" : "All Off"}
        </button>
      </div>

      {/* Items */}
      <div className="divide-y divide-emerald-900/20">
        {items.map((item) => {
          const s = settings[item.key];
          return (
            <div key={item.key} className="px-4 py-4 space-y-3">
              {/* Row 1: icon + name + toggle */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.accent}`}
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.label}</p>
                  <p className="text-emerald-700 text-xs truncate">{item.sublabel}</p>
                  {item.fridayOnly && (
                    <span className="text-xs text-teal-600">Fridays only</span>
                  )}
                </div>
                <Toggle
                  checked={s.enabled}
                  disabled={disabled}
                  onChange={(v) => onToggle(item.key, v)}
                  testId={`toggle-notif-${item.key}`}
                />
              </div>

              {/* Row 2: time picker (only when enabled) */}
              {s.enabled && (
                <div className="flex items-center gap-3 pl-12 animate-in slide-in-from-top-1 duration-200">
                  <p className="text-emerald-600 text-xs flex-1">Remind me at</p>
                  <input
                    type="time"
                    value={s.time}
                    onChange={(e) => onTime(item.key, e.target.value)}
                    className="bg-emerald-900/30 border border-emerald-800/40 text-emerald-200 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-600"
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

function Toggle({ checked, disabled, onChange, testId }: {
  checked: boolean; disabled: boolean; onChange: (v: boolean) => void; testId?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${
        disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
      } ${checked ? "bg-emerald-600" : "bg-emerald-900/60"}`}
      data-testid={testId}
    >
      <span
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
        style={{ transform: checked ? "translateX(28px)" : "translateX(4px)" }}
      />
    </button>
  );
}
