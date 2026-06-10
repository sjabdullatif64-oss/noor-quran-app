import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, Volume2, Bell, BellOff, CheckCircle2, AlertCircle,
  Settings2, RefreshCw, Loader2,
} from "lucide-react";
import { Link } from "wouter";
import {
  getAzanSettings,
  saveAzanSettings,
  AZAN_SOUND_OPTIONS,
  AZAN_PRAYER_DEFS,
  type AzanSettings,
} from "@/lib/azan-settings";
import { scheduleAzan, cancelAzan } from "@/lib/azan-scheduler";
import { azanCheckPermissions, azanOpenAlarmSettings } from "@/lib/azan-plugin";
import { isCapacitorApp } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed",
        checked ? "bg-emerald-600" : "bg-white/20",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md",
          "ring-0 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AzanSettings() {
  const { toast } = useToast();
  const [settings,   setSettings]   = useState<AzanSettings>(getAzanSettings);
  const [perms,      setPerms]      = useState<{ notificationGranted: boolean; canScheduleExact: boolean } | null>(null);
  const [saving,     setSaving]     = useState(false);
  const isNative = isCapacitorApp();

  // Load permission state
  useEffect(() => {
    if (!isNative) return;
    azanCheckPermissions().then(setPerms);
  }, [isNative]);

  const persist = useCallback(async (next: AzanSettings) => {
    setSettings(next);
    saveAzanSettings(next);
    setSaving(true);
    try {
      if (next.enabled) {
        await scheduleAzan();
        toast({ title: "Azan scheduled", description: "Prayer alarms set for today and tomorrow." });
      } else {
        await cancelAzan();
        toast({ title: "Azan disabled", description: "All prayer alarms have been cancelled." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update Azan alarms.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const toggleEnabled = () => persist({ ...settings, enabled: !settings.enabled });

  const togglePrayer = (key: keyof AzanSettings["prayers"]) => {
    const next: AzanSettings = {
      ...settings,
      prayers: { ...settings.prayers, [key]: !settings.prayers[key] },
    };
    persist(next);
  };

  const setSound = (sound: AzanSettings["sound"]) => {
    persist({ ...settings, sound });
  };

  const missingPerms = perms && (!perms.notificationGranted || !perms.canScheduleExact);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#071a0e] to-[#0a2415] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#071a0e]/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link href="/notifications">
            <button className="rounded-full p-2 hover:bg-white/10 transition-colors" aria-label="Back">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">Azan Notifications</h1>
            <p className="text-xs text-white/50">Automatic prayer-time Azan on your device</p>
          </div>
          {saving && <Loader2 className="w-4 h-4 ml-auto animate-spin text-emerald-400" />}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Non-native notice */}
        {!isNative && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200">
              Azan notifications require the Noor Quran Android app.
              Install the APK from the Play Store to enable this feature.
            </p>
          </div>
        )}

        {/* Permission warnings */}
        {isNative && missingPerms && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 space-y-3">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-300">Permissions needed</p>
                {perms && !perms.notificationGranted && (
                  <p className="text-xs text-red-200">Notification permission is not granted.</p>
                )}
                {perms && !perms.canScheduleExact && (
                  <p className="text-xs text-red-200">Exact alarm permission is required for accurate Azan timing.</p>
                )}
              </div>
            </div>
            <button
              onClick={() => azanOpenAlarmSettings()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/20 border border-red-500/40 py-2.5 text-sm font-medium text-red-200 hover:bg-red-500/30 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              Open Alarm Settings
            </button>
          </div>
        )}

        {/* Master toggle */}
        <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/20 p-2.5">
                {settings.enabled
                  ? <Bell    className="w-5 h-5 text-emerald-400" />
                  : <BellOff className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <p className="font-semibold">Azan Notifications</p>
                <p className="text-xs text-white/50">
                  {settings.enabled ? "Enabled — alarms scheduled" : "Disabled"}
                </p>
              </div>
            </div>
            <Toggle
              checked={settings.enabled}
              onChange={toggleEnabled}
              disabled={!isNative}
            />
          </div>

          {settings.enabled && (
            <div className="border-t border-white/10 px-5 py-3 flex items-center gap-2 bg-emerald-900/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300">
                Azan will play at the actual prayer time, even when the app is closed or the screen is locked.
              </p>
            </div>
          )}
        </section>

        {/* Per-prayer toggles */}
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 px-1">
            Prayers
          </h2>
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden divide-y divide-white/10">
            {AZAN_PRAYER_DEFS.map((def) => (
              <div key={def.key} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{def.emoji}</span>
                  <div>
                    <p className="font-medium">{def.label}</p>
                    <p className="text-xs text-white/40">{def.sublabel}</p>
                  </div>
                </div>
                <Toggle
                  checked={settings.prayers[def.key]}
                  onChange={() => togglePrayer(def.key)}
                  disabled={!isNative || !settings.enabled}
                />
              </div>
            ))}
          </div>
          {!settings.enabled && (
            <p className="text-xs text-white/30 mt-2 px-1">Enable Azan above to configure individual prayers.</p>
          )}
        </section>

        {/* Sound selector */}
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 px-1">
            Azan Sound
          </h2>
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden divide-y divide-white/10">
            {AZAN_SOUND_OPTIONS.map((opt) => {
              const active = settings.sound === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSound(opt.value)}
                  disabled={!isNative}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "rounded-xl p-2.5",
                        active ? "bg-emerald-500/30" : "bg-white/10",
                      ].join(" ")}
                    >
                      <Volume2
                        className={["w-4 h-4", active ? "text-emerald-400" : "text-white/50"].join(" ")}
                      />
                    </div>
                    <div>
                      <p className={["font-medium", active ? "text-emerald-300" : ""].join(" ")}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-white/40">{opt.sublabel}</p>
                    </div>
                  </div>
                  {active && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Reschedule button */}
        {isNative && settings.enabled && (
          <section>
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  await scheduleAzan();
                  // Refresh permissions after user may have changed settings
                  setPerms(await azanCheckPermissions());
                  toast({ title: "Azan rescheduled", description: "Prayer alarms have been refreshed." });
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-800/40 border border-emerald-700/40 py-4 text-sm font-medium text-emerald-300 hover:bg-emerald-800/60 transition-colors disabled:opacity-50"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              Refresh Azan Schedule
            </button>
            <p className="text-xs text-white/30 text-center mt-2">
              Tap after changing your city or prayer method to update the prayer times.
            </p>
          </section>
        )}

        {/* Info footer */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-white/40 space-y-1.5">
          <p>Prayer times are calculated from the Aladhan API using your saved city or GPS location.</p>
          <p>Azan alarms are scheduled for today and tomorrow each time you open the app.</p>
          <p>The Azan audio streams over the internet. A short chime plays if offline.</p>
        </section>

        <div className="h-6" />
      </div>
    </div>
  );
}
